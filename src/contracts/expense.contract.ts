import { Document, Model, Types } from "mongoose";

export interface IExpense extends Document {
  title: string;
  description: string;
  amount: number;
  category: {
    _id: Types.ObjectId;
    title: string;
  } | Types.ObjectId;
  date: Date;
  isBlocked: boolean;
  image: string;
  isSystemGenerated: boolean;
  systemType?: "inventory_purchase" | "payroll" | "recurring" | "adjustment";
  referenceId?: Types.ObjectId;
  adjustments?: Array<{
    adjustmentId: Types.ObjectId;
    amount: number;
    reason: string;
    date: Date;
    adjustedBy?: string;
  }>;
}

export type IExpenseModel = Model<IExpense>;
