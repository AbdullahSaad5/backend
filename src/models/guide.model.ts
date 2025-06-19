import { Schema, model } from "mongoose";
import { IGuide, IGuideModel } from "@/contracts/guide.contract";

const guideSchema = new Schema<IGuide, IGuideModel>({
  title: {
    type: String,
    required: [true, "Title is required"],
    trim: true,
    maxlength: [200, "Title cannot exceed 200 characters"],
  },
  description: {
    type: String,
    required: [true, "Description is required"],
    trim: true,
  },
  category: {
    type: String,
    required: [true, "Category is required"],
  },
  content: {
    type: String,
    required: [true, "Content is required"],
  },
  isBlocked: {
    type: Boolean,
    default: false,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

guideSchema.pre("save", function(next) {
  this.updatedAt = new Date();
  next();
});

export const GuideModel = model<IGuide, IGuideModel>("Guide", guideSchema);