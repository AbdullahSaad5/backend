import cron from "node-cron";
import { EmailAccountModel } from "@/models/email-account.model";
import { OutlookWebhookManager } from "@/services/outlook-webhook-manager.service";
import { logger } from "@/utils/logger.util";
import { EmailAccountConfigService } from "@/services/email-account-config.service";

/**
 * Enhanced Outlook Webhook Management Cron Job
 *
 * This cron job handles:
 * 1. Webhook subscription renewal before expiry
 * 2. Cleanup of orphaned webhook subscriptions
 * 3. Validation of webhook endpoints
 * 4. Recovery from webhook failures
 */

export class EnhancedOutlookWebhookManagementCron {
  private static cronTask: any = null;

  /**
   * Start the enhanced Outlook webhook management cron job
   */
  static start(): void {
    if (this.cronTask) {
      logger.info("🔄 Enhanced Outlook webhook management cron job is already running");
      return;
    }

    // Run every hour to check webhook health
    this.cronTask = cron.schedule("0 * * * *", async () => {
      try {
        logger.info("🔄 [Enhanced Outlook Webhook Cron] Starting webhook management tasks");

        await Promise.all([
          renewExpiringWebhooks(),
          cleanupOrphanedWebhooks(),
          validateWebhookEndpoints(),
          setupMissingWebhooks(),
        ]);

        logger.info("✅ [Enhanced Outlook Webhook Cron] Webhook management tasks completed");
      } catch (error: any) {
        logger.error("❌ [Enhanced Outlook Webhook Cron] Webhook management failed:", error);
      }
    });

    logger.info("📅 Enhanced Outlook webhook management cron job scheduled");
  }

  /**
   * Stop the enhanced Outlook webhook management cron job
   */
  static stop(): void {
    if (this.cronTask) {
      this.cronTask.stop();
      this.cronTask = null;
      logger.info("🛑 Enhanced Outlook webhook management cron job stopped");
    }
  }
}

/**
 * Renew webhooks that are expiring within 12 hours
 */
async function renewExpiringWebhooks(): Promise<void> {
  try {
    logger.info("🔄 [Webhook Renewal] Starting webhook renewal check");

    const expiryThreshold = new Date(Date.now() + 12 * 60 * 60 * 1000); // 12 hours from now

    const expiringAccounts = await EmailAccountModel.find({
      accountType: "outlook",
      isActive: true,
      "oauth.provider": "outlook",
      "syncState.webhookId": { $exists: true },
      "syncState.subscriptionExpiry": { $lt: expiryThreshold },
    });

    logger.info(`📧 [Webhook Renewal] Found ${expiringAccounts.length} accounts with expiring webhooks`);

    for (const account of expiringAccounts) {
      try {
        if (!account.oauth?.accessToken) {
          logger.warn(`⚠️ [Webhook Renewal] No access token for ${account.emailAddress}`);
          continue;
        }

        // Decrypt access token
        const decryptedAccessToken = EmailAccountConfigService.decryptPassword(account.oauth.accessToken);

        // Attempt to renew the webhook
        const renewed = await OutlookWebhookManager.renewWebhookSubscription(account, decryptedAccessToken);

        if (renewed) {
          logger.info(`✅ [Webhook Renewal] Successfully renewed webhook for: ${account.emailAddress}`);
        } else {
          logger.warn(
            `⚠️ [Webhook Renewal] Failed to renew webhook for: ${account.emailAddress}, will attempt recreation`
          );

          // If renewal fails, try to create a new subscription
          await OutlookWebhookManager.createWebhookSubscription(account, decryptedAccessToken);
        }
      } catch (error: any) {
        logger.error(`❌ [Webhook Renewal] Error processing ${account.emailAddress}:`, error);
      }
    }
  } catch (error: any) {
    logger.error("❌ [Webhook Renewal] Renewal process failed:", error);
  }
}

/**
 * Clean up orphaned webhook subscriptions (accounts that no longer exist)
 */
async function cleanupOrphanedWebhooks(): Promise<void> {
  try {
    logger.info("🧹 [Webhook Cleanup] Starting orphaned webhook cleanup");

    // Find accounts with expired webhooks that haven't been cleaned up
    const expiredAccounts = await EmailAccountModel.find({
      accountType: "outlook",
      "oauth.provider": "outlook",
      "syncState.webhookId": { $exists: true },
      "syncState.subscriptionExpiry": { $lt: new Date() },
      isActive: false, // Account is deactivated but webhook still exists
    });

    logger.info(`🧹 [Webhook Cleanup] Found ${expiredAccounts.length} accounts with orphaned webhooks`);

    for (const account of expiredAccounts) {
      try {
        if (!account.oauth?.accessToken) {
          logger.warn(`⚠️ [Webhook Cleanup] No access token for cleanup: ${account.emailAddress}`);
          continue;
        }

        const decryptedAccessToken = EmailAccountConfigService.decryptPassword(account.oauth.accessToken);
        await OutlookWebhookManager.deleteWebhookSubscription(account, decryptedAccessToken);

        logger.info(`✅ [Webhook Cleanup] Cleaned up orphaned webhook for: ${account.emailAddress}`);
      } catch (error: any) {
        logger.error(`❌ [Webhook Cleanup] Error cleaning up ${account.emailAddress}:`, error);
      }
    }
  } catch (error: any) {
    logger.error("❌ [Webhook Cleanup] Cleanup process failed:", error);
  }
}

/**
 * Validate webhook endpoints are accessible
 */
async function validateWebhookEndpoints(): Promise<void> {
  try {
    logger.info("🔍 [Webhook Validation] Starting webhook endpoint validation");

    const activeWebhookAccounts = await EmailAccountModel.find({
      accountType: "outlook",
      isActive: true,
      "oauth.provider": "outlook",
      "syncState.webhookId": { $exists: true },
      "syncState.webhookUrl": { $exists: true },
    });

    logger.info(`🔍 [Webhook Validation] Validating ${activeWebhookAccounts.length} webhook endpoints`);

    for (const account of activeWebhookAccounts) {
      try {
        if (!account.syncState?.webhookUrl) {
          continue;
        }

        const isAccessible = await OutlookWebhookManager.validateWebhookEndpoint(account.syncState.webhookUrl);

        if (!isAccessible) {
          logger.warn(`⚠️ [Webhook Validation] Webhook endpoint not accessible for: ${account.emailAddress}`);

          // Try to recreate the webhook with a new URL
          if (account.oauth?.accessToken) {
            const decryptedAccessToken = EmailAccountConfigService.decryptPassword(account.oauth.accessToken);
            await OutlookWebhookManager.createWebhookSubscription(account, decryptedAccessToken);
          }
        } else {
          // Update last validation timestamp
          await EmailAccountModel.findByIdAndUpdate(account._id, {
            $set: {
              "syncState.lastWebhookValidation": new Date(),
            },
          });
        }
      } catch (error: any) {
        logger.error(`❌ [Webhook Validation] Error validating ${account.emailAddress}:`, error);
      }
    }
  } catch (error: any) {
    logger.error("❌ [Webhook Validation] Validation process failed:", error);
  }
}

/**
 * Setup webhooks for accounts that don't have them
 */
async function setupMissingWebhooks(): Promise<void> {
  try {
    logger.info("🔧 [Webhook Setup] Starting missing webhook setup");

    const accountsWithoutWebhooks = await EmailAccountModel.find({
      accountType: "outlook",
      isActive: true,
      "oauth.provider": "outlook",
      $or: [
        { "syncState.webhookId": { $exists: false } },
        { "syncState.webhookId": null },
        { "syncState.webhookId": "" },
      ],
    });

    logger.info(`🔧 [Webhook Setup] Found ${accountsWithoutWebhooks.length} accounts without webhooks`);

    for (const account of accountsWithoutWebhooks) {
      try {
        if (!account.oauth?.accessToken) {
          logger.warn(`⚠️ [Webhook Setup] No access token for ${account.emailAddress}`);
          continue;
        }

        const decryptedAccessToken = EmailAccountConfigService.decryptPassword(account.oauth.accessToken);
        const webhookInfo = await OutlookWebhookManager.createWebhookSubscription(account, decryptedAccessToken);

        if (webhookInfo) {
          logger.info(`✅ [Webhook Setup] Successfully created webhook for: ${account.emailAddress}`);
        } else {
          logger.warn(`⚠️ [Webhook Setup] Failed to create webhook for: ${account.emailAddress}`);
        }
      } catch (error: any) {
        logger.error(`❌ [Webhook Setup] Error setting up webhook for ${account.emailAddress}:`, error);
      }
    }
  } catch (error: any) {
    logger.error("❌ [Webhook Setup] Setup process failed:", error);
  }
}
