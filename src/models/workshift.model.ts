import { IWorkshift } from "@/contracts/workshif.contracts";
import { model, Schema, Types } from "mongoose";

const WorkShift = new Schema<IWorkshift>({
  shiftName: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100,
  },
  shiftDescription: {
    type: String,
    required: true,
    trim: true,
  },
  startTime: {
    type: String,
    required: true,
    validate: {
      validator: function (v) {
        return /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/.test(v);
      },
      message: (props) => `${props.value} is not a valid time format (HH:MM)!`,
    },
  },
  endTime: {
    type: String,
    required: true,
    validate: {
      validator: function (v) {
        if (!this.startTime) return true;
        return (
          /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/.test(v) && v > this.startTime
        );
      },
      message: (props) => `End time must be after start time!`,
    },
  },
  mode: {
    type: String,
    required: true,
    enum: ["On Site", "Hybrid", "Remote"],
    default: "On Site",
  },
  employees: [
    {
      type: Types.ObjectId,
      ref: "User",
      required: true,
    },
  ],
  isActive: {
    type: Boolean,
    default: true,
  },
  createdBy: {
    type: Types.ObjectId,
    ref: "User",
    required: true, // Added required
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

export const Shift = model<IWorkshift>("Shift", WorkShift);
