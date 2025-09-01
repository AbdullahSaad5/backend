import { ebayMessageSync } from "./EbayMessageSync";
import { autoCheckoutCron } from "./attendance";
import { markAbsentCron } from "./attendance";
import { tokenRefreshCron } from "./token-refresh.cron";
import { GmailSyncCron } from "./gmail-sync.cron";
import { RealTimeEmailSyncCron } from "./real-time-email-sync.cron";
import { EnhancedOutlookWebhookManagementCron } from "./enhanced-outlook-webhook-management.cron";
import { startDealCron } from "./dealCron";
import * as cron from "node-cron";
import { startRecurringExpenseCron, stopRecurringExpenseCron } from "./recurring-expense.cron";

export function initCron() {
  // Check if cron jobs should be disabled (for maintenance/debugging)
  if (process.env.DISABLE_CRON_JOBS === "true") {
    console.log("⚠️ Cron jobs are disabled via DISABLE_CRON_JOBS environment variable");
    return;
  }

  autoCheckoutCron();
  markAbsentCron();
  ebayMessageSync();
  tokenRefreshCron();
  GmailSyncCron.start(); // Start the new Gmail sync cron jobs
  RealTimeEmailSyncCron.start(); // Start real-time email sync cron jobs
  EnhancedOutlookWebhookManagementCron.start(); // Start enhanced Outlook webhook management
  startRecurringExpenseCron();
  startDealCron();
}

/**
 * Stop all cron jobs (useful for maintenance or debugging)
 */
export function stopAllCronJobs() {
  console.log("🛑 Stopping all cron jobs...");

  // Stop all scheduled tasks
  cron.getTasks().forEach((task) => {
    task.stop();
  });

  // Stop Gmail sync cron specifically
  GmailSyncCron.stop();
  RealTimeEmailSyncCron.stop();
  EnhancedOutlookWebhookManagementCron.stop();
  stopRecurringExpenseCron();

  console.log("✅ All cron jobs stopped");
}

/**
 * Get status of all cron jobs
 */
export function getCronStatus() {
  const tasks = cron.getTasks();
  const taskCount = tasks.size;

  console.log(`📊 Cron job status: ${taskCount} active tasks`);

  return {
    activeTasks: taskCount,
    tasks: Array.from(tasks.keys()),
  };
}
