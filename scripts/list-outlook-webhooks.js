#!/usr/bin/env node

/**
 * List Outlook Webhook Subscriptions
 *
 * This script lists all Microsoft Graph webhook subscriptions for Outlook.
 * Useful for identifying orphaned webhooks that need cleanup.
 *
 * Usage:
 * node scripts/list-outlook-webhooks.js <access_token>
 *
 * To get an access token:
 * 1. Go to https://developer.microsoft.com/en-us/graph/graph-explorer
 * 2. Sign in with your Microsoft account
 * 3. Copy the access token from the request headers
 */

const fetch = require("node-fetch");

// Microsoft Graph API endpoint
const GRAPH_API_BASE = "https://graph.microsoft.com/v1.0";

async function listOutlookSubscriptions(accessToken) {
  try {
    console.log("🔍 Fetching all Microsoft Graph subscriptions...\n");

    const response = await fetch(`${GRAPH_API_BASE}/subscriptions`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to fetch subscriptions: ${response.status} ${response.statusText} - ${errorText}`);
    }

    const data = await response.json();
    const subscriptions = data.value || [];

    if (subscriptions.length === 0) {
      console.log("ℹ️ No subscriptions found");
      return;
    }

    console.log(`📋 Found ${subscriptions.length} total subscriptions\n`);

    // Filter and display Outlook-related subscriptions
    const outlookSubscriptions = subscriptions.filter((sub) => sub.resource === "/me/messages");

    console.log(`📧 Found ${outlookSubscriptions.length} Outlook webhook subscriptions:\n`);

    outlookSubscriptions.forEach((sub, index) => {
      console.log(`${index + 1}. Subscription ID: ${sub.id}`);
      console.log(`   Client State: ${sub.clientState || "N/A"}`);
      console.log(`   Resource: ${sub.resource}`);
      console.log(`   Change Type: ${sub.changeType}`);
      console.log(`   Expires: ${sub.expirationDateTime}`);
      console.log(`   Notification URL: ${sub.notificationUrl}`);
      console.log(`   Status: ${sub.status || "Active"}`);
      console.log("");
    });

    // Show deletion commands
    if (outlookSubscriptions.length > 0) {
      console.log("🗑️  To delete a subscription, use:");
      console.log('   curl -X DELETE "https://graph.microsoft.com/v1.0/subscriptions/{subscription-id}" \\');
      console.log('        -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \\');
      console.log('        -H "Content-Type: application/json"');
      console.log("");

      console.log("🔗 Or use Microsoft Graph Explorer:");
      console.log("   https://developer.microsoft.com/en-us/graph/graph-explorer");
      console.log("");

      console.log("📝 Note: Look for subscriptions with old clientState values that");
      console.log("   don't match your current email accounts.");
    }

    // Show all subscriptions for reference
    console.log("📋 All Subscriptions (for reference):");
    subscriptions.forEach((sub, index) => {
      console.log(`${index + 1}. ID: ${sub.id}`);
      console.log(`   Client State: ${sub.clientState || "N/A"}`);
      console.log(`   Resource: ${sub.resource}`);
      console.log(`   Change Type: ${sub.changeType}`);
      console.log(`   Expires: ${sub.expirationDateTime}`);
      console.log("");
    });
  } catch (error) {
    console.error("❌ Error fetching subscriptions:", error);
    console.log("");

    if (error.message.includes("InvalidAuthenticationToken")) {
      console.log("💡 The access token appears to be invalid or expired.");
      console.log("   Please get a fresh access token from Microsoft Graph Explorer.");
    }

    console.log("💡 Make sure you provided a valid access token as an argument");
    console.log("   Usage: node scripts/list-outlook-webhooks.js <access_token>");
  }
}

async function main() {
  const accessToken = process.argv[2];

  if (!accessToken) {
    console.log("❌ Access token is required");
    console.log("");
    console.log("Usage: node scripts/list-outlook-webhooks.js <access_token>");
    console.log("");
    console.log("To get an access token:");
    console.log("1. Go to https://developer.microsoft.com/en-us/graph/graph-explorer");
    console.log("2. Sign in with your Microsoft account");
    console.log("3. Copy the access token from the request headers");
    console.log("");
    console.log("Example:");
    console.log("   node scripts/list-outlook-webhooks.js eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiIs...");
    process.exit(1);
  }

  await listOutlookSubscriptions(accessToken);
}

// Run the script
if (require.main === module) {
  main();
}

module.exports = { listOutlookSubscriptions };
