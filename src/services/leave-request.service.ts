import { LeaveRequest } from "@/models/leave-request.model";
import { attendanceService } from "@/services/attendance.service";

export const leaveRequestService = {
  createLeaveRequest: async (
    userId: string,
    date: Date,
    reason: string,
    leaveType: "normal" | "urgent",
    isPaid?: boolean
  ) => {
    // Prevent duplicate leave requests for the same date
    const existing = await LeaveRequest.findOne({ userId, date });
    if (existing) throw new Error("Leave request for this date already exists");
    return LeaveRequest.create({ userId, date, reason, leaveType, ...(isPaid !== undefined && { isPaid }) });
  },

  getLeaveRequests: async (filter: any = {}, page: number = 1, limit: number = 5) => {
    const skip = (page - 1) * limit;

    const [results, total] = await Promise.all([
      LeaveRequest.find(filter)
        .populate("userId", "firstName lastName email")
        .sort({ date: -1 })
        .skip(skip)
        .limit(limit),
      LeaveRequest.countDocuments(filter),
    ]);

    return {
      results,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit),
      },
    };
  },

  updateLeaveRequestStatus: async (requestId: string, status: "approved" | "rejected", isPaid?: boolean) => {
    const leaveRequest = await LeaveRequest.findById(requestId);
    if (!leaveRequest) throw new Error("Leave request not found");
    leaveRequest.status = status;
    if (isPaid !== undefined) leaveRequest.isPaid = isPaid;
    await leaveRequest.save();
    if (status === "approved") {
      // Mark attendance as leave for that user and date
      await attendanceService.adminMark(leaveRequest.userId.toString(), leaveRequest.date, "leave");
    }
    return leaveRequest;
  },

  getLeaveRequestById: async (id: string) => {
    return LeaveRequest.findById(id).populate("userId", "firstName lastName email");
  },

  getUserLeaveRequests: async (userId: string, page: number = 1, limit: number = 5) => {
    const skip = (page - 1) * limit;

    const [results, total] = await Promise.all([
      LeaveRequest.find({ userId })
        .populate("userId", "firstName lastName email")
        .sort({ date: -1 })
        .skip(skip)
        .limit(limit),
      LeaveRequest.countDocuments({ userId }),
    ]);

    return {
      results,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit),
      },
    };
  },
};
