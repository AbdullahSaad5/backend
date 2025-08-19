import * as cron from "node-cron";
import { EmailFetchingService } from "@/services/email-fetching.service";
import { EmailAccountModel } from "@/models/email-account.model";
import { logger } from "@/utils/logger.util";

export class GmailSyncCron {
  private static isRunning = false;
  private static lastRunTime = 0;
  private static readonly MIN_RUN_INTERVAL = 5 * 60 * 1000; // 5 minutes minimum between runs

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
      // Prevent overlapping runs
      if (GmailSyncCron.isRunning) {
        logger.warn("Gmail sync already running, skipping...");
        return;
      }

      // Prevent too frequent runs
      const now = Date.now();
      if (now - GmailSyncCron.lastRunTime < GmailSyncCron.MIN_RUN_INTERVAL) {
        logger.warn("Gmail sync run too soon after last run, skipping...");
        return;
      }

      GmailSyncCron.isRunning = true;
      GmailSyncCron.lastRunTime = now;
      const startTime = Date.now();

      try {
        logger.info("🔄 Starting Gmail sync for active accounts");

        // More specific query to prevent infinite loops
        const accountsNeedingSync = await EmailAccountModel.find({
          accountType: "gmail",
          isActive: true,
          oauth: { $exists: true },
          $and: [
            // Only process accounts that haven't been processed recently
            {
              $or: [
                { "syncState.lastSyncAt": { $exists: false } },
                { "syncState.lastSyncAt": { $lt: new Date(Date.now() - 15 * 60 * 1000) } },
              ],
            },
            // Only process accounts that are in a valid state
            {
              $or: [
                { "syncState.syncStatus": { $in: ["initial", "historical"] } },
                { "syncState.syncStatus": "complete" },
                { "syncState.syncStatus": { $exists: false } },
                { "syncState.syncStatus": "error" },
              ],
            },
            // Exclude accounts that are currently being processed
            { "syncState.isProcessing": { $ne: true } },
          ],
        }).limit(5); // Reduced limit to prevent overload

        logger.info(`Found ${accountsNeedingSync.length} Gmail accounts needing sync`);

        for (const account of accountsNeedingSync) {
          try {
            // Mark account as being processed to prevent duplicate processing
            await EmailAccountModel.findByIdAndUpdate(account._id, {
              $set: { "syncState.isProcessing": true, "syncState.lastProcessingStart": new Date() },
            });

            logger.info(`Processing Gmail sync for ${account.emailAddress}`);

            // Check if account needs full sync (no historyId)
            const needsFullSync = !account.syncState?.lastHistoryId;

            const result = await EmailFetchingService.syncGmailWithHistoryAPI(account, {
              useHistoryAPI: true,
              fetchAll: needsFullSync, // Force fetch all if no historyId
              includeBody: true,
            });

            if (result.success) {
              logger.info(`✅ Gmail sync completed for ${account.emailAddress}`, {
                historyId: result.historyId,
                totalCount: result.totalCount,
                newCount: result.newCount,
                syncStatus: account.syncState?.syncStatus,
              });
            } else {
              logger.error(`❌ Gmail sync failed for ${account.emailAddress}`, {
                error: result.error,
              });
            }

            // Add delay between accounts to avoid rate limiting
            await new Promise((resolve) => setTimeout(resolve, 5000)); // Increased delay
          } catch (error: any) {
            logger.error(`💥 Error syncing Gmail account ${account.emailAddress}:`, error);

            // Mark account as having an error
            await EmailAccountModel.findByIdAndUpdate(account._id, {
              $set: {
                "syncState.syncStatus": "error",
                "syncState.lastError": error.message,
                "syncState.lastErrorAt": new Date(),
                "syncState.isProcessing": false,
              },
            });
          } finally {
            // Always mark account as not being processed
            await EmailAccountModel.findByIdAndUpdate(account._id, {
              $set: { "syncState.isProcessing": false },
            });
          }
        }

        const duration = Date.now() - startTime;
        logger.info("✅ Gmail sync completed", {
          accountsProcessed: accountsNeedingSync.length,
          durationMs: duration,
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
          accountType: "gmail",
          isActive: true,
          $and: [
            {
              $or: [
                { "syncState.syncStatus": "error" },
                { "syncState.syncStatus": { $exists: false } },
                { connectionStatus: "error" },
                { status: "error" },
                { "stats.lastError": { $exists: true, $ne: null } },
              ],
            },
            // Only recover accounts that haven't been processed recently
            {
              $or: [
                { "syncState.lastErrorRecoveryAttempt": { $exists: false } },
                { "syncState.lastErrorRecoveryAttempt": { $lt: new Date(Date.now() - 30 * 60 * 1000) } },
              ],
            },
          ],
        }).limit(3); // Reduced limit

        logger.info(`Found ${errorAccounts.length} Gmail accounts with errors to recover`);

        for (const account of errorAccounts) {
          try {
            logger.info(`Attempting error recovery for ${account.emailAddress}`);

            // Mark recovery attempt
            await EmailAccountModel.findByIdAndUpdate(account._id, {
              $set: {
                "syncState.lastErrorRecoveryAttempt": new Date(),
                "syncState.isProcessing": false,
              },
            });

            // Reset sync status and account status to retry
            await EmailAccountModel.findByIdAndUpdate(account._id, {
              $set: {
                "syncState.syncStatus": "initial",
                "syncState.lastError": null,
                "syncState.lastErrorAt": null,
                "syncState.lastHistoryId": null, // Reset historyId to force full sync
                connectionStatus: "connected",
                status: "active",
                "stats.lastError": null,
              },
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
          accountType: "gmail",
          isActive: true,
        });

        const stats = {
          total: gmailAccounts.length,
          complete: gmailAccounts.filter((a) => a.syncState?.syncStatus === "complete").length,
          historical: gmailAccounts.filter((a) => a.syncState?.syncStatus === "historical").length,
          initial: gmailAccounts.filter((a) => a.syncState?.syncStatus === "initial").length,
          error: gmailAccounts.filter((a) => a.syncState?.syncStatus === "error").length,
          processing: gmailAccounts.filter((a) => a.syncState?.isProcessing === true).length,
          needsSync: gmailAccounts.filter(
            (a) =>
              a.syncState?.syncStatus === "complete" &&
              a.syncState.lastSyncAt &&
              a.syncState.lastSyncAt < new Date(Date.now() - 30 * 60 * 1000) // Not synced in 30 minutes
          ).length,
        };

        logger.info("Gmail sync health status", stats);

        // Alert if there are too many accounts in error state
        if (stats.error > stats.total * 0.2) {
          // More than 20% in error
          logger.warn("🚨 High number of Gmail accounts in error state", {
            errorCount: stats.error,
            totalCount: stats.total,
            errorPercentage: ((stats.error / stats.total) * 100).toFixed(1) + "%",
          });
        }

        // Alert if many accounts need sync
        if (stats.needsSync > stats.complete * 0.3) {
          // More than 30% of complete accounts
          logger.warn("🚨 Many Gmail accounts need sync", {
            needsSync: stats.needsSync,
            completeCount: stats.complete,
          });
        }

        // Alert if accounts are stuck in processing state
        if (stats.processing > 0) {
          logger.warn("🚨 Some Gmail accounts are stuck in processing state", {
            processingCount: stats.processing,
          });

          // Reset stuck processing accounts
          await EmailAccountModel.updateMany(
            {
              accountType: "gmail",
              isActive: true,
              "syncState.isProcessing": true,
              "syncState.lastProcessingStart": { $lt: new Date(Date.now() - 30 * 60 * 1000) }, // Stuck for more than 30 minutes
            },
            {
              $set: {
                "syncState.isProcessing": false,
                "syncState.syncStatus": "error",
                "syncState.lastError": "Account stuck in processing state - reset by health check",
              },
            }
          );
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
          accountType: "gmail",
          isActive: true,
          oauth: { $exists: true },
          "syncState.syncStatus": { $in: ["initial", "historical"] },
          "syncState.isProcessing": { $ne: true },
        });

        logger.info(`Manual Gmail sync for ${accountsNeedingSync.length} accounts`);

        for (const account of accountsNeedingSync) {
          try {
            await EmailFetchingService.syncGmailWithHistoryAPI(account, { useHistoryAPI: true });
            await new Promise((resolve) => setTimeout(resolve, 3000)); // 3 second delay
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
