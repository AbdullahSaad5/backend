import { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import { complaintService } from "../services/complaint.service";
import { IComplaint } from "@/contracts/complaint.contract";

export const complaintController = {
  createComplaint: async (req: any, res: Response) => {
    try {
      const {
        category,
        title,
        details,
        notes,
        assignedTo,
        dueDate,
        priority
      } = req.body;

      // Basic validation
      if (!category || !title || !details || !dueDate) {
        return res.status(StatusCodes.BAD_REQUEST).json({
          success: false,
          message: "Missing required fields",
          errors: {
            ...(!category && { category: "Category is required" }),
            ...(!title && { title: "Title is required" }),
            ...(!details && { details: "Details are required" }),
            ...(!dueDate && { dueDate: "Due date is required" })
          }
        });
      }

      const newComplaint = await complaintService.createComplaint({
        ...req.body,
        createdBy: req.user._id, // Assuming user is attached to request by auth middleware
        status: "Open",
        attachedFiles: req.files?.map((file: any) => file.path) || [] // Assuming file upload middleware
      });

      res.status(StatusCodes.CREATED).json({
        success: true,
        message: "Complaint created successfully",
        data: newComplaint
      });
    } catch (error) {
      console.error("Error creating complaint:", error);
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: "Failed to create complaint"
      });
    }
  },

  getComplaint: async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const complaint = await complaintService.getComplaintById(id);

      if (!complaint) {
        return res.status(StatusCodes.NOT_FOUND).json({
          success: false,
          message: "Complaint not found"
        });
      }

      res.status(StatusCodes.OK).json({
        success: true,
        data: complaint
      });
    } catch (error) {
      console.error("Error fetching complaint:", error);
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: "Failed to fetch complaint"
      });
    }
  },

  getAllComplaints: async (req: any, res: Response) => {
    try {
      const {
        status,
        priority,
        category,
        assignedTo,
        fromDate,
        toDate
      } = req.query;

      // Only allow admins/managers to filter by assignedTo
      const canFilterByAssignment = req.user.role === "admin" || req.user.role === "manager";

      const complaints = await complaintService.getAllComplaints({
        ...(status && { status: status as IComplaint["status"] }),
        ...(priority && { priority: priority as IComplaint["priority"] }),
        ...(category && { category: category as string }),
        ...(canFilterByAssignment && assignedTo && { assignedTo: assignedTo as string }),
        ...(!canFilterByAssignment && { $or: [
          { createdBy: req.user._id },
          { assignedTo: req.user._id }
        ]}),
        ...(fromDate && { fromDate: new Date(fromDate as string) }),
        ...(toDate && { toDate: new Date(toDate as string) })
      });

      res.status(StatusCodes.OK).json({
        success: true,
        count: complaints.length,
        data: complaints
      });
    } catch (error) {
      console.error("Error fetching complaints:", error);
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: "Failed to fetch complaints"
      });
    }
  },

  updateComplaint: async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const updateData = req.body;

      // Prevent certain fields from being updated directly
      delete updateData.status;
      delete updateData.resolution;
      delete updateData.createdBy;

      const updatedComplaint = await complaintService.updateComplaint(id, updateData);

      if (!updatedComplaint) {
        return res.status(StatusCodes.NOT_FOUND).json({
          success: false,
          message: "Complaint not found"
        });
      }

      res.status(StatusCodes.OK).json({
        success: true,
        message: "Complaint updated successfully",
        data: updatedComplaint
      });
    } catch (error) {
      console.error("Error updating complaint:", error);
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: "Failed to update complaint"
      });
    }
  },

  deleteComplaint: async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const deletedComplaint = await complaintService.deleteComplaint(id);

      if (!deletedComplaint) {
        return res.status(StatusCodes.NOT_FOUND).json({
          success: false,
          message: "Complaint not found"
        });
      }

      res.status(StatusCodes.OK).json({
        success: true,
        message: "Complaint deleted successfully",
        data: deletedComplaint
      });
    } catch (error) {
      console.error("Error deleting complaint:", error);
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: "Failed to delete complaint"
      });
    }
  },

  addFiles: async (req: any, res: Response) => {
    try {
      const { id } = req.params;
      const files = req.files?.map((file: any) => file.path) || [];

      if (files.length === 0) {
        return res.status(StatusCodes.BAD_REQUEST).json({
          success: false,
          message: "No files were uploaded"
        });
      }

      const updatedComplaint = await complaintService.addFilesToComplaint(id, files);

      if (!updatedComplaint) {
        return res.status(StatusCodes.NOT_FOUND).json({
          success: false,
          message: "Complaint not found"
        });
      }

      res.status(StatusCodes.OK).json({
        success: true,
        message: "Files added to complaint successfully",
        data: updatedComplaint
      });
    } catch (error) {
      console.error("Error adding files to complaint:", error);
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: "Failed to add files to complaint"
      });
    }
  },

  resolveComplaint: async (req: any, res: Response) => {
    try {
      const { id } = req.params;
      const { description } = req.body;

      if (!description) {
        return res.status(StatusCodes.BAD_REQUEST).json({
          success: false,
          message: "Resolution description is required"
        });
      }

      const resolvedComplaint = await complaintService.resolveComplaint(id, {
        description,
        resolvedBy: req.user._id
      });

      if (!resolvedComplaint) {
        return res.status(StatusCodes.NOT_FOUND).json({
          success: false,
          message: "Complaint not found"
        });
      }

      res.status(StatusCodes.OK).json({
        success: true,
        message: "Complaint resolved successfully",
        data: resolvedComplaint
      });
    } catch (error) {
      console.error("Error resolving complaint:", error);
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: "Failed to resolve complaint"
      });
    }
  }
};