import { Schema, model } from "mongoose";
import { ILeaveRequest } from "@/contracts/leave-request.contact";

const leaveRequestSchema = new Schema<ILeaveRequest>({
  userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
  date: { type: Date, required: true },
  reason: { type: String, required: true },
  leaveType: {
    type: String,
    enum: ["normal", "urgent"],
    required: true,
  },
  isPaid: {
    type: Boolean,
    required: false,
    default: false,
  },
  status: {
    type: String,
    enum: ["pending", "approved", "rejected"],
    default: "pending",
    required: true,
  },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

// Performance indexes for getAllForDate optimization
// This is the most critical index for your query - it covers userId + date + status lookups
leaveRequestSchema.index({ userId: 1, date: 1, status: 1 });

// Additional useful indexes for common query patterns
leaveRequestSchema.index({ status: 1, date: 1 }); // For filtering approved/pending requests by date range
leaveRequestSchema.index({ userId: 1, status: 1 }); // For user-specific status queries
leaveRequestSchema.index({ date: 1 }); // For date range queries

export const LeaveRequest = model<ILeaveRequest>("LeaveRequest", leaveRequestSchema);
