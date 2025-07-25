import { Schema, model } from "mongoose";
import { ILeaveRequest } from "@/contracts/leave-request.contact";

const leaveRequestSchema = new Schema<ILeaveRequest>({
  userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
  date: { type: Date, required: true },
  reason: { type: String, required: true },
  status: {
    type: String,
    enum: ["pending", "approved", "rejected"],
    default: "pending",
    required: true,
  },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

export const LeaveRequest = model<ILeaveRequest>(
  "LeaveRequest",
  leaveRequestSchema
);
