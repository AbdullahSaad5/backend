// src/models/faq.model.ts
import { Schema, model } from "mongoose";
import { IFaq, IFaqModel } from "@/contracts/faq.contract";

const FaqSchema = new Schema<IFaq, IFaqModel>({
  category: {
    type: String,
    required: [true, "Category is required"],
    trim: true
  },
  question: {
    type: String,
    required: [true, "Question is required"],
    trim: true,
    maxlength: [500, "Question cannot exceed 500 characters"]
  },
  answer: {
    type: String,
    required: [true, "Answer is required"],
    trim: true,
    maxlength: [2000, "Answer cannot exceed 2000 characters"]
  },
  isBlocked: {
    type: Boolean,
    default: false
  }
}, { timestamps: true });

export const FaqModel = model<IFaq>("Faq", FaqSchema);