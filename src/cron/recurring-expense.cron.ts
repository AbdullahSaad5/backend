import * as cron from "node-cron";
import { RecurringExpenseService } from "@/services/recurring-expense.service";

let task: cron.ScheduledTask | null = null;

export function startRecurringExpenseCron() {
  if (task) return task;
  // Run every 5 minutes
  task = cron.schedule("*/5 * * * *", async () => {
    try {
      const { processed } = await RecurringExpenseService.processDue();
      if (processed > 0) {
        console.log(`RecurringExpenseCron: processed ${processed} item(s)`);
      }
    } catch (err) {
      console.error("RecurringExpenseCron error:", err);
    }
  });
  task.start();
  return task;
}

export function stopRecurringExpenseCron() {
  if (task) {
    task.stop();
    task = null;
  }
}


