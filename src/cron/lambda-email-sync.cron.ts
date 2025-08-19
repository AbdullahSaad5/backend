import * as cron from "node-cron";
import { LambdaEmailIntegrationService } from "@/services/lambda-email-integration.service";
import { logger } from "@/utils/logger.util";

export class LambdaEmailSyncCron {
  private static isRunning = false;

  /**
   * Start the Lambda email sync cron job
   */
  static start(): void {
    // COMPLETELY DISABLED: All Lambda email sync cron jobs
    // Manual sync only via frontend buttons or API calls
    logger.info("🚫 Lambda email sync cron jobs are completely disabled - manual sync only");
    return;
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
