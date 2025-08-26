import { Document, Model, Types } from "mongoose";

export type RecurrenceFrequency = "daily" | "weekly" | "monthly" | "yearly";

export interface IRecurringExpense extends Document {
  title: string;
  description?: string;
  amount: number;
  category: {
    _id: Types.ObjectId;
    title: string;
  } | Types.ObjectId;
  image?: string;

  // Recurrence configuration
  frequency: RecurrenceFrequency;
  interval: number; // every N frequency units
  startDate: Date;
  endDate?: Date | null;

  // Optional helpers for specific frequencies
  dayOfWeek?: number; // 0-6 (Sun-Sat) for weekly
  dayOfMonth?: number; // 1-31 for monthly

  // Runtime fields
  isBlocked: boolean;
  lastRunAt?: Date | null;
  nextRunAt: Date;
  
  // Timestamps
  createdAt: Date;
  updatedAt: Date;
}

export type IRecurringExpenseModel = Model<IRecurringExpense>;


