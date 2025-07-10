import { Request, Response } from "express";
import { leaveRequestService } from "@/services/leave-request.service";

export const leaveRequestController = {
  // User: create leave request
  createLeaveRequest: async (req: Request, res: Response) => {
    try {
      const user = req.context?.user;
      if (!user || !user.id)
        return res.status(401).json({ message: "Unauthorized" });
      const { date, reason } = req.body;
      if (!date || !reason)
        return res
          .status(400)
          .json({ message: "Date and reason are required" });
      const leaveRequest = await leaveRequestService.createLeaveRequest(
        user.id,
        new Date(date),
        reason
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
      const { status } = req.body;
      if (!id || !status || !["approved", "rejected"].includes(status)) {
        return res.status(400).json({ message: "Invalid request" });
      }
      const leaveRequest = await leaveRequestService.updateLeaveRequestStatus(
        id,
        status
      );
      res.status(200).json(leaveRequest);
    } catch (err: any) {
      res.status(400).json({ message: err.message });
    }
  },

  // Admin: get all leave requests
  getAllLeaveRequests: async (req: Request, res: Response) => {
    try {
      console.log("getAllLeaveRequests", req);
      const leaveRequests = await leaveRequestService.getLeaveRequests();
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
    console.log("getUserLeaveRequests", req);
    try {
      const user = req.context?.user;
      if (!user || !user.id)
        return res.status(401).json({ message: "Unauthorized" });
      const leaveRequests = await leaveRequestService.getUserLeaveRequests(
        user.id
      );
      res.status(200).json(leaveRequests);
    } catch (err: any) {
      res.status(400).json({ message: err.message });
    }
  },
};
