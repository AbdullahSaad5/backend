import * as cron from "node-cron";
import { EmailFetchingService } from "@/services/email-fetching.service";
import { EmailAccountModel } from "@/models/email-account.model";
import { logger } from "@/utils/logger.util";

export class GmailSyncCron {
  private static isRunning = false;

  /**
   * Start the Gmail sync cron jobs
   */
  static start(): void {
    // Run Gmail watch renewal every 6 hours (watch expires every 7 days)
    cron.schedule("0 */6 * * *", async () => {
      if (GmailSyncCron.isRunning) {
        logger.warn("Gmail sync already running, skipping...");
        return;
      }

      GmailSyncCron.isRunning = true;
      const startTime = Date.now();

      try {
        logger.info("🔄 Starting Gmail watch subscription renewal");

        await EmailFetchingService.renewGmailWatchSubscriptions();
        
        const duration = Date.now() - startTime;
        logger.info("✅ Gmail watch renewal completed", { durationMs: duration });

      } catch (error: any) {
        const duration = Date.now() - startTime;
        logger.error("💥 Gmail watch renewal failed", {
          error: error.message,
          stack: error.stack,
          durationMs: duration,
        });
      } finally {
        GmailSyncCron.isRunning = false;
      }
    });

    // Run Gmail sync for accounts that need it every 15 minutes
    cron.schedule("*/15 * * * *", async () => {
      if (GmailSyncCron.isRunning) {
        logger.warn("Gmail sync already running, skipping...");
        return;
      }

      GmailSyncCron.isRunning = true;
      const startTime = Date.now();

      try {
        logger.info("🔄 Starting Gmail sync for active accounts");

        const accountsNeedingSync = await EmailAccountModel.find({
          accountType: 'gmail',
          isActive: true,
          oauth: { $exists: true },
          $or: [
            { 'syncState.syncStatus': { $in: ['initial', 'historical'] } },
            { 'syncState.syncStatus': 'complete', 'syncState.lastSyncAt': { $lt: new Date(Date.now() - 15 * 60 * 1000) } } // Sync every 15 minutes for complete accounts
          ]
        }).limit(10); // Process max 10 accounts per run

        logger.info(`Found ${accountsNeedingSync.length} Gmail accounts needing sync`);

        for (const account of accountsNeedingSync) {
          try {
            logger.info(`Processing Gmail sync for ${account.emailAddress}`);
            
            const result = await EmailFetchingService.syncGmailWithHistoryAPI(account, {
              useHistoryAPI: true
            });

            if (result.success) {
              logger.info(`✅ Gmail sync completed for ${account.emailAddress}`, {
                historyId: result.historyId,
                totalCount: result.totalCount,
                newCount: result.newCount,
                syncStatus: account.syncState?.syncStatus
              });
            } else {
              logger.error(`❌ Gmail sync failed for ${account.emailAddress}`, {
                error: result.error
              });
            }

            // Add delay between accounts to avoid rate limiting
            await new Promise(resolve => setTimeout(resolve, 3000));

          } catch (error: any) {
            logger.error(`💥 Error syncing Gmail account ${account.emailAddress}:`, error);
          }
        }

        const duration = Date.now() - startTime;
        logger.info("✅ Gmail sync completed", { 
          accountsProcessed: accountsNeedingSync.length,
          durationMs: duration 
        });

      } catch (error: any) {
        const duration = Date.now() - startTime;
        logger.error("💥 Gmail sync failed", {
          error: error.message,
          stack: error.stack,
          durationMs: duration,
        });
      } finally {
        GmailSyncCron.isRunning = false;
      }
    });

    // Run error recovery every 2 hours
    cron.schedule("0 */2 * * *", async () => {
      try {
        logger.info("🔄 Starting Gmail error recovery");

        const errorAccounts = await EmailAccountModel.find({
          accountType: 'gmail',
          isActive: true,
          'syncState.syncStatus': 'error',
          'syncState.lastErrorAt': { 
            $lt: new Date(Date.now() - 30 * 60 * 1000) // Error older than 30 minutes
          }
        }).limit(5); // Process max 5 error accounts per run

        logger.info(`Found ${errorAccounts.length} Gmail accounts with errors to recover`);

        for (const account of errorAccounts) {
          try {
            logger.info(`Attempting error recovery for ${account.emailAddress}`);
            
            // Reset sync status to retry
            await EmailAccountModel.findByIdAndUpdate(account._id, {
              $set: {
                'syncState.syncStatus': 'initial',
                'syncState.lastError': null,
                'syncState.lastErrorAt': null
              }
            });

            logger.info(`✅ Error recovery initiated for ${account.emailAddress}`);

          } catch (error: any) {
            logger.error(`💥 Error recovery failed for ${account.emailAddress}:`, error);
          }
        }

      } catch (error: any) {
        logger.error("💥 Gmail error recovery failed", { error: error.message });
      }
    });

    // Run health check every hour
    cron.schedule("0 * * * *", async () => {
      try {
        logger.info("🏥 Running Gmail sync health check");

        const gmailAccounts = await EmailAccountModel.find({
          accountType: 'gmail',
          isActive: true
        });

        const stats = {
          total: gmailAccounts.length,
          complete: gmailAccounts.filter(a => a.syncState?.syncStatus === 'complete').length,
          historical: gmailAccounts.filter(a => a.syncState?.syncStatus === 'historical').length,
          initial: gmailAccounts.filter(a => a.syncState?.syncStatus === 'initial').length,
          error: gmailAccounts.filter(a => a.syncState?.syncStatus === 'error').length,
          needsSync: gmailAccounts.filter(a => 
            a.syncState?.syncStatus === 'complete' && 
            a.syncState.lastSyncAt && 
            a.syncState.lastSyncAt < new Date(Date.now() - 30 * 60 * 1000) // Not synced in 30 minutes
          ).length
        };

        logger.info("Gmail sync health status", stats);

        // Alert if there are too many accounts in error state
        if (stats.error > stats.total * 0.2) { // More than 20% in error
          logger.warn("🚨 High number of Gmail accounts in error state", {
            errorCount: stats.error,
            totalCount: stats.total,
            errorPercentage: (stats.error / stats.total * 100).toFixed(1) + '%'
          });
        }

        // Alert if many accounts need sync
        if (stats.needsSync > stats.complete * 0.3) { // More than 30% of complete accounts
          logger.warn("🚨 Many Gmail accounts need sync", {
            needsSync: stats.needsSync,
            completeCount: stats.complete
          });
        }

      } catch (error: any) {
        logger.error("❌ Gmail health check failed", { error: error.message });
      }
    });

    logger.info("✅ Gmail sync cron jobs started");
  }

  /**
   * Stop the cron jobs (useful for testing or graceful shutdown)
   */
  static stop(): void {
    cron.getTasks().forEach((task) => {
      task.stop();
    });
    logger.info("🛑 Gmail sync cron jobs stopped");
  }

  /**
   * Manual trigger for Gmail sync (useful for testing)
   */
  static async manualSync(accountId?: string): Promise<void> {
    try {
      if (accountId) {
        // Sync specific account
        const account = await EmailAccountModel.findById(accountId);
        if (!account) {
          throw new Error(`Account not found: ${accountId}`);
        }

        logger.info(`Manual Gmail sync for ${account.emailAddress}`);
        await EmailFetchingService.syncGmailWithHistoryAPI(account, { useHistoryAPI: true });
        
      } else {
        // Sync all accounts that need it
        const accountsNeedingSync = await EmailAccountModel.find({
          accountType: 'gmail',
          isActive: true,
          oauth: { $exists: true },
          'syncState.syncStatus': { $in: ['initial', 'historical'] }
        });

        logger.info(`Manual Gmail sync for ${accountsNeedingSync.length} accounts`);

        for (const account of accountsNeedingSync) {
          try {
            await EmailFetchingService.syncGmailWithHistoryAPI(account, { useHistoryAPI: true });
            await new Promise(resolve => setTimeout(resolve, 2000)); // 2 second delay
          } catch (error: any) {
            logger.error(`Manual sync failed for ${account.emailAddress}:`, error);
          }
        }
      }

      logger.info("✅ Manual Gmail sync completed");

    } catch (error: any) {
      logger.error("💥 Manual Gmail sync failed:", error);
      throw error;
    }
  }
}
