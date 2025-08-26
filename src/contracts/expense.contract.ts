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
  // Payroll type for payroll expenses (ACTUAL or GOVERNMENT)
  payrollType?: "ACTUAL" | "GOVERNMENT";
  // Separate reference fields for each system type
  inventoryReferenceId?: Types.ObjectId;
  payrollReferenceId?: Types.ObjectId;
  recurringReferenceId?: Types.ObjectId;
  adjustmentReferenceId?: Types.ObjectId;
  adjustments?: Array<{
    adjustmentId: Types.ObjectId;
    amount: number;
    reason: string;
    date: Date;
    adjustedBy?: string;
  }>;
  
  // Timestamps
  createdAt: Date;
  updatedAt: Date;
}

export type IExpenseModel = Model<IExpense>;
