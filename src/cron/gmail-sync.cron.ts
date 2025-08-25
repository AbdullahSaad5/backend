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
    // COMPLETELY DISABLED: All Gmail sync cron jobs
    // Manual sync only via frontend buttons
    // logger.info("🚫 Gmail sync cron jobs are completely disabled - manual sync only");
    return;
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
    // DISABLED: This method is disabled to prevent automatic sync
    logger.info("🚫 Manual sync via cron is disabled - use frontend manual sync buttons only");
    return;
  }
}
