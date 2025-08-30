const { EmailAccountModel } = require("./dist/models/email-account.model");
require("dotenv").config({ path: ".env.dev" });

async function checkOutlookStatus() {
  try {
    console.log("🔍 Checking Outlook accounts status...");

    // Find all Outlook accounts
    const outlookAccounts = await EmailAccountModel.find({
      accountType: "outlook",
      isActive: true,
    });

    console.log(`\n📧 Found ${outlookAccounts.length} Outlook accounts`);

    for (const account of outlookAccounts) {
      console.log(`\n🔍 Account: ${account.emailAddress}`);
      console.log("Account ID:", account._id);
      console.log("Status:", account.status);
      console.log("Connection Status:", account.connectionStatus);

      if (account.oauth) {
        console.log("OAuth Provider:", account.oauth.provider);
        console.log("Has Access Token:", !!account.oauth.accessToken);
        console.log("Has Refresh Token:", !!account.oauth.refreshToken);
        if (account.oauth.tokenExpiry) {
          const isExpired = new Date() > account.oauth.tokenExpiry;
          console.log(`Token Expiry: ${account.oauth.tokenExpiry} (${isExpired ? "EXPIRED" : "Valid"})`);
        }
      }

      if (account.syncState) {
        console.log("Sync State:");
        console.log("  - Sync Status:", account.syncState.syncStatus || "Not set");
        console.log("  - Is Watching:", account.syncState.isWatching || false);
        console.log("  - Webhook ID:", account.syncState.webhookId || "Not set");
        console.log("  - Webhook URL:", account.syncState.webhookUrl || "Not set");
        console.log("  - Last Watch Renewal:", account.syncState.lastWatchRenewal || "Not set");
        console.log("  - Subscription Expiry:", account.syncState.subscriptionExpiry || "Not set");
      } else {
        console.log("❌ No sync state configured");
      }

      // Check if webhook setup is needed
      const needsWebhook = !account.syncState?.webhookId || !account.syncState?.isWatching;
      if (needsWebhook) {
        console.log("⚠️  Webhook setup needed");
      } else {
        console.log("✅ Webhook properly configured");
      }
    }

    // Summary
    const accountsWithWebhooks = outlookAccounts.filter((acc) => acc.syncState?.webhookId && acc.syncState?.isWatching);
    const accountsWithoutWebhooks = outlookAccounts.filter(
      (acc) => !acc.syncState?.webhookId || !acc.syncState?.isWatching
    );

    console.log(`\n📊 Summary:`);
    console.log(`Total Outlook accounts: ${outlookAccounts.length}`);
    console.log(`With webhooks: ${accountsWithWebhooks.length}`);
    console.log(`Without webhooks: ${accountsWithoutWebhooks.length}`);

    if (accountsWithoutWebhooks.length > 0) {
      console.log(`\n📧 Accounts needing webhook setup:`);
      accountsWithoutWebhooks.forEach((acc) => {
        console.log(`  - ${acc.emailAddress}`);
      });
    }
  } catch (error) {
    console.error("❌ Check failed:", error);
  }
}

// Run the check
checkOutlookStatus()
  .then(() => {
    console.log("\n✅ Status check completed");
    process.exit(0);
  })
  .catch((error) => {
    console.error("❌ Status check error:", error);
    process.exit(1);
  });
