import { Schema, model } from "mongoose";
import { IExpense, IExpenseModel } from "@/contracts/expense.contract";

const expenseSchema = new Schema<IExpense, IExpenseModel>({
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
    type: String,
    required: [true, "Category is required"],
    trim: true,
  },
  date: {
    type: Date,
    required: [true, "Date is required"],
    default: Date.now,
  },
  image: {
    type: String,
    default: "",
  },
});

export const ExpenseModel = model<IExpense, IExpenseModel>(
  "Expense",
  expenseSchema
);
