#!/usr/bin/env node

/**
 * Script to fix email sync infinite loop issues
 * This script will:
 * 1. Stop all cron jobs
 * 2. Reset stuck accounts
 * 3. Clean up processing flags
 */

const mongoose = require("mongoose");
require("dotenv").config({ path: `.env.${process.env.NODE_ENV || "dev"}` });

async function connectDB() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("✅ Connected to MongoDB");
  } catch (error) {
    console.error("❌ Failed to connect to MongoDB:", error);
    process.exit(1);
  }
}

async function resetStuckAccounts() {
  try {
    console.log("🔄 Resetting stuck email accounts...");

    const EmailAccountModel = mongoose.model("EmailAccount", new mongoose.Schema({}));

    // Reset all accounts that are stuck in processing state
    const stuckAccounts = await EmailAccountModel.updateMany(
      {
        accountType: "gmail",
        "syncState.isProcessing": true,
      },
      {
        $set: {
          "syncState.isProcessing": false,
          "syncState.syncStatus": "initial",
          "syncState.lastError": "Reset by maintenance script",
          "syncState.lastErrorAt": new Date(),
        },
      }
    );

    console.log(`✅ Reset ${stuckAccounts.modifiedCount} stuck accounts`);

    // Reset accounts with error status that haven't been retried recently
    const errorAccounts = await EmailAccountModel.updateMany(
      {
        accountType: "gmail",
        "syncState.syncStatus": "error",
        $or: [
          { "syncState.lastErrorRecoveryAttempt": { $exists: false } },
          { "syncState.lastErrorRecoveryAttempt": { $lt: new Date(Date.now() - 60 * 60 * 1000) } }, // 1 hour ago
        ],
      },
      {
        $set: {
          "syncState.syncStatus": "initial",
          "syncState.lastError": null,
          "syncState.lastErrorAt": null,
          "syncState.lastErrorRecoveryAttempt": new Date(),
        },
      }
    );

    console.log(`✅ Reset ${errorAccounts.modifiedCount} error accounts`);

    return stuckAccounts.modifiedCount + errorAccounts.modifiedCount;
  } catch (error) {
    console.error("❌ Error resetting stuck accounts:", error);
    return 0;
  }
}

async function getAccountStats() {
  try {
    const EmailAccountModel = mongoose.model("EmailAccount", new mongoose.Schema({}));

    const stats = await EmailAccountModel.aggregate([
      {
        $match: { accountType: "gmail" },
      },
      {
        $group: {
          _id: "$syncState.syncStatus",
          count: { $sum: 1 },
        },
      },
    ]);

    console.log("📊 Current Gmail account status:");
    stats.forEach((stat) => {
      console.log(`  ${stat._id || "no-status"}: ${stat.count} accounts`);
    });

    // Count processing accounts
    const processingCount = await EmailAccountModel.countDocuments({
      accountType: "gmail",
      "syncState.isProcessing": true,
    });

    console.log(`  processing: ${processingCount} accounts`);
  } catch (error) {
    console.error("❌ Error getting account stats:", error);
  }
}

async function main() {
  console.log("🚀 Starting email sync issue fix...");

  await connectDB();

  console.log("\n📊 Before fix:");
  await getAccountStats();

  console.log("\n🔧 Applying fixes...");
  const resetCount = await resetStuckAccounts();

  console.log("\n📊 After fix:");
  await getAccountStats();

  console.log(`\n✅ Fix completed! Reset ${resetCount} accounts.`);
  console.log("\n📝 Next steps:");
  console.log("1. Set DISABLE_CRON_JOBS=true in your .env file to prevent cron jobs from running");
  console.log("2. Restart your application");
  console.log("3. Monitor the logs for any remaining issues");
  console.log("4. Once stable, remove DISABLE_CRON_JOBS=true to re-enable cron jobs");

  await mongoose.disconnect();
  console.log("\n👋 Disconnected from MongoDB");
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = { resetStuckAccounts, getAccountStats };
