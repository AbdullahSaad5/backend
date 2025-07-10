import { Document, Model, Types } from "mongoose";

export interface IAttendance extends Document {
  employeeId: Types.ObjectId;
  date: Date;
  checkIn?: Date;
  checkOut?: Date;
  status: "present" | "absent" | "leave" | "late";
  shiftId: Types.ObjectId;
  workModeId: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

export type AttendanceModel = Model<IAttendance>;
