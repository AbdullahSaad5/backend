// src/models/guide.model.ts
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
  type:{
    type: String,
    required: [true, "Type is required"],
    trim: true
  },
  category: {
    type: Schema.Types.ObjectId, // Changed to ObjectId
    ref: "GuidesCategory", // Reference to GuidesCategory model
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
}, { timestamps: true }); // Using timestamps instead of manual createdAt/updatedAt

export const GuideModel = model<IGuide, IGuideModel>("Guide", guideSchema);