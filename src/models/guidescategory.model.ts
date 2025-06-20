import { Schema, model } from "mongoose";
import {
    IGuidesCategory,
    IGuidesCategoryModel,
} from "@/contracts/guidescategory.contract";

const GuidesCategorySchema = new Schema<IGuidesCategory, IGuidesCategoryModel>({
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

export const GuidesCategoryModel = model("GuidesCategory", GuidesCategorySchema);