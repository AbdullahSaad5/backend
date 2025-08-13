import { IAttendance } from "@/contracts/attendance.contract";
import { model, Schema } from "mongoose";
import { Shift } from "./workshift.model";
import { Workmode } from "./workmode.model";
import { User } from "./user.model";

const attendanceSchema = new Schema<IAttendance>({
  employeeId: { type: Schema.Types.ObjectId, ref: User, required: true },
  date: { type: Date, required: true },
  checkIn: { type: Date },
  checkOut: { type: Date },
  shiftId: { type: Schema.Types.ObjectId, ref: Shift },
  workModeId: { type: Schema.Types.ObjectId, ref: Workmode },
  status: {
    type: String,
    enum: ["present", "absent", "leave", "late"],
    required: true,
    default: "present",
  },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

// Existing unique index (keep this)
attendanceSchema.index({ employeeId: 1, date: 1 }, { unique: true });

// Additional performance indexes for your getAllForDate query
attendanceSchema.index({ date: 1 }); // For date range queries
attendanceSchema.index({ status: 1, date: 1 }); // For filtering by status and date
attendanceSchema.index({ date: -1 }); // For sorting by date descending (your default sort)

// Optional: Compound index for your specific query pattern
// This covers the most common query: date range + sorting + status filtering
attendanceSchema.index({ date: -1, status: 1 });

export const Attendance = model<IAttendance>("Attendance", attendanceSchema);
