import { FilterQuery } from "mongoose";
import {
  IRecurringExpense,
  RecurrenceFrequency,
} from "@/contracts/recurring-expense.contract";
import { RecurringExpense } from "@/models/recurring-expense.model";
import { SystemExpenseService } from "./system-expense.service";

function addMonthsSafe(date: Date, months: number, desiredDay?: number) {
  const result = new Date(date);
  const targetMonth = result.getMonth() + months;
  result.setMonth(targetMonth);
  if (desiredDay) {
    const lastDayOfMonth = new Date(
      result.getFullYear(),
      result.getMonth() + 1,
      0
    ).getDate();
    result.setDate(Math.min(desiredDay, lastDayOfMonth));
  }
  return result;
}

function computeNextRunAt(
  currentFrom: Date,
  frequency: RecurrenceFrequency,
  interval: number,
  dayOfWeek?: number,
  dayOfMonth?: number,
  monthOfYear?: number
): Date {
  const base = new Date(currentFrom);
  switch (frequency) {
    case "daily":
      return new Date(base.getTime() + interval * 24 * 60 * 60 * 1000);
    case "weekly": {
      // For weekly, we need to find the next occurrence of the specified day of week
      const next = new Date(base);

      if (typeof dayOfWeek === "number") {
        // Calculate days until next occurrence of the target day
        const currentDay = next.getDay();
        let daysToAdd = dayOfWeek - currentDay;

        // If the target day is today or has passed this week, move to next week
        if (daysToAdd <= 0) {
          daysToAdd += 7;
        }

        // Add the interval weeks
        daysToAdd += (interval - 1) * 7;

        next.setDate(next.getDate() + daysToAdd);
      } else {
        // If no specific day specified, just add interval weeks
        next.setDate(next.getDate() + interval * 7);
      }

      return next;
    }
    case "monthly": {
      const desiredDay = dayOfMonth || base.getDate();
      return addMonthsSafe(base, interval, desiredDay);
    }
    case "yearly": {
      const next = new Date(base);
      if (typeof monthOfYear === "number") {
        // Set the specific month (0-indexed, so subtract 1)
        next.setMonth(monthOfYear - 1);
        // Keep the same day of month if possible
        const lastDayOfMonth = new Date(next.getFullYear(), next.getMonth() + 1, 0).getDate();
        const desiredDay = Math.min(base.getDate(), lastDayOfMonth);
        next.setDate(desiredDay);
      }
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
    const firstRunBase =
      data.startDate instanceof Date
        ? data.startDate
        : new Date(data.startDate as any);
    let nextRunAt = data.nextRunAt as Date | undefined;

    if (!nextRunAt) {
      // For weekly expenses, we need to calculate the first occurrence properly
      if (data.frequency === "weekly" && typeof data.dayOfWeek === "number") {
        const startDate = new Date(firstRunBase);
        const currentDay = startDate.getDay();
        let daysToAdd = data.dayOfWeek - currentDay;

        // If the target day has passed this week, move to next week
        if (daysToAdd <= 0) {
          daysToAdd += 7;
        }

        startDate.setDate(startDate.getDate() + daysToAdd);
        nextRunAt = startDate;

        // If the calculated first run is in the past, roll forward
        if (nextRunAt <= now) {
          let candidate = nextRunAt;
          // Safety cap to prevent infinite loops
          for (let i = 0; i < 1000 && candidate <= now; i++) {
            candidate = computeNextRunAt(
              candidate,
              data.frequency!,
              data.interval || 1,
              data.dayOfWeek,
              data.dayOfMonth,
              data.monthOfYear
            );
          }
          nextRunAt = candidate;
        }
      } else {
        // For other frequencies, use the original logic
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
              data.dayOfMonth,
              data.monthOfYear
            );
          }
          nextRunAt = candidate;
        }
      }
    }

    const doc = new RecurringExpense({
      ...data,
      nextRunAt,
    });
    return doc.save();
  },

  update: (id: string, update: Partial<IRecurringExpense>) => {
    return RecurringExpense.findByIdAndUpdate(id, update, {
      new: true,
    }).populate("category", "title");
  },

  remove: (id: string) => {
    return RecurringExpense.findByIdAndDelete(id);
  },

  getById: (id: string) => {
    return RecurringExpense.findById(id).populate("category", "title");
  },

  getAll: (filter: FilterQuery<IRecurringExpense> = {}) => {
    return RecurringExpense.find(filter)
      .populate("category", "title")
      .sort({ nextRunAt: 1 });
  },

  searchRecurringExpenses: async (filters: {
    searchQuery?: string;
    isBlocked?: boolean;
    frequency?: string;
    page?: number;
    limit?: number;
  }) => {
    const { searchQuery, isBlocked, frequency, page = 1, limit = 10 } = filters;
    
    // Build filter object
    const filter: any = {};
    
    if (isBlocked !== undefined) {
      filter.isBlocked = isBlocked;
    }
    
    if (frequency && frequency !== "all") {
      filter.frequency = frequency;
    }
    
    // Build search query
    if (searchQuery) {
      filter.$or = [
        { title: { $regex: searchQuery, $options: 'i' } },
        { description: { $regex: searchQuery, $options: 'i' } }
      ];
    }
    
    // Calculate skip value for pagination
    const skip = (page - 1) * limit;
    
    // Get total count for pagination
    const totalRecurringExpenses = await RecurringExpense.countDocuments(filter);
    
    // Get paginated results
    const recurringExpenses = await RecurringExpense.find(filter)
      .populate("category", "title")
      .sort({ nextRunAt: 1 })
      .skip(skip)
      .limit(limit);
    
    return {
      recurringExpenses,
      pagination: {
        totalRecurringExpenses,
        currentPage: page,
        totalPages: Math.ceil(totalRecurringExpenses / limit),
        limit,
        hasNextPage: page < Math.ceil(totalRecurringExpenses / limit),
        hasPrevPage: page > 1
      }
    };
  },

  toggleBlock: async (id: string, isBlocked: boolean) => {
    console.log("block : ", isBlocked);
    console.log("id : ", id);
    const updatedRecurringExpense = await RecurringExpense.findByIdAndUpdate(
      id,
      { isBlocked: isBlocked },
      { new: true }
    );
    if (!updatedRecurringExpense) {
      throw new Error("Recurring Expense not found");
    }
    return updatedRecurringExpense;
  },

  processDue: async () => {
    const now = new Date();
    console.log(`🔍 RecurringExpenseService.processDue: Checking for due items at ${now.toISOString()}`);
    
    const dueItems = await RecurringExpense.find({
      isBlocked: false,
      nextRunAt: { $lte: now },
      $or: [
        { endDate: null },
        { endDate: { $exists: false } },
        { endDate: { $gte: now } },
      ],
    });

    console.log(`📊 Found ${dueItems.length} due recurring expenses`);
    if (dueItems.length > 0) {
      console.log('📝 Due items:', dueItems.map(item => ({
        id: item._id,
        title: item.title,
        nextRunAt: item.nextRunAt,
        isBlocked: item.isBlocked
      })));
    }

    if (!dueItems.length) return { processed: 0 };

    await Promise.all(
      dueItems.map(async (item: any) => {
        // Create a concrete Expense from this recurring template using SystemExpenseService
        await SystemExpenseService.createRecurringExpense({
          title: item.title,
          description: item.description || item.title,
          amount: item.amount,
          date: now,
          recurringExpenseId: item._id.toString(),
        });

        // Schedule next run
        const nextRun = computeNextRunAt(
          item.nextRunAt || now,
          item.frequency,
          item.interval || 1,
          item.dayOfWeek,
          item.dayOfMonth,
          item.monthOfYear
        );

        item.lastRunAt = now;
        item.nextRunAt = nextRun;
        await item.save();
      })
    );

    return { processed: dueItems.length };
  },
};
