#!/usr/bin/env node

/**
 * Cleanup script for orphaned Gmail Pub/Sub subscriptions
 * Run this on Heroku where Google Cloud credentials are available
 *
 * Usage: node scripts/cleanup-orphaned-gmail-subscriptions.js
 */

const mongoose = require("mongoose");
const { PubSub } = require("@google-cloud/pubsub");
require("dotenv").config({ path: ".env.dev" });

async function cleanupOrphanedSubscriptions() {
  try {
    console.log("🧹 Starting cleanup of orphaned Gmail subscriptions...\n");

    // Connect to MongoDB
    await mongoose.connect(process.env.MONGO_URI);
    console.log("✅ Connected to MongoDB");

    // Get all active Gmail accounts
    const EmailAccount = mongoose.model("EmailAccount", new mongoose.Schema({}, { strict: false }));
    const activeGmailAccounts = await EmailAccount.find({
      accountType: "gmail",
      isActive: true,
    }).select("emailAddress syncState.gmailSubscription");

    console.log(`📧 Found ${activeGmailAccounts.length} active Gmail accounts`);

    const activeSubscriptions = new Set();
    activeGmailAccounts.forEach((account) => {
      if (account.syncState?.gmailSubscription) {
        const subscriptionName = account.syncState.gmailSubscription.split("/").pop();
        activeSubscriptions.add(subscriptionName);
        console.log(`  ✅ ${account.emailAddress} → ${subscriptionName}`);
      }
    });

    console.log(`\n🔍 Checking Google Cloud Pub/Sub subscriptions...`);

    // Initialize Pub/Sub client
    const pubsub = new PubSub({
      projectId: process.env.GOOGLE_CLOUD_PROJECT_ID || "build-my-rig-468317",
    });

    // Get all subscriptions
    const [subscriptions] = await pubsub.getSubscriptions();
    console.log(`📊 Found ${subscriptions.length} total Pub/Sub subscriptions`);

    let orphanedCount = 0;
    let cleanedCount = 0;

    for (const subscription of subscriptions) {
      const subscriptionName = subscription.name.split("/").pop();

      // Check if this is a Gmail-related subscription
      if (subscriptionName && subscriptionName.startsWith("gmail-sync-")) {
        if (!activeSubscriptions.has(subscriptionName)) {
          console.log(`\n🗑️  Found orphaned subscription: ${subscriptionName}`);
          orphanedCount++;

          try {
            // Get subscription metadata to see push endpoint
            const [metadata] = await subscription.getMetadata();
            console.log(`   Push Endpoint: ${metadata.pushConfig?.pushEndpoint || "None"}`);
            console.log(`   Outstanding Messages: ${metadata.numOutstandingMessages || 0}`);

            // Delete the orphaned subscription
            await subscription.delete();
            console.log(`   ✅ Deleted orphaned subscription: ${subscriptionName}`);
            cleanedCount++;
          } catch (deleteError) {
            console.log(`   ❌ Failed to delete ${subscriptionName}: ${deleteError.message}`);
          }
        } else {
          console.log(`✅ Active subscription: ${subscriptionName}`);
        }
      }
    }

    console.log(`\n📊 Cleanup Summary:`);
    console.log(`   Total subscriptions checked: ${subscriptions.length}`);
    console.log(`   Orphaned subscriptions found: ${orphanedCount}`);
    console.log(`   Successfully cleaned up: ${cleanedCount}`);

    if (orphanedCount === 0) {
      console.log(`\n🎉 No orphaned subscriptions found! All clean.`);
    } else if (cleanedCount === orphanedCount) {
      console.log(`\n🎉 All orphaned subscriptions cleaned up successfully!`);
    } else {
      console.log(`\n⚠️  Some subscriptions could not be cleaned up. Check the errors above.`);
    }

    await mongoose.disconnect();
    console.log("\n✅ Cleanup completed");
  } catch (error) {
    console.error("❌ Cleanup failed:", error.message);
    console.error("Stack:", error.stack);
    process.exit(1);
  }
}

// Run the cleanup
cleanupOrphanedSubscriptions();
