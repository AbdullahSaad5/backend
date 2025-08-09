import { Request, Response } from "express";
import { leaveRequestService } from "@/services/leave-request.service";

export const leaveRequestController = {
  // User: create leave request
  createLeaveRequest: async (req: Request, res: Response) => {
    try {
      const user = req.context?.user;
      if (!user || !user.id) return res.status(401).json({ message: "Unauthorized" });
      const { date, reason, leaveType, isPaid } = req.body;
      if (!date || !reason || !leaveType)
        return res.status(400).json({ message: "Date, reason, and leaveType are required" });
      if (!["normal", "urgent"].includes(leaveType)) {
        return res.status(400).json({ message: "Invalid leaveType" });
      }
      if (isPaid !== undefined && typeof isPaid !== "boolean") {
        return res.status(400).json({ message: "isPaid must be a boolean if provided" });
      }
      const leaveRequest = await leaveRequestService.createLeaveRequest(
        user.id,
        new Date(date),
        reason,
        leaveType,
        isPaid
      );
      res.status(201).json(leaveRequest);
    } catch (err: any) {
      res.status(400).json({ message: err.message });
    }
  },

  // Admin: approve/reject leave request
  updateLeaveRequestStatus: async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { status, isPaid } = req.body;
      if (!id || !status || !["approved", "rejected"].includes(status)) {
        return res.status(400).json({ message: "Invalid request" });
      }
      if (isPaid !== undefined && typeof isPaid !== "boolean") {
        return res.status(400).json({ message: "isPaid must be a boolean if provided" });
      }
      const leaveRequest = await leaveRequestService.updateLeaveRequestStatus(id, status, isPaid);
      res.status(200).json(leaveRequest);
    } catch (err: any) {
      res.status(400).json({ message: err.message });
    }
  },

  // Admin: get all leave requests
  getAllLeaveRequests: async (req: Request, res: Response) => {
    try {
      // Extract pagination parameters from query string
      const page = req.query.page ? parseInt(req.query.page as string, 10) : 1;
      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 5;
      const search = req.query.search as string;

      // 🔧 FIX: Extract all filter parameters
      const status = req.query.status as string;
      const isPaid = req.query.isPaid as string;
      const leaveType = req.query.leaveType as string;

      // Add filter based on query parameters
      const filter: Record<string, any> = {};

      // Add search functionality if search parameter is provided
      if (search) {
        filter.search = search;
      }

      // 🔧 FIX: Add status filter
      if (status) {
        filter.status = status;
      }

      // 🔧 FIX: Add payment filter
      if (isPaid !== undefined) {
        filter.isPaid = isPaid === "true";
      }

      // 🔧 FIX: Add leave type filter
      if (leaveType) {
        filter.leaveType = leaveType;
      }

      const leaveRequests = await leaveRequestService.getLeaveRequests(filter, page, limit);
      res.status(200).json(leaveRequests);
    } catch (err: any) {
      res.status(400).json({ message: err.message });
    }
  },

  getLeaveRequestById: async (req: Request, res: Response) => {
    try {
      console.log("getLeaveRequestById", req.params);
      const { id } = req.params;

      const leaveRequest = await leaveRequestService.getLeaveRequestById(id);
      res.status(200).json(leaveRequest);
    } catch (err: any) {
      res.status(400).json({ message: err.message });
    }
  },

  getUserLeaveRequests: async (req: Request, res: Response) => {
    try {
      const user = req.context?.user;
      if (!user || !user.id) return res.status(401).json({ message: "Unauthorized" });

      // Extract pagination parameters from query string
      const page = req.query.page ? parseInt(req.query.page as string, 10) : 1;
      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 5;

      const leaveRequests = await leaveRequestService.getUserLeaveRequests(user.id, page, limit);
      res.status(200).json(leaveRequests);
    } catch (err: any) {
      res.status(400).json({ message: err.message });
    }
  },
};
