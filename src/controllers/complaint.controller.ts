import { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import { complaintService } from "../services/complaint.service";
import { IComplaint } from "@/contracts/complaint.contract";
import { jwtVerify } from "@/utils/jwt.util";
import { authService } from "@/services";
import { Types } from "mongoose";

export const complaintController = {
  createComplaint: async (req: any, res: Response) => {
    try {
      const token = req.headers["authorization"]?.split(" ")[1];

      if (!token) {
        return res.status(401).json({ message: "No token provided" });
      }

      const decoded = jwtVerify(token);
      const userId = decoded.id.toString();
      const user = await authService.findUserById(userId);

      if (!user) {
        return res
          .status(StatusCodes.NOT_FOUND)
          .json({ success: false, message: " User not found." });
      }

const complaintdata = {...req.body, userId};
;
      const newComplaint =
        await complaintService.createComplaint(complaintdata);

      res.status(StatusCodes.CREATED).json({
        success: true,
        message: "Complaint created successfully",
        data: newComplaint,
      });
    } catch (error) {
      console.error("Error creating complaint:", error);
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: "Failed to create complaint",
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
          message: "Complaint not found",
        });
      }

      res.status(StatusCodes.OK).json({
        success: true,
        data: complaint,
      });
    } catch (error) {
      console.error("Error fetching complaint:", error);
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: "Failed to fetch complaint",
      });
    }
  },

  getAllComplaints: async (req: Request, res: Response) => {
  try {
    const complaints = await complaintService.getAllComplaints();
    res.status(StatusCodes.OK).json({ 
      success: true, 
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

      // Prevent certain fields from being updated directly
      const updatedComplaint = await complaintService.editComplaint(
        id,
        req.body
      );

      if (!updatedComplaint) {
        return res.status(StatusCodes.NOT_FOUND).json({
          success: false,
          message: "Complaint not found",
        });
      }

      res.status(StatusCodes.OK).json({
        success: true,
        message: "Complaint updated successfully",
        data: updatedComplaint,
      });
    } catch (error) {
      console.error("Error updating complaint:", error);
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: "Failed to update complaint",
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
          message: "Complaint not found",
        });
      }

      res.status(StatusCodes.OK).json({
        success: true,
        message: "Complaint deleted successfully",
        data: deletedComplaint,
      });
    } catch (error) {
      console.error("Error deleting complaint:", error);
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: "Failed to delete complaint",
      });
    }
  },
  addFiles: async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { newFileLinks } = req.body; // Array of new Firebase URLs
  
      const updatedComplaint = await complaintService.addFilesToComplaint(
        id,
        newFileLinks
      );
  
      res.status(200).json({
        success: true,
        data: updatedComplaint,
      });
    } catch (error) {
      res.status(500).json({ error: "Failed to add files" });
    }
  },

  toggleticketstatus: async (req: Request, res: Response) => {
    const { id } = req.params;
    const { status } = req.body;

    const allowedStatuses = ["Open", "Assigned", "In Progress", "Closed","Resolved"];

    if (!status || !allowedStatuses.includes(status)) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        success: false,
        message:
          "Status is required and must be one of: Open, Assigned, In Progress, Closed, Resolved",
        allowedStatuses,
      });
    }

    try {
      // Get user ID from token for timeline tracking
      const authHeader = req.headers["authorization"];
      const token = authHeader && authHeader.split(" ")[1];
      let userId: string | undefined;

      if (token && typeof token === "string") {
        try {
          const decoded = jwtVerify(token);
          userId = decoded.id.toString();
        } catch (error) {
          // If token is invalid, continue without user tracking
          console.warn("Invalid token for status change, proceeding without user tracking");
        }
      }

      const result = await complaintService.changeStatus(id, status, userId);

      res.status(StatusCodes.OK).json({
        success: true,
        message: "Status changed successfully",
        data: result,
      });
    } catch (error) {
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: "Something went wrong",
        error: Error,
      });
    }
  },
  toggleprioritystatus: async (req: Request, res: Response) => {
    const { id } = req.params;
    const { priority } = req.body;

    const allowedpriority = ["Low", "Medium", "High", "Urgent"];

    if (!priority || !allowedpriority.includes(priority)) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        success: false,
        message:
          "Status is required and must be one of: Open, In Progress, Closed, Urgent",
        allowedpriority,
      });
    }

    try {
      const result = await complaintService.changePriority(id, priority);

      res.status(StatusCodes.OK).json({
        success: true,
        message: "Status changed successfully",
        data: result,
      });
    } catch (error) {
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: "Something went wrong",
        error: Error,
      });
    }
  },

  resolveComplaint: async (req: any, res: Response) => {
    try {
      const { id } = req.params;
      const { resolvedBy, description, image } = req.body;
  
      // Validate required fields
      if (!description ) {
        return res.status(StatusCodes.BAD_REQUEST).json({
          success: false,
          message: "Resolution description  is required",
        });
      }
  
      if (!resolvedBy) {
        return res.status(StatusCodes.BAD_REQUEST).json({
          success: false,
          message: "ResolvedBy user ID is required",
        });
      }
  
      // Validate description array length
      
  
      const resolutionData = {
        description,
        resolvedBy: new Types.ObjectId(resolvedBy),
        resolvedAt: new Date(),
        ...(image && { image }) // Only include image if provided
      };
  
      const resolvedComplaint = await complaintService.resolveComplaint(id, resolutionData);
  
      if (!resolvedComplaint) {
        return res.status(StatusCodes.NOT_FOUND).json({
          success: false,
          message: "Complaint not found",
        });
      }
  
      res.status(StatusCodes.OK).json({
        success: true,
        message: "Complaint resolved successfully",
        data: resolvedComplaint,
      });
    } catch (error) {
      console.error("Error resolving complaint:", error);
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: "Failed to resolve complaint",
        error: Error,
      });
    }
  },
  noteComplaint: async (req: any, res: Response) => {
    try {
      const { id } = req.params;
      const {notedBy, description, image } = req.body;

      if (!description) {
        return res.status(StatusCodes.BAD_REQUEST).json({
          success: false,
          message: "Resolution description is required",
        });
      }

      const resolvedComplaint = await complaintService.noteComplaint(id, {
        image,
        description,
        notedBy,
      });

      if (!resolvedComplaint) {
        return res.status(StatusCodes.NOT_FOUND).json({
          success: false,
          message: "Complaint not found",
        });
      }

      res.status(StatusCodes.OK).json({
        success: true,
        message: "Complaint resolved successfully",
        data: resolvedComplaint,
      });
    } catch (error) {
      console.error("Error resolving complaint:", error);
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: "Failed to resolve complaint",
      });
    }
  },

  
  addNote: async (req: any, res: Response) => {
    try {
      const { id } = req.params;
      const { notedBy, description, image } = req.body;

      if (!description) {
        return res.status(StatusCodes.BAD_REQUEST).json({
          success: false,
          message: "Note description is required",
        });
      }

      const updatedComplaint = await complaintService.addNoteToComplaint(id, {
        image,
        description,
        notedBy: new Types.ObjectId(notedBy),
      });

      res.status(StatusCodes.OK).json({
        success: true,
        message: "Note added successfully",
        data: updatedComplaint,
      });
    } catch (error) {
      console.error("Error adding note:", error);
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: "Failed to add note",
      });
    }
  },

  deleteNote: async (req: Request, res: Response) => {
    try {
      const { id, noteId } = req.params;
      const updatedComplaint = await complaintService.deleteNoteFromComplaint(
        id,
        noteId
      );

      res.status(StatusCodes.OK).json({
        success: true,
        message: "Note deleted successfully",
        data: updatedComplaint,
      });
    } catch (error) {
      console.error("Error deleting note:", error);
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: "Failed to delete note",
      });
    }
  },

  addResolution: async (req: any, res: Response) => {
    try {
      const { id } = req.params;
      const { resolvedBy, description, image } = req.body;

      if (!description) {
        return res.status(StatusCodes.BAD_REQUEST).json({
          success: false,
          message: "Resolution description is required",
        });
      }

      const updatedComplaint = await complaintService.addResolutionToComplaint(
        id,
        {
          image,
          description,
          resolvedBy: new Types.ObjectId(resolvedBy),
        }
      );

      res.status(StatusCodes.OK).json({
        success: true,
        message: "Resolution added successfully",
        data: updatedComplaint,
      });
    } catch (error) {
      console.error("Error adding resolution:", error);
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: "Failed to add resolution",
      });
    }
  },

  deleteResolution: async (req: Request, res: Response) => {
    try {
      const { id, resolutionId } = req.params;
      const updatedComplaint =
        await complaintService.deleteResolutionFromComplaint(id, resolutionId);

      res.status(StatusCodes.OK).json({
        success: true,
        message: "Resolution deleted successfully",
        data: updatedComplaint,
      });
    } catch (error) {
      console.error("Error deleting resolution:", error);
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: "Failed to delete resolution",
      });
    }
  },

  updateAssignment: async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { assignedTo } = req.body;

      // Get user ID from token for timeline tracking
      const authHeader = req.headers["authorization"];
      const token = authHeader && authHeader.split(" ")[1];
      let userId: string | undefined;

      if (token && typeof token === "string") {
        try {
          const decoded = jwtVerify(token);
          userId = decoded.id.toString();
        } catch (error) {
          // If token is invalid, continue without user tracking
          console.warn("Invalid token for assignment, proceeding without user tracking");
        }
      }

      // Convert string IDs to ObjectId if present
      const assignedToIds = assignedTo ? (Array.isArray(assignedTo) ? assignedTo.map((id: string) => new Types.ObjectId(id)) : [new Types.ObjectId(assignedTo)]) : [];

      const updatedComplaint = await complaintService.updateAssignment(id, assignedToIds, userId);

      res.status(StatusCodes.OK).json({
        success: true,
        message: "Assignment updated successfully",
        data: updatedComplaint,
      });
    } catch (error: any) {
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: "Error updating assignment",
        error: error.message
      });
    }
  }
  
};
