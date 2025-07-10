import { LeaveRequest } from "@/models/leave-request.model";
import { attendanceService } from "@/services/attendance.service";

export const leaveRequestService = {
  createLeaveRequest: async (userId: string, date: Date, reason: string) => {
    // Prevent duplicate leave requests for the same date
    const existing = await LeaveRequest.findOne({ userId, date });
    if (existing) throw new Error("Leave request for this date already exists");
    return LeaveRequest.create({ userId, date, reason });
  },

  getLeaveRequests: async (filter: any = {}) => {
    return LeaveRequest.find(filter)
      .populate("userId", "firstName lastName email")
      .sort({ date: -1 });
  },

  updateLeaveRequestStatus: async (
    requestId: string,
    status: "approved" | "rejected"
  ) => {
    const leaveRequest = await LeaveRequest.findById(requestId);
    if (!leaveRequest) throw new Error("Leave request not found");
    leaveRequest.status = status;
    await leaveRequest.save();
    if (status === "approved") {
      // Mark attendance as leave for that user and date
      await attendanceService.adminMark(
        leaveRequest.userId.toString(),
        leaveRequest.date,
        "leave"
      );
    }
    return leaveRequest;
  },

  getLeaveRequestById: async (id: string) => {
    return LeaveRequest.findById(id).populate(
      "userId",
      "firstName lastName email"
    );
  },

  getUserLeaveRequests: async (userId: string) => {
    return LeaveRequest.find({ userId }).populate(
      "userId",
      "firstName lastName email,"
    );
  },
};
