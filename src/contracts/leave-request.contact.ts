import { Document, Model, Types } from "mongoose";
export interface ILeaveRequest extends Document {
  userId: Types.ObjectId;
  date: Date;
  reason: string;
  leaveType: "normal" | "urgent";
  isPaid?: boolean;
  status: "pending" | "approved" | "rejected";
  createdAt: Date;
  updatedAt: Date;
}
