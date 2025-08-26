import { Schema, model } from "mongoose";
import { IExpense, IExpenseModel } from "@/contracts/expense.contract";
import { boolean } from "zod";

const expenseSchema = new Schema<IExpense, IExpenseModel>({
  title: {
    type: String,
    required: [true, "title is required"],
    trim: true,
    maxlength: [100, "Title cannot exceed 100 characters"],
  },
  description: {
    type: String,
    required: [true, "Description is required"],
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
    ref: "ExpenseCategory",
    required: [true, "Category is required"],
  },
  date: {
    type: Date,
    required: [true, "Date is required"],
    default: Date.now,
  },
  isBlocked:{
    type: Boolean,
    default: false,
  },
  image: {
    type: String,
    default: "",
  },
  isSystemGenerated: {
    type: Boolean,
    default: false,
  },
  systemType: {
    type: String,
    enum: ["inventory_purchase", "payroll", "recurring", "adjustment"],
    required: function() {
      return this.isSystemGenerated;
    },
  },
  payrollType: {
    type: String,
    enum: ["ACTUAL", "GOVERNMENT"],
    required: function() {
      return this.isSystemGenerated && this.systemType === "payroll";
    },
  },
  // Separate reference fields for each system type
  inventoryReferenceId: {
    type: Schema.Types.ObjectId,
    ref: "Stock",
    required: function() {
      return this.isSystemGenerated && this.systemType === "inventory_purchase";
    },
  },
  payrollReferenceId: {
    type: Schema.Types.ObjectId,
    ref: "ProcessedPayroll",
    required: function() {
      return this.isSystemGenerated && this.systemType === "payroll";
    },
  },
  recurringReferenceId: {
    type: Schema.Types.ObjectId,
    ref: "RecurringExpense",
    required: function() {
      return this.isSystemGenerated && this.systemType === "recurring";
    },
  },
  adjustmentReferenceId: {
    type: Schema.Types.ObjectId,
    ref: "Expense",
    required: function() {
      return this.isSystemGenerated && this.systemType === "adjustment";
    },
  },
  adjustments: [{
    adjustmentId: {
      type: Schema.Types.ObjectId,
      ref: "Expense"
    },
    amount: Number,
    reason: String,
    date: {
      type: Date,
      default: Date.now
    },
    adjustedBy: String
  }],
}, {
  timestamps: true
});

export const ExpenseModel = model<IExpense, IExpenseModel>("Expense", expenseSchema);
