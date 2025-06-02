import { Schema, model } from "mongoose";
import {
  IComplaintCategory,
  ComplaintCategoryModel,
} from "@/contracts/complaints-category.contract";

const ICompCategory = new Schema<IComplaintCategory, ComplaintCategoryModel>({
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
});


export const IComplaintModel = model("IComplaintModel", ICompCategory)