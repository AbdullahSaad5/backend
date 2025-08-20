import { FilterQuery } from "mongoose";
import { IRecurringExpense, RecurrenceFrequency } from "@/contracts/recurring-expense.contract";
import { RecurringExpenseModel } from "@/models/recurring-expense.model";
import { SystemExpenseService } from "./system-expense.service";

function addMonthsSafe(date: Date, months: number, desiredDay?: number) {
  const result = new Date(date);
  const targetMonth = result.getMonth() + months;
  result.setMonth(targetMonth);
  if (desiredDay) {
    const lastDayOfMonth = new Date(result.getFullYear(), result.getMonth() + 1, 0).getDate();
    result.setDate(Math.min(desiredDay, lastDayOfMonth));
  }
  return result;
}

function computeNextRunAt(
  currentFrom: Date,
  frequency: RecurrenceFrequency,
  interval: number,
  dayOfWeek?: number,
  dayOfMonth?: number
): Date {
  const base = new Date(currentFrom);
  switch (frequency) {
    case "daily":
      return new Date(base.getTime() + interval * 24 * 60 * 60 * 1000);
    case "weekly": {
      const next = new Date(base.getTime() + interval * 7 * 24 * 60 * 60 * 1000);
      if (typeof dayOfWeek === "number") {
        const diff = (dayOfWeek + 7 - next.getDay()) % 7;
        next.setDate(next.getDate() + diff);
      }
      return next;
    }
    case "monthly": {
      const desiredDay = dayOfMonth || base.getDate();
      return addMonthsSafe(base, interval, desiredDay);
    }
    case "yearly": {
      const next = new Date(base);
      next.setFullYear(base.getFullYear() + interval);
      return next;
    }
    default:
      return new Date(base.getTime() + 24 * 60 * 60 * 1000);
  }
}

export const RecurringExpenseService = {
  create: async (data: Partial<IRecurringExpense>) => {
    if (!data.startDate) data.startDate = new Date();
    const now = new Date();
    const firstRunBase = data.startDate instanceof Date ? data.startDate : new Date(data.startDate as any);
    let nextRunAt = data.nextRunAt as Date | undefined;
    if (!nextRunAt) {
      // If startDate is in the future, first run is at startDate; otherwise roll forward until after now
      if (firstRunBase > now) {
        nextRunAt = firstRunBase;
      } else {
        let candidate = firstRunBase;
        // Safety cap to prevent infinite loops
        for (let i = 0; i < 1000 && candidate <= now; i++) {
          candidate = computeNextRunAt(
            candidate,
            data.frequency!,
            data.interval || 1,
            data.dayOfWeek,
            data.dayOfMonth
          );
        }
        nextRunAt = candidate;
      }
    }

    const doc = new RecurringExpenseModel({
      ...data,
      nextRunAt,
    });
    return doc.save();
  },

  update: (id: string, update: Partial<IRecurringExpense>) => {
    return RecurringExpenseModel.findByIdAndUpdate(id, update, { new: true }).populate('category', 'title');
  },

  remove: (id: string) => {
    return RecurringExpenseModel.findByIdAndDelete(id);
  },

  getById: (id: string) => {
    return RecurringExpenseModel.findById(id).populate('category', 'title');
  },

  getAll: (filter: FilterQuery<IRecurringExpense> = {}) => {
    return RecurringExpenseModel.find(filter).populate('category', 'title').sort({ nextRunAt: 1 });
  },

  processDue: async () => {
    const now = new Date();
    const dueItems = await RecurringExpenseModel.find({
      isActive: true,
      nextRunAt: { $lte: now },
      $or: [{ endDate: null }, { endDate: { $exists: false } }, { endDate: { $gte: now } }],
    });

    if (!dueItems.length) return { processed: 0 };

    await Promise.all(
      dueItems.map(async (item) => {
        // Create a concrete Expense from this recurring template using SystemExpenseService
        await SystemExpenseService.createRecurringExpense({
          title: item.title,
          description: item.description || item.title,
          amount: item.amount,
          recurringExpenseId: item._id.toString(),
          date: now,
        });

        // Schedule next run
        const nextRun = computeNextRunAt(
          item.nextRunAt || now,
          item.frequency,
          item.interval || 1,
          item.dayOfWeek,
          item.dayOfMonth
        );

        item.lastRunAt = now;
        item.nextRunAt = nextRun;
        await item.save();
      })
    );

    return { processed: dueItems.length };
  },
};


