import cron from "node-cron";
import { EmailAccountModel, IEmailAccount } from "@/models/email-account.model";
import { RealTimeEmailSyncService } from "@/services/real-time-email-sync.service";
import { logger } from "@/utils/logger.util";

export class RealTimeEmailSyncCron {
  private static setupCronTask: any = null;
  private static renewalCronTask: any = null;

  /**
   * Start the real-time email sync cron jobs
   */
  static start(): void {
    if (this.setupCronTask || this.renewalCronTask) {
      logger.info("🔄 Real-time email sync cron jobs are already running");
      return;
    }

    // Run every 5 minutes instead of every minute to reduce load
    this.setupCronTask = cron.schedule("*/5 * * * *", async () => {
      try {
        logger.info("🔄 Starting real-time email sync cron job");

        // Only process accounts that need webhook setup
        const accountsNeedingSetup = await EmailAccountModel.find({
          "oauth.provider": "outlook",
          $or: [
            // No webhook exists
            { "syncState.webhookId": { $exists: false } },
            // Webhook is expired or expiring soon
            { "syncState.subscriptionExpiry": { $lt: new Date(Date.now() + 24 * 60 * 60 * 1000) } },
            // Webhook status is not active
            { "syncState.syncStatus": { $ne: "webhook" } },
            // No sync state at all
            { syncState: { $exists: false } },
            // Retry scheduled and ready
            {
              "syncState.retryScheduled": true,
              "syncState.retryTime": { $lte: new Date() }, // Retry time has passed
            },
          ],
          isActive: true,
          "oauth.accessToken": { $exists: true },
          "oauth.refreshToken": { $exists: true },
        });

        logger.info(`📧 Found ${accountsNeedingSetup.length} Outlook accounts needing webhook setup`);

        // Process accounts with delays to prevent rate limiting
        for (let i = 0; i < accountsNeedingSetup.length; i++) {
          const account = accountsNeedingSetup[i];

          try {
            // Check if this is a retry attempt
            const isRetry = account.syncState?.retryScheduled && account.syncState?.retryTime <= new Date();

            if (isRetry) {
              logger.info(
                `🔄 [${i + 1}/${accountsNeedingSetup.length}] Retrying webhook setup for: ${account.emailAddress}`
              );
            } else {
              logger.info(
                `📧 [${i + 1}/${accountsNeedingSetup.length}] Setting up webhook for: ${account.emailAddress}`
              );
            }

            const result = await RealTimeEmailSyncService.setupOutlookRealTimeSync(account);

            if (result.success) {
              logger.info(`✅ Webhook setup successful for: ${account.emailAddress}`);

              // Clear retry state if this was a retry
              if (isRetry) {
                await EmailAccountModel.findByIdAndUpdate(account._id, {
                  $unset: {
                    "syncState.retryScheduled": 1,
                    "syncState.retryTime": 1,
                    "syncState.retryReason": 1,
                    "syncState.lastRetrySchedule": 1,
                  },
                });
                logger.info(`🧹 [Outlook] Cleared retry state for: ${account.emailAddress}`);
              }
            } else {
              logger.error(`❌ Webhook setup failed for: ${account.emailAddress}: ${result.error}`);

              // If it's a retry and still fails, schedule another retry in 2 hours
              if (isRetry) {
                logger.warn(`⚠️ [Outlook] Retry failed for ${account.emailAddress}, scheduling next retry in 2 hours`);
                await RealTimeEmailSyncService.scheduleWebhookRetry(account, 2 * 60 * 60 * 1000); // 2 hours
              }
            }

            // Add delay between accounts to prevent rate limiting
            if (i < accountsNeedingSetup.length - 1) {
              const delay = 5000 + Math.random() * 5000; // 5-10 seconds between accounts
              logger.info(`⏳ Waiting ${Math.round(delay)}ms before next account to prevent rate limiting`);
              await new Promise((resolve) => setTimeout(resolve, delay));
            }
          } catch (accountError: any) {
            logger.error(`❌ Error processing account ${account.emailAddress}:`, accountError);
          }
        }

        logger.info("✅ Real-time email sync cron job completed");
      } catch (error: any) {
        logger.error("❌ Real-time email sync cron job failed:", error);
      }
    });

    // Separate cron for webhook renewal (every 6 hours)
    this.renewalCronTask = cron.schedule("0 */6 * * *", async () => {
      try {
        logger.info("🔄 Starting webhook renewal cron job");

        // Only renew webhooks that are expiring soon
        const accountsNeedingRenewal = await EmailAccountModel.find({
          "oauth.provider": "outlook",
          "syncState.webhookId": { $exists: true },
          "syncState.subscriptionExpiry": {
            $lt: new Date(Date.now() + 12 * 60 * 60 * 1000), // Expiring in next 12 hours
          },
          isActive: true,
        });

        logger.info(`📧 Found ${accountsNeedingRenewal.length} webhooks needing renewal`);

        for (const account of accountsNeedingRenewal) {
          try {
            logger.info(`🔄 Renewing webhook for: ${account.emailAddress}`);
            await RealTimeEmailSyncService.renewOutlookWebhook(account);

            // Add delay between renewals
            await new Promise((resolve) => setTimeout(resolve, 3000));
          } catch (error: any) {
            logger.error(`❌ Error renewing webhook for ${account.emailAddress}:`, error);
          }
        }

        logger.info("✅ Webhook renewal cron job completed");
      } catch (error: any) {
        logger.error("❌ Webhook renewal cron job failed:", error);
      }
    });

    logger.info("📅 Real-time email sync cron jobs scheduled and started");
  }

  /**
   * Stop the real-time email sync cron jobs
   */
  static stop(): void {
    if (this.setupCronTask) {
      this.setupCronTask.stop();
      this.setupCronTask = null;
    }

    if (this.renewalCronTask) {
      this.renewalCronTask.stop();
      this.renewalCronTask = null;
    }

    logger.info("🛑 Real-time email sync cron jobs stopped");
  }
}
