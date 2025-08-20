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
    ref: "IExpenseModel", // Expense Category model
    required: [true, "Category is required"],
  },
  image: {
    type: String,
    default: "",
  },

  frequency: {
    type: String,
    enum: ["daily", "weekly", "monthly", "yearly"],
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
  },
  dayOfMonth: {
    type: Number,
    min: 1,
    max: 31,
  },
  isActive: {
    type: Boolean,
    default: true,
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

RecurringExpenseSchema.index({ isActive: 1, nextRunAt: 1 });

export const RecurringExpenseModel = model<IRecurringExpense, IRecurringExpenseModel>(
  "RecurringExpense",
  RecurringExpenseSchema
);


