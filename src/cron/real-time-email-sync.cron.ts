import * as cron from "node-cron";
import { RealTimeEmailSyncService } from "@/services/real-time-email-sync.service";
import { EmailAccountModel } from "@/models/email-account.model";
import { logger } from "@/utils/logger.util";

export class RealTimeEmailSyncCron {
  private static isRunning = false;
  private static lastRunTime = 0;
  private static readonly MIN_RUN_INTERVAL = 5 * 60 * 1000; // 5 minutes minimum between runs

  /**
   * Start the real-time email sync cron jobs
   */
  static start(): void {
    if (this.isRunning) {
      logger.info("🔄 Real-time email sync cron is already running");
      return;
    }

    try {
      // Setup real-time sync for all active accounts every 10 minutes
      cron.schedule("*/10 * * * *", async () => {
        await this.setupRealTimeSyncForAllAccounts();
      }, {
        scheduled: true,
        timezone: "UTC"
      });

      // Renew subscriptions every 6 hours
      cron.schedule("0 */6 * * *", async () => {
        await this.renewAllSubscriptions();
      }, {
        scheduled: true,
        timezone: "UTC"
      });

      // Cleanup expired subscriptions every hour
      cron.schedule("0 * * * *", async () => {
        await this.cleanupExpiredSubscriptions();
      }, {
        scheduled: true,
        timezone: "UTC"
      });

      this.isRunning = true;
      logger.info("✅ Real-time email sync cron jobs started");

      // Initial setup for existing accounts
      this.setupRealTimeSyncForAllAccounts().catch(error => {
        logger.error("❌ Initial real-time sync setup failed:", error);
      });

    } catch (error: any) {
      logger.error("❌ Failed to start real-time email sync cron:", error);
      this.isRunning = false;
    }
  }

  /**
   * Stop the cron jobs
   */
  static stop(): void {
    cron.getTasks().forEach((task) => {
      if (task.name?.includes("real-time-email-sync")) {
        task.stop();
      }
    });
    this.isRunning = false;
    logger.info("🛑 Real-time email sync cron jobs stopped");
  }

  /**
   * Setup real-time sync for all active accounts
   */
  static async setupRealTimeSyncForAllAccounts(): Promise<void> {
    try {
      const currentTime = Date.now();
      if (currentTime - this.lastRunTime < this.MIN_RUN_INTERVAL) {
        logger.info("⏭️ Skipping real-time sync setup - too soon since last run");
        return;
      }

      this.lastRunTime = currentTime;
      logger.info("🔄 Setting up real-time sync for all active accounts...");

      const activeAccounts = await EmailAccountModel.find({
        isActive: true,
        accountType: { $in: ["gmail", "outlook"] },
        "oauth.accessToken": { $exists: true, $ne: null },
      });

      logger.info(`📧 Found ${activeAccounts.length} active accounts to setup real-time sync`);

      for (const account of activeAccounts) {
        try {
          logger.info(`🔄 Setting up real-time sync for: ${account.emailAddress} (${account.accountType})`);

          if (account.accountType === "gmail") {
            const result = await RealTimeEmailSyncService.setupGmailRealTimeSync(account);
            if (result.success) {
              logger.info(`✅ [Gmail] Real-time sync setup completed for: ${account.emailAddress}`);
            } else {
              logger.error(`❌ [Gmail] Real-time sync setup failed for: ${account.emailAddress}:`, result.error);
            }
          } else if (account.accountType === "outlook") {
            const result = await RealTimeEmailSyncService.setupOutlookRealTimeSync(account);
            if (result.success) {
              logger.info(`✅ [Outlook] Real-time sync setup completed for: ${account.emailAddress}`);
            } else {
              logger.error(`❌ [Outlook] Real-time sync setup failed for: ${account.emailAddress}:`, result.error);
            }
          }

          // Add delay between accounts to avoid rate limiting
          await new Promise(resolve => setTimeout(resolve, 1000));

        } catch (error: any) {
          logger.error(`❌ Failed to setup real-time sync for ${account.emailAddress}:`, error);
        }
      }

      logger.info("✅ Real-time sync setup completed for all accounts");

    } catch (error: any) {
      logger.error("❌ Failed to setup real-time sync for all accounts:", error);
    }
  }

  /**
   * Renew all subscriptions
   */
  static async renewAllSubscriptions(): Promise<void> {
    try {
      logger.info("🔄 Renewing all real-time sync subscriptions...");
      await RealTimeEmailSyncService.renewAllSubscriptions();
    } catch (error: any) {
      logger.error("❌ Failed to renew subscriptions:", error);
    }
  }

  /**
   * Cleanup expired subscriptions
   */
  static async cleanupExpiredSubscriptions(): Promise<void> {
    try {
      logger.info("🧹 Cleaning up expired real-time sync subscriptions...");

      const expiredAccounts = await EmailAccountModel.find({
        "syncState.watchExpiration": { $lt: new Date() },
        "syncState.isWatching": true,
        isActive: true,
      });

      logger.info(`📧 Found ${expiredAccounts.length} accounts with expired subscriptions`);

      for (const account of expiredAccounts) {
        try {
          logger.info(`🔄 Renewing expired subscription for: ${account.emailAddress}`);

          if (account.accountType === "gmail") {
            await RealTimeEmailSyncService.setupGmailRealTimeSync(account);
          } else if (account.accountType === "outlook") {
            await RealTimeEmailSyncService.setupOutlookRealTimeSync(account);
          }

          // Add delay between accounts
          await new Promise(resolve => setTimeout(resolve, 1000));

        } catch (error: any) {
          logger.error(`❌ Failed to renew expired subscription for ${account.emailAddress}:`, error);
        }
      }

      logger.info("✅ Expired subscription cleanup completed");

    } catch (error: any) {
      logger.error("❌ Failed to cleanup expired subscriptions:", error);
    }
  }

  /**
   * Manual trigger for real-time sync setup
   */
  static async manualSetup(accountId?: string): Promise<void> {
    try {
      if (accountId) {
        // Setup for specific account
        const account = await EmailAccountModel.findById(accountId);
        if (!account) {
          throw new Error(`Account not found: ${accountId}`);
        }

        logger.info(`🔄 Manual real-time sync setup for: ${account.emailAddress}`);

        if (account.accountType === "gmail") {
          await RealTimeEmailSyncService.setupGmailRealTimeSync(account);
        } else if (account.accountType === "outlook") {
          await RealTimeEmailSyncService.setupOutlookRealTimeSync(account);
        } else {
          throw new Error(`Unsupported account type: ${account.accountType}`);
        }

        logger.info(`✅ Manual real-time sync setup completed for: ${account.emailAddress}`);

      } else {
        // Setup for all accounts
        await this.setupRealTimeSyncForAllAccounts();
      }
    } catch (error: any) {
      logger.error("❌ Manual real-time sync setup failed:", error);
      throw error;
    }
  }

  /**
   * Get sync status for all accounts
   */
  static async getSyncStatus(): Promise<any> {
    try {
      const accounts = await EmailAccountModel.find({
        accountType: { $in: ["gmail", "outlook"] },
        isActive: true,
      }).select("emailAddress accountType syncState stats");

      const status = accounts.map(account => ({
        emailAddress: account.emailAddress,
        accountType: account.accountType,
        syncStatus: account.syncState?.syncStatus || "unknown",
        isWatching: account.syncState?.isWatching || false,
        lastSyncAt: account.syncState?.lastSyncAt || account.stats?.lastSyncAt,
        watchExpiration: account.syncState?.watchExpiration,
        lastWatchRenewal: account.syncState?.lastWatchRenewal,
      }));

      return {
        totalAccounts: accounts.length,
        accounts: status,
        cronRunning: this.isRunning,
      };

    } catch (error: any) {
      logger.error("❌ Failed to get sync status:", error);
      return {
        error: error.message,
        cronRunning: this.isRunning,
      };
    }
  }

  /**
   * Get cron job status
   */
  static getStatus(): { isRunning: boolean } {
    return {
      isRunning: this.isRunning,
    };
  }
}
