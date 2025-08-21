import * as cron from "node-cron";
import { RecurringExpenseService } from "@/services/recurring-expense.service";

let task: cron.ScheduledTask | null = null;

export function startRecurringExpenseCron() {
  if (task) return task;
  // Run every 5 minutes
  console.log("🔄 Starting RecurringExpenseCron - runs every 5 minutes");
  task = cron.schedule("*/5 * * * *", async () => {
    try {
      console.log(`⏰ RecurringExpenseCron: Running at ${new Date().toISOString()}`);
      const { processed } = await RecurringExpenseService.processDue();
      console.log(`✅ RecurringExpenseCron: processed ${processed} item(s)`);
    } catch (err) {
      console.error("❌ RecurringExpenseCron error:", err);
    }
  });
  task.start();
  console.log("✅ RecurringExpenseCron started successfully");
  return task;
}

export function stopRecurringExpenseCron() {
  if (task) {
    task.stop();
    task = null;
  }
}


