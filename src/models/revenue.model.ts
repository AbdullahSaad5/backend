// src/models/revenue.model.ts
import { IRevenue, IRevenueModel } from "@/contracts/revenue.contract";
import { Schema, model } from "mongoose";

const RevenueSchema = new Schema<IRevenue, IRevenueModel>({
  description: {
    type: String,
    required: [true, "Description is required"],
    trim: true,
    maxlength: [500, "Description cannot exceed 500 characters"],
  },
  amount: {
    type: Number,
    required: [true, "Amount is required"],
    min: [0, "Amount cannot be negative"],
  },
  source: {
    type: String,
    required: [true, "Source is required"],
    trim: true,
    maxlength: [100, "Source cannot exceed 100 characters"],
  },
  receiveType: {
    type: String,
    required: [true, "Receive Type is required"],
    trim: true,
    maxlength: [100, "Receive Type exceed 100 characters"],
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
  isBlocked: {
    type: Boolean,
    default: false,
  },
});

export const RevenueModel = model<IRevenue>("Revenue", RevenueSchema);
