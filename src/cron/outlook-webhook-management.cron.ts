import cron from "node-cron";
import { EmailAccountModel, IEmailAccount } from "@/models/email-account.model";
import { RealTimeEmailSyncService } from "@/services/real-time-email-sync.service";
import { logger } from "@/utils/logger.util";

export const outlookWebhookManagementCron = () => {
  // Run every hour to manage webhook subscriptions
  cron.schedule("0 * * * *", async () => {
    try {
      logger.info("🔄 [Outlook] Starting webhook management cron job");

      // Find all active Outlook accounts with webhooks
      const outlookAccounts = await EmailAccountModel.find({
        "oauth.provider": "outlook",
        "syncState.isWatching": true,
        "syncState.webhookId": { $exists: true },
        isActive: true,
      });

      logger.info(`📧 [Outlook] Found ${outlookAccounts.length} active Outlook accounts with webhooks`);

      for (const account of outlookAccounts) {
        try {
          // Check if webhook subscription is expiring soon
          if (account.syncState?.subscriptionExpiry) {
            const now = new Date();
            const expiry = new Date(account.syncState.subscriptionExpiry);
            const bufferTime = 24 * 60 * 60 * 1000; // 24 hours buffer

            if (now.getTime() >= expiry.getTime() - bufferTime) {
              logger.info(`🔄 [Outlook] Renewing expiring webhook for: ${account.emailAddress}`, {
                expiresAt: expiry.toISOString(),
                now: now.toISOString(),
              });

              // Renew the webhook
              const renewed = await RealTimeEmailSyncService.renewOutlookWebhook(account);
              if (renewed) {
                logger.info(`✅ [Outlook] Webhook renewed successfully for: ${account.emailAddress}`);
              } else {
                logger.warn(`⚠️ [Outlook] Failed to renew webhook for: ${account.emailAddress}`);
              }
            }
          }
        } catch (accountError: any) {
          logger.error(`❌ [Outlook] Error processing account ${account.emailAddress}:`, accountError);
        }
      }

      // Clean up orphaned webhooks (accounts that were deleted but webhooks still exist)
      await cleanupOrphanedWebhooks();

      logger.info("✅ [Outlook] Webhook management cron job completed");
    } catch (error: any) {
      logger.error("❌ [Outlook] Webhook management cron job failed:", error);
    }
  });

  // Run daily at 2 AM to clean up expired webhooks
  cron.schedule("0 2 * * *", async () => {
    try {
      logger.info("🧹 [Outlook] Starting daily webhook cleanup");

      // Find accounts with expired webhooks
      const expiredWebhookAccounts = await EmailAccountModel.find({
        "oauth.provider": "outlook",
        "syncState.subscriptionExpiry": { $lt: new Date() },
        "syncState.webhookId": { $exists: true },
      });

      logger.info(`📧 [Outlook] Found ${expiredWebhookAccounts.length} accounts with expired webhooks`);

      for (const account of expiredWebhookAccounts) {
        try {
          logger.info(`🧹 [Outlook] Cleaning up expired webhook for: ${account.emailAddress}`);
          await RealTimeEmailSyncService.cleanupOutlookWebhook(account);
        } catch (cleanupError: any) {
          logger.error(`❌ [Outlook] Error cleaning up expired webhook for ${account.emailAddress}:`, cleanupError);
        }
      }

      logger.info("✅ [Outlook] Daily webhook cleanup completed");
    } catch (error: any) {
      logger.error("❌ [Outlook] Daily webhook cleanup failed:", error);
    }
  });

  logger.info("📅 [Outlook] Webhook management cron jobs scheduled");
};

/**
 * Clean up orphaned webhooks that reference non-existent accounts
 */
async function cleanupOrphanedWebhooks(): Promise<void> {
  try {
    logger.info("🧹 [Outlook] Checking for orphaned webhooks");

    // This would require Microsoft Graph API access to list all subscriptions
    // and compare with our database records
    // For now, we'll focus on cleaning up based on database state

    // Find accounts that are inactive but still have webhook IDs
    const orphanedWebhookAccounts = await EmailAccountModel.find({
      "oauth.provider": "outlook",
      "syncState.webhookId": { $exists: true },
      $or: [{ isActive: false }, { status: "inactive" }, { "oauth.accessToken": { $exists: false } }],
    });

    if (orphanedWebhookAccounts.length > 0) {
      logger.info(`🧹 [Outlook] Found ${orphanedWebhookAccounts.length} accounts with orphaned webhooks`);

      for (const account of orphanedWebhookAccounts) {
        try {
          logger.info(`🧹 [Outlook] Cleaning up orphaned webhook for: ${account.emailAddress}`);
          await RealTimeEmailSyncService.cleanupOutlookWebhook(account);
        } catch (cleanupError: any) {
          logger.error(`❌ [Outlook] Error cleaning up orphaned webhook for ${account.emailAddress}:`, cleanupError);
        }
      }
    }

    logger.info("✅ [Outlook] Orphaned webhook cleanup completed");
  } catch (error: any) {
    logger.error("❌ [Outlook] Orphaned webhook cleanup failed:", error);
  }
}
