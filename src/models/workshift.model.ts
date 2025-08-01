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
        // Only validate the time format, not the order, to allow overnight shifts
        return /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/.test(v);
      },
      message: (props) => `${props.value} is not a valid time format (HH:MM)!`,
    },
  },
  breakStartTime: {
    type: String,
    required: false,
    validate: {
      validator: function (v: string | null) {
        // Only validate the time format if value is provided
        return v == null || /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/.test(v);
      },
      message: (props: { value: string }) => `${props.value} is not a valid time format (HH:MM)!`,
    },
  },
  breakEndTime: {
    type: String,
    required: false,
    validate: {
      validator: function (v: string | null) {
        // Only validate the time format if value is provided
        return v == null || /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/.test(v);
      },
      message: (props: { value: string }) => `${props.value} is not a valid time format (HH:MM)!`,
    },
  },
  hasBreak: {
    type: Boolean,
    required: false,
    default: false,
  },
  employees: [
    {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: false,
    },
  ],
  isBlocked: {
    type: Boolean,
    default: false,
  },
  createdBy: {
    type: Types.ObjectId,
    ref: "User",
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  userType: {
    type: Schema.Types.ObjectId,
    ref: "UserCategory", // Must match what's in User model
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

export const Shift = model<IWorkshift>("Shift", WorkShift);
