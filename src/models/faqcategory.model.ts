
import { Schema, model } from "mongoose";
import { IFaqCategory, IFaqCategoryModel } from "@/contracts/faqcategory.contract";

const FaqCategorySchema = new Schema<IFaqCategory, IFaqCategoryModel>({
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

export const FaqCategoryModel = model<IFaqCategory>("FaqCategory", FaqCategorySchema);