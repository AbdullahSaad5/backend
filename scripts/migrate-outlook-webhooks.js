#!/usr/bin/env node

/**
 * Migration Script: Outlook Webhook Enhancement
 *
 * This script migrates existing Outlook accounts to use the new webhook hash system
 * and cleans up any orphaned webhook subscriptions.
 *
 * Usage: node scripts/migrate-outlook-webhooks.js [--dry-run] [--force]
 */

const mongoose = require("mongoose");
const crypto = require("crypto");
require("dotenv").config();

// Database connection
const MONGODB_URI = process.env.MONGODB_URI || process.env.DATABASE_URL;

if (!MONGODB_URI) {
  console.error("❌ MONGODB_URI or DATABASE_URL environment variable is required");
  process.exit(1);
}

// Command line arguments
const isDryRun = process.argv.includes("--dry-run");
const isForce = process.argv.includes("--force");

console.log(`🚀 Starting Outlook webhook migration...`);
console.log(`📊 Mode: ${isDryRun ? "DRY RUN" : "LIVE MIGRATION"}`);
console.log(`🔧 Force mode: ${isForce ? "ENABLED" : "DISABLED"}`);

async function connectToDatabase() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log("✅ Connected to MongoDB");
  } catch (error) {
    console.error("❌ Failed to connect to MongoDB:", error);
    process.exit(1);
  }
}

// Email Account Schema (simplified for migration)
const EmailAccountSchema = new mongoose.Schema(
  {
    userId: String,
    emailAddress: String,
    accountType: String,
    isActive: Boolean,
    oauth: {
      provider: String,
      accessToken: String,
    },
    syncState: {
      webhookId: String,
      webhookUrl: String,
      subscriptionExpiry: Date,
      emailPrefix: String,
      webhookHash: String,
      lastWebhookValidation: Date,
      isWatching: Boolean,
    },
  },
  { timestamps: true }
);

const EmailAccount = mongoose.model("EmailAccount", EmailAccountSchema);

/**
 * Generate webhook hash for account using email prefix first, account ID as secondary
 */
function generateWebhookHash(accountId, emailAddress) {
  const emailPrefix = getEmailPrefix(emailAddress);
  const data = `${emailPrefix}-${accountId}-${Date.now()}`;
  return crypto.createHash("sha256").update(data).digest("hex").substring(0, 12);
}

/**
 * Get email prefix from email address
 */
function getEmailPrefix(emailAddress) {
  return emailAddress
    .split("@")[0]
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

/**
 * Check if webhook subscription exists in Microsoft Graph
 */
async function checkWebhookExists(webhookId, accessToken) {
  try {
    const response = await fetch(`https://graph.microsoft.com/v1.0/subscriptions/${webhookId}`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    return response.ok;
  } catch (error) {
    console.warn(`⚠️ Error checking webhook ${webhookId}:`, error.message);
    return false;
  }
}

/**
 * Delete webhook subscription from Microsoft Graph
 */
async function deleteWebhook(webhookId, accessToken) {
  try {
    const response = await fetch(`https://graph.microsoft.com/v1.0/subscriptions/${webhookId}`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    return response.ok || response.status === 404;
  } catch (error) {
    console.warn(`⚠️ Error deleting webhook ${webhookId}:`, error.message);
    return false;
  }
}

/**
 * Main migration function
 */
async function migrateOutlookWebhooks() {
  try {
    console.log("\n📊 Finding Outlook accounts to migrate...");

    // Find all Outlook accounts
    const outlookAccounts = await EmailAccount.find({
      accountType: "outlook",
      "oauth.provider": "outlook",
    });

    console.log(`📧 Found ${outlookAccounts.length} Outlook accounts`);

    if (outlookAccounts.length === 0) {
      console.log("✅ No Outlook accounts found to migrate");
      return;
    }

    let migratedCount = 0;
    let cleanedUpCount = 0;
    let errorCount = 0;

    for (const account of outlookAccounts) {
      try {
        console.log(`\n🔄 Processing account: ${account.emailAddress} (${account._id})`);

        const emailPrefix = getEmailPrefix(account.emailAddress);
        const webhookHash = generateWebhookHash(account._id.toString(), account.emailAddress);

        // Check if account already has new fields
        const needsMigration = !account.syncState?.webhookHash || !account.syncState?.emailPrefix;

        if (needsMigration || isForce) {
          console.log(`📝 Migrating account: ${account.emailAddress}`);

          const updateData = {
            "syncState.emailPrefix": emailPrefix,
            "syncState.webhookHash": webhookHash,
          };

          // Check if existing webhook is valid
          if (account.syncState?.webhookId && account.oauth?.accessToken) {
            console.log(`🔍 Checking existing webhook: ${account.syncState.webhookId}`);

            const webhookExists = await checkWebhookExists(account.syncState.webhookId, account.oauth.accessToken);

            if (!webhookExists) {
              console.log(`🧹 Webhook ${account.syncState.webhookId} no longer exists, cleaning up`);

              updateData["syncState.webhookId"] = null;
              updateData["syncState.webhookUrl"] = null;
              updateData["syncState.subscriptionExpiry"] = null;
              updateData["syncState.isWatching"] = false;

              cleanedUpCount++;
            }
          }

          if (!isDryRun) {
            await EmailAccount.findByIdAndUpdate(account._id, { $set: updateData });
            console.log(`✅ Updated account: ${account.emailAddress}`);
          } else {
            console.log(`🔍 [DRY RUN] Would update account: ${account.emailAddress}`);
            console.log(`   - Email prefix: ${emailPrefix}`);
            console.log(`   - Webhook hash: ${webhookHash}`);
          }

          migratedCount++;
        } else {
          console.log(`✅ Account already migrated: ${account.emailAddress}`);
        }
      } catch (error) {
        console.error(`❌ Error processing account ${account.emailAddress}:`, error);
        errorCount++;
      }
    }

    console.log("\n📊 Migration Summary:");
    console.log(`✅ Migrated accounts: ${migratedCount}`);
    console.log(`🧹 Cleaned up orphaned webhooks: ${cleanedUpCount}`);
    console.log(`❌ Errors: ${errorCount}`);

    if (isDryRun) {
      console.log("\n🔍 This was a DRY RUN - no changes were made to the database");
      console.log("💡 Run without --dry-run to apply changes");
    } else {
      console.log("\n✅ Migration completed successfully!");
    }
  } catch (error) {
    console.error("❌ Migration failed:", error);
    throw error;
  }
}

/**
 * Clean up duplicate webhook hashes (if any)
 */
async function cleanupDuplicates() {
  try {
    console.log("\n🔍 Checking for duplicate webhook hashes...");

    const duplicates = await EmailAccount.aggregate([
      {
        $match: {
          "syncState.webhookHash": { $exists: true, $ne: null },
        },
      },
      {
        $group: {
          _id: "$syncState.webhookHash",
          count: { $sum: 1 },
          accounts: { $push: { id: "$_id", email: "$emailAddress" } },
        },
      },
      {
        $match: { count: { $gt: 1 } },
      },
    ]);

    if (duplicates.length > 0) {
      console.log(`⚠️ Found ${duplicates.length} duplicate webhook hashes`);

      for (const duplicate of duplicates) {
        console.log(`🔄 Fixing duplicate hash: ${duplicate._id}`);

        // Keep the first account, regenerate hashes for others
        for (let i = 1; i < duplicate.accounts.length; i++) {
          const account = duplicate.accounts[i];
          const newHash = generateWebhookHash(account.id.toString(), account.email);

          console.log(`📝 Regenerating hash for ${account.email}: ${newHash}`);

          if (!isDryRun) {
            await EmailAccount.findByIdAndUpdate(account.id, {
              $set: { "syncState.webhookHash": newHash },
            });
          }
        }
      }
    } else {
      console.log("✅ No duplicate webhook hashes found");
    }
  } catch (error) {
    console.error("❌ Error cleaning up duplicates:", error);
  }
}

/**
 * Main execution
 */
async function main() {
  try {
    await connectToDatabase();

    await migrateOutlookWebhooks();
    await cleanupDuplicates();

    console.log("\n🎉 Migration script completed successfully!");
  } catch (error) {
    console.error("\n❌ Migration script failed:", error);
    process.exit(1);
  } finally {
    await mongoose.connection.close();
    console.log("👋 Database connection closed");
  }
}

// Run the migration
main().catch(console.error);
