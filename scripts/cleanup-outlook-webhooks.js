#!/usr/bin/env node

/**
 * Cleanup Script for Old Outlook Webhook Subscriptions
 *
 * This script identifies and removes Outlook webhook subscriptions that are no longer
 * associated with existing email accounts in the database.
 *
 * Usage:
 * node scripts/cleanup-outlook-webhooks.js
 */

const mongoose = require("mongoose");
const fetch = require("node-fetch");

// Load environment variables
require("dotenv").config();

// MongoDB connection string
const MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/bavit";

// Microsoft Graph API endpoint
const GRAPH_API_BASE = "https://graph.microsoft.com/v1.0";

// Email accounts collection
let EmailAccountModel;
let EmailOAuthService;

async function connectDB() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log("✅ Connected to MongoDB");

    // Import models and services
    const { EmailAccountModel: Model } = require("../dist/models/email-account.model.js");
    const { EmailOAuthService: Service } = require("../dist/services/emailOAuth.service.js");

    EmailAccountModel = Model;
    EmailOAuthService = Service;
  } catch (error) {
    console.error("❌ Failed to connect to MongoDB:", error);
    process.exit(1);
  }
}

async function getOutlookSubscriptions(accessToken) {
  try {
    console.log("🔍 Fetching subscriptions from Microsoft Graph...");

    const response = await fetch(`${GRAPH_API_BASE}/subscriptions`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ Failed to fetch subscriptions: ${response.status} ${response.statusText}`);
      console.error(`Error details: ${errorText}`);
      return [];
    }

    const data = await response.json();
    return data.value || [];
  } catch (error) {
    console.error("❌ Error fetching subscriptions:", error);
    return [];
  }
}

async function deleteSubscription(subscriptionId, accessToken) {
  try {
    console.log(`🗑️  Deleting subscription: ${subscriptionId}`);

    const response = await fetch(`${GRAPH_API_BASE}/subscriptions/${subscriptionId}`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
    });

    if (response.ok) {
      console.log(`✅ Deleted subscription: ${subscriptionId}`);
      return true;
    } else {
      const errorText = await response.text();
      console.error(`❌ Failed to delete subscription ${subscriptionId}: ${response.status} ${response.statusText}`);
      console.error(`Error details: ${errorText}`);
      return false;
    }
  } catch (error) {
    console.error(`❌ Error deleting subscription ${subscriptionId}:`, error);
    return false;
  }
}

async function cleanupOrphanedWebhooks() {
  try {
    console.log("🔍 Starting cleanup of orphaned Outlook webhook subscriptions...\n");

    // Get all active Outlook accounts
    const outlookAccounts = await EmailAccountModel.find({
      accountType: "outlook",
      isActive: true,
      "oauth.accessToken": { $exists: true },
      "oauth.refreshToken": { $exists: true },
    });

    console.log(`📧 Found ${outlookAccounts.length} active Outlook accounts`);

    if (outlookAccounts.length === 0) {
      console.log("⚠️ No active Outlook accounts found. Cannot proceed with cleanup.");
      return;
    }

    // Use the first account's access token to check subscriptions
    const firstAccount = outlookAccounts[0];
    console.log(`🔑 Using account: ${firstAccount.emailAddress}`);

    // Get valid access token using the centralized method
    const tokenResult = await EmailOAuthService.getStoredOutlookToken(firstAccount);

    if (!tokenResult.success || !tokenResult.accessToken) {
      console.error(`❌ Failed to get valid access token: ${tokenResult.error}`);
      return;
    }

    const accessToken = tokenResult.accessToken;
    console.log(`✅ Successfully retrieved access token (length: ${accessToken.length})`);

    // Get all subscriptions from Microsoft Graph
    console.log("🔍 Fetching all Microsoft Graph subscriptions...");
    const subscriptions = await getOutlookSubscriptions(accessToken);

    if (subscriptions.length === 0) {
      console.log("ℹ️ No subscriptions found");
      return;
    }

    console.log(`📋 Found ${subscriptions.length} total subscriptions`);

    // Extract email prefixes from active accounts
    const activeEmailPrefixes = outlookAccounts.map((account) => {
      const emailPrefix = account.emailAddress.split("@")[0];
      return emailPrefix.toLowerCase();
    });

    console.log("📧 Active email prefixes:", activeEmailPrefixes);

    // Find orphaned subscriptions
    const orphanedSubscriptions = subscriptions.filter((sub) => {
      // Check if this is an Outlook subscription (resource should be /me/messages)
      if (sub.resource !== "/me/messages") {
        return false;
      }

      // Check if clientState matches any active email prefix
      const clientState = sub.clientState?.toLowerCase();
      if (!clientState) {
        return false;
      }

      return !activeEmailPrefixes.includes(clientState);
    });

    console.log(`\n🧹 Found ${orphanedSubscriptions.length} orphaned Outlook webhook subscriptions`);

    if (orphanedSubscriptions.length === 0) {
      console.log("✅ No orphaned subscriptions found");
      return;
    }

    // Display orphaned subscriptions
    console.log("\n📋 Orphaned Subscriptions:");
    orphanedSubscriptions.forEach((sub, index) => {
      console.log(`${index + 1}. ID: ${sub.id}`);
      console.log(`   Client State: ${sub.clientState}`);
      console.log(`   Resource: ${sub.resource}`);
      console.log(`   Expires: ${sub.expirationDateTime}`);
      console.log(`   Notification URL: ${sub.notificationUrl}`);
      console.log("");
    });

    // Ask for confirmation
    console.log("⚠️  WARNING: This will permanently delete these webhook subscriptions!");
    console.log("   Make sure you want to proceed before continuing.\n");

    // For safety, require manual confirmation
    console.log("To proceed with deletion, run this script with the --confirm flag:");
    console.log("node scripts/cleanup-outlook-webhooks.js --confirm\n");

    if (process.argv.includes("--confirm")) {
      console.log("🚨 PROCEEDING WITH DELETION...\n");

      let deletedCount = 0;
      for (const subscription of orphanedSubscriptions) {
        const success = await deleteSubscription(subscription.id, accessToken);
        if (success) {
          deletedCount++;
        }
        // Add delay to avoid rate limiting
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }

      console.log(`\n✅ Cleanup completed: ${deletedCount}/${orphanedSubscriptions.length} subscriptions deleted`);
    } else {
      console.log("⏸️  Cleanup skipped. Run with --confirm to proceed.");
    }
  } catch (error) {
    console.error("❌ Error during cleanup:", error);
  }
}

async function main() {
  try {
    await connectDB();
    await cleanupOrphanedWebhooks();
  } catch (error) {
    console.error("❌ Script failed:", error);
  } finally {
    await mongoose.disconnect();
    console.log("👋 Disconnected from MongoDB");
    process.exit(0);
  }
}

// Run the script
if (require.main === module) {
  main();
}

module.exports = { cleanupOrphanedWebhooks };
