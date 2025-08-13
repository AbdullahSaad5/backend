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

    // 🔧 FIX: Build database filter object (separate from search)
    const dbFilter: Record<string, any> = {};

    // Add non-search filters to database filter
    if (filter.status) {
      dbFilter.status = filter.status;
    }

    if (filter.isPaid !== undefined) {
      dbFilter.isPaid = filter.isPaid;
    }

    if (filter.leaveType) {
      dbFilter.leaveType = filter.leaveType;
    }

    // Handle search functionality
    if (filter.search) {
      // Set up the aggregate query with a lookup to search in user fields
      const leaveRequests = await LeaveRequest.aggregate([
        {
          $lookup: {
            from: "users",
            localField: "userId",
            foreignField: "_id",
            as: "userInfo",
          },
        },
        {
          $unwind: "$userInfo", // Unwind the userInfo array to access fields
        },
        {
          $match: {
            // 🔧 FIX: Apply both search AND other filters
            ...dbFilter, // Apply status, isPaid, leaveType filters
            $or: [
              { reason: { $regex: filter.search, $options: "i" } },
              { "userInfo.firstName": { $regex: filter.search, $options: "i" } },
              { "userInfo.lastName": { $regex: filter.search, $options: "i" } },
              { "userInfo.email": { $regex: filter.search, $options: "i" } },
            ],
          },
        },
        {
          $project: {
            _id: 1,
            date: 1,
            reason: 1,
            leaveType: 1,
            isPaid: 1,
            status: 1,
            createdAt: 1,
            updatedAt: 1,
            userId: {
              _id: "$userInfo._id",
              firstName: "$userInfo.firstName",
              lastName: "$userInfo.lastName",
              email: "$userInfo.email",
            },
          },
        },
        { $sort: { date: -1 } },
        { $skip: skip },
        { $limit: limit },
      ]);

      // Count total matching documents with same filters
      const totalCount = await LeaveRequest.aggregate([
        {
          $lookup: {
            from: "users",
            localField: "userId",
            foreignField: "_id",
            as: "userInfo",
          },
        },
        {
          $unwind: "$userInfo", // Unwind the userInfo array to access fields
        },
        {
          $match: {
            // 🔧 FIX: Apply both search AND other filters for count
            ...dbFilter, // Apply status, isPaid, leaveType filters
            $or: [
              { reason: { $regex: filter.search, $options: "i" } },
              { "userInfo.firstName": { $regex: filter.search, $options: "i" } },
              { "userInfo.lastName": { $regex: filter.search, $options: "i" } },
              { "userInfo.email": { $regex: filter.search, $options: "i" } },
            ],
          },
        },
        { $count: "total" },
      ]);

      const total = totalCount.length > 0 ? totalCount[0].total : 0;

      return {
        results: leaveRequests,
        pagination: {
          total,
          page,
          limit,
          pages: Math.ceil(total / limit),
        },
      };
    } else {
      // 🔧 FIX: Use dbFilter instead of the original filter for non-search queries
      const [results, total] = await Promise.all([
        LeaveRequest.find(dbFilter) // Use dbFilter here
          .populate("userId", "firstName lastName email")
          .sort({ date: -1 })
          .skip(skip)
          .limit(limit),
        LeaveRequest.countDocuments(dbFilter), // Use dbFilter here too
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
    }
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
        .populate("userId", "firstName lastName email isPaid")
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
