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

export const Attendance = model<IAttendance>("Attendance", attendanceSchema);
