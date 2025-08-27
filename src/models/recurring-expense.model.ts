import { Schema, model } from "mongoose";
import {
  IRecurringExpense,
  IRecurringExpenseModel,
} from "@/contracts/recurring-expense.contract";

const RecurringExpenseSchema = new Schema<IRecurringExpense, IRecurringExpenseModel>({
  title: {
    type: String,
    required: [true, "Title is required"],
    trim: true,
    maxlength: [100, "Title cannot exceed 100 characters"],
  },
  description: {
    type: String,
    trim: true,
    maxlength: [200, "Description cannot exceed 200 characters"],
  },
  amount: {
    type: Number,
    required: [true, "Amount is required"],
    min: [0, "Amount cannot be negative"],
  },
  category: {
    type: Schema.Types.ObjectId,
    ref: "ExpenseCategory", // Expense Category model
    required: [true, "Category is required"],
  },
  image: {
    type: String,
    default: "",
  },

  frequency: {
    type: String,
    enum: ["daily", "weekly", "monthly", "quarterly" , "yearly"],
    required: [true, "Frequency is required"],
  },
  interval: {
    type: Number,
    default: 1,
    min: [1, "Interval must be at least 1"],
  },
  startDate: {
    type: Date,
    required: [true, "Start date is required"],
  },
  endDate: {
    type: Date,
    default: null,
  },
  dayOfWeek: {
    type: Number,
    min: 0,
    max: 6,
    set: function(value: any): number | undefined {
      if (value === null || value === undefined || value === "") {
        return undefined;
      }
      
      // If it's already a number, validate and return
      if (typeof value === "number") {
        return value >= 0 && value <= 6 ? value : undefined;
      }
      
      // If it's a string, convert to number
      if (typeof value === "string") {
        const trimmed = value.trim().toLowerCase();
        const dayMap: Record<string, number> = {
          sunday: 0,
          sun: 0,
          monday: 1,
          mon: 1,
          tuesday: 2,
          tue: 2,
          tues: 2,
          wednesday: 3,
          wed: 3,
          thursday: 4,
          thu: 4,
          thur: 4,
          thurs: 4,
          friday: 5,
          fri: 5,
          saturday: 6,
          sat: 6,
        };
        
        if (trimmed in dayMap) {
          return dayMap[trimmed];
        }
        
        // Try to parse as number
        const asNum = Number(trimmed);
        return Number.isInteger(asNum) && asNum >= 0 && asNum <= 6 ? asNum : undefined;
      }
      
      return undefined;
    },
  },
  dayOfMonth: {
    type: Number,
    min: 1,
    max: 31,
  },
  isBlocked: {
    type: Boolean,
    default: false,
  },
  lastRunAt: {
    type: Date,
    default: null,
  },
  nextRunAt: {
    type: Date,
    required: true,
    default: () => new Date(),
    index: true,
  },
}, {
  timestamps: true,
});

RecurringExpenseSchema.index({ isBlocked: 1, nextRunAt: 1 });

export const RecurringExpense = model<IRecurringExpense, IRecurringExpenseModel>(
  "RecurringExpense",
  RecurringExpenseSchema
);


