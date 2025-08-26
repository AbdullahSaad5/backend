import { Schema, model } from "mongoose";
import {
    IExpenseCategory,
    IExpenseCategoryModel,
} from "@/contracts/expensecategory.contract";

const IExpensecat = new Schema<IExpenseCategory, IExpenseCategoryModel>({
  title: {
    type: String,
    required: [true, "Title is required"],
    unique: true,
    maxlength: [100, "Title cannot exceed 100 characters"],
  },
  description: {
    type: String,
    required: [true, "Description is required"],
    trim: true,
    maxlength: [500, "Description cannot exceed 500 characters"],
  },
  image: {
    type: String,
    default: "",
  },
  isBlocked: {
    type: Boolean,
    default: false,
  },
  isSystemGenerated: {
    type: Boolean,
    default: false,
  },
}, {
  timestamps: true
});


export const ExpenseCategory = model("ExpenseCategory", IExpensecat)