const { RealTimeEmailSyncService } = require("./dist/services/real-time-email-sync.service");
const { EmailAccountModel } = require("./dist/models/email-account.model");
require("dotenv").config({ path: ".env.dev" });

async function setupExistingWebhooks() {
  try {
    console.log("🔄 Setting up webhooks for existing accounts...");

    // Find accounts without webhooks
    const accountsWithoutWebhooks = await EmailAccountModel.find({
      isActive: true,
      accountType: { $in: ["gmail", "outlook"] },
      "oauth.accessToken": { $exists: true, $ne: null },
      $or: [
        { "syncState.gmailTopic": { $exists: false } },
        { "syncState.webhookId": { $exists: false } },
        { "syncState.isWatching": { $ne: true } },
      ],
    });

    console.log(`📧 Found ${accountsWithoutWebhooks.length} accounts without webhooks`);

    if (accountsWithoutWebhooks.length === 0) {
      console.log("✅ All accounts already have webhooks configured");
      return;
    }

    const results = [];

    for (const account of accountsWithoutWebhooks) {
      try {
        console.log(`\n🔄 Setting up webhook for: ${account.emailAddress} (${account.accountType})`);

        let result;
        if (account.accountType === "gmail") {
          result = await RealTimeEmailSyncService.setupGmailRealTimeSync(account);
        } else if (account.accountType === "outlook") {
          result = await RealTimeEmailSyncService.setupOutlookRealTimeSync(account);
        }

        if (result?.success) {
          console.log(`✅ Webhook setup successful for: ${account.emailAddress}`);
        } else {
          console.log(`❌ Webhook setup failed for: ${account.emailAddress}: ${result?.error}`);
        }

        results.push({
          accountId: account._id,
          emailAddress: account.emailAddress,
          accountType: account.accountType,
          success: result?.success || false,
          message: result?.message || "Setup failed",
          error: result?.error,
        });

        // Add delay between accounts to avoid rate limiting
        await new Promise((resolve) => setTimeout(resolve, 2000));
      } catch (error) {
        console.error(`❌ Failed to setup webhook for ${account.emailAddress}:`, error.message);
        results.push({
          accountId: account._id,
          emailAddress: account.emailAddress,
          accountType: account.accountType,
          success: false,
          message: "Setup failed",
          error: error.message,
        });
      }
    }

    // Summary
    const successful = results.filter((r) => r.success).length;
    const failed = results.filter((r) => !r.success).length;

    console.log(`\n📊 Summary:`);
    console.log(`✅ Successful: ${successful}`);
    console.log(`❌ Failed: ${failed}`);
    console.log(`📧 Total: ${results.length}`);

    if (failed > 0) {
      console.log("\n❌ Failed accounts:");
      results
        .filter((r) => !r.success)
        .forEach((r) => {
          console.log(`  - ${r.emailAddress}: ${r.error}`);
        });
    }
  } catch (error) {
    console.error("❌ Setup failed:", error);
  }
}

// Run the setup
setupExistingWebhooks()
  .then(() => {
    console.log("\n✅ Webhook setup completed");
    process.exit(0);
  })
  .catch((error) => {
    console.error("❌ Setup error:", error);
    process.exit(1);
  });
