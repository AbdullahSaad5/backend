import * as cron from "node-cron";
import { LambdaEmailIntegrationService } from "@/services/lambda-email-integration.service";
import { logger } from "@/utils/logger.util";

export class LambdaEmailSyncCron {
  private static isRunning = false;

  /**
   * Start the Lambda email sync cron job
   */
  static start(): void {
    // Run every 5 minutes to sync Lambda-processed emails
    cron.schedule("*/5 * * * *", async () => {
      if (LambdaEmailSyncCron.isRunning) {
        logger.warn("Lambda email sync already running, skipping...");
        return;
      }

      LambdaEmailSyncCron.isRunning = true;
      const startTime = Date.now();

      try {
        logger.info("🔄 Starting scheduled Lambda email sync");

        const result = await LambdaEmailIntegrationService.syncProcessedEmails();
        const duration = Date.now() - startTime;

        if (result.success) {
          logger.info("✅ Lambda email sync completed successfully", {
            processed: result.processed,
            errors: result.errors.length,
            durationMs: duration,
          });

          if (result.errors.length > 0) {
            logger.warn("⚠️ Some emails failed to sync", {
              errorCount: result.errors.length,
              errors: result.errors.slice(0, 3), // Log first 3 errors
            });
          }
        } else {
          logger.error("❌ Lambda email sync failed", {
            errors: result.errors,
            durationMs: duration,
          });
        }
      } catch (error: any) {
        const duration = Date.now() - startTime;
        logger.error("💥 Lambda email sync crashed", {
          error: error.message,
          stack: error.stack,
          durationMs: duration,
        });
      } finally {
        LambdaEmailSyncCron.isRunning = false;
      }
    });

    // Run health check every hour
    cron.schedule("0 * * * *", async () => {
      try {
        logger.info("🏥 Running Lambda integration health check");

        const health = await LambdaEmailIntegrationService.healthCheck();

        logger.info("Lambda integration health status", {
          status: health.status,
          lambdaProcessedToday: health.lambdaProcessedToday,
          pendingSync: health.pendingSync,
          lastSyncTime: health.lastSyncTime,
        });

        // Alert if there are too many pending emails
        if (health.pendingSync > 100) {
          logger.warn("🚨 High number of pending emails to sync", {
            pendingCount: health.pendingSync,
          });
        }

        // Alert if no emails processed in the last 6 hours (during business hours)
        const sixHoursAgo = new Date(Date.now() - 6 * 60 * 60 * 1000);
        if (health.lastSyncTime && health.lastSyncTime < sixHoursAgo) {
          logger.warn("🚨 No emails synced in the last 6 hours", {
            lastSyncTime: health.lastSyncTime,
          });
        }
      } catch (error: any) {
        logger.error("❌ Health check failed", {
          error: error.message,
        });
      }
    });

    logger.info("✅ Lambda email sync cron jobs started");
  }

  /**
   * Stop the cron jobs (useful for testing or graceful shutdown)
   */
  static stop(): void {
    cron.getTasks().forEach((task) => {
      task.stop();
    });
    logger.info("🛑 Lambda email sync cron jobs stopped");
  }

  /**
   * Get sync status
   */
  static getStatus(): { isRunning: boolean } {
    return {
      isRunning: LambdaEmailSyncCron.isRunning,
    };
  }
}
