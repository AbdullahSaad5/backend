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
    ref:"IExpenseModel",
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
});

export const ExpenseModel = model<IExpense, IExpenseModel>(
  "Expense",
  expenseSchema
);
