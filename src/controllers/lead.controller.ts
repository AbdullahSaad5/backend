import { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import { LeadService } from "@/services/lead.service";
import { ILead } from "@/contracts/lead.contract";
import { jwtVerify } from "@/utils/jwt.util";
import { authService } from "@/services";
import { Types } from "mongoose";

export const LeadController = {
  createLead: async (req: any, res: Response) => {
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
          .json({ success: false, message: "User not found." });
      }

      const {
        name,
        email,
        phoneNumber,
        source,
        purpose,
        description,
        assignedTo,
        leadCategory,
      } = req.body;

      // Validate required fields
      if (!name || !email || !leadCategory) {
        return res.status(StatusCodes.BAD_REQUEST).json({
          success: false,
          message: "Name, email, and lead category are required",
        });
      }

      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return res.status(StatusCodes.BAD_REQUEST).json({
          success: false,
          message: "Invalid email format",
        });
      }

      const leadData = {
        name,
        email,
        phoneNumber,
        source,
        purpose,
        description,
        assignedTo: assignedTo ? new Types.ObjectId(assignedTo) : undefined,
        leadCategory: new Types.ObjectId(leadCategory),
      };

      const newLead = await LeadService.createLead(leadData);

      res.status(StatusCodes.CREATED).json({
        success: true,
        message: "Lead created successfully",
        data: newLead,
      });
    } catch (error) {
      console.error("Error creating lead:", error);
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: "Failed to create lead",
      });
    }
  },

  getLead: async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const lead = await LeadService.getLeadById(id);

      if (!lead) {
        return res.status(StatusCodes.NOT_FOUND).json({
          success: false,
          message: "Lead not found",
        });
      }

      res.status(StatusCodes.OK).json({
        success: true,
        data: lead,
      });
    } catch (error) {
      console.error("Error fetching lead:", error);
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: "Failed to fetch lead",
      });
    }
  },

  getAllLeads: async (req: Request, res: Response) => {
    try {
      const leads = await LeadService.getAllLeads();
      res.status(StatusCodes.OK).json({
        success: true,
        data: leads,
      });
    } catch (error) {
      console.error("Error fetching leads:", error);
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: "Failed to fetch leads",
      });
    }
  },

  searchAndFilterLead: async (req: Request, res: Response) => {
    try {
      const { searchQuery = "", page = 1, limit = 10 } = req.query;

      const pageNum = Number(page) || 1;
      const limitNum = Number(limit) || 10;
      const skip = (pageNum - 1) * limitNum;

      let filter: any = {};

      if (searchQuery) {
        filter = {
          $or: [
            { name: { $regex: searchQuery as string, $options: "i" } },
            { email: { $regex: searchQuery as string, $options: "i" } },
          ],
        };
      }

      console.log("Running LeadModel.find with:", filter);

      const { leads, total } = await LeadService.searchAndFilterLead(
        limitNum,
        skip,
        filter
      );

      res.status(StatusCodes.OK).json({
        success: true,
        data: leads,
        pagination: {
          currentPage: pageNum,
          totalPages: Math.ceil(total / limitNum),
          totalItems: total,
        },
      });
    } catch (error) {
      console.error("Error in searchAndFilterUsers:", error);
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: "Server error",
      });
    }
  },
  updateLead: async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const updateData = req.body;

      // Convert ObjectId fields if provided
      if (updateData.assignedTo) {
        // updateData.assignedTo = new Types.ObjectId(updateData.assignedTo);
        updateData.assignedTo = updateData.assignedTo.map(
          (id: string) => new Types.ObjectId(id)
        );
      }
      if (updateData.leadCategory) {
        updateData.leadCategory = new Types.ObjectId(updateData.leadCategory);
      }

      const updatedLead = await LeadService.editLead(id, updateData);

      if (!updatedLead) {
        return res.status(StatusCodes.NOT_FOUND).json({
          success: false,
          message: "Lead not found",
        });
      }

      res.status(StatusCodes.OK).json({
        success: true,
        message: "Lead updated successfully",
        data: updatedLead,
      });
    } catch (error) {
      console.error("Error updating lead:", error);
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: "Failed to update lead",
      });
    }
  },

  deleteLead: async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const deletedLead = await LeadService.deleteLead(id);

      if (!deletedLead) {
        return res.status(StatusCodes.NOT_FOUND).json({
          success: false,
          message: "Lead not found",
        });
      }

      res.status(StatusCodes.OK).json({
        success: true,
        message: "Lead deleted successfully",
        data: deletedLead,
      });
    } catch (error) {
      console.error("Error deleting lead:", error);
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: "Failed to delete lead",
      });
    }
  },

  updateLeadStatus: async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { status } = req.body;

            const allowedStatuses = ["new", "Contacted", "Converted", "Lost", "Cold-Lead","Hot-Lead", "Bad-Contact"];

            if (!status || !allowedStatuses.includes(status)) {
                return res.status(StatusCodes.BAD_REQUEST).json({
                    success: false,
                    message: "Status is required and must be one of: new, Contacted, Converted, Lost , Hot Lead, Cold Lead, Bad Contact",
                    allowedStatuses,
                });
            }

      const result = await LeadService.updateLeadStatus(id, status);

      if (!result) {
        return res.status(StatusCodes.NOT_FOUND).json({
          success: false,
          message: "Lead not found",
        });
      }

      res.status(StatusCodes.OK).json({
        success: true,
        message: "Lead status updated successfully",
        data: result,
      });
    } catch (error) {
      console.error("Error updating lead status:", error);
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: "Failed to update lead status",
      });
    }
  },

  getLeadsByStatus: async (req: Request, res: Response) => {
    try {
      const { status } = req.params;
      const leads = await LeadService.getLeadsByStatus(status);

      res.status(StatusCodes.OK).json({
        success: true,
        data: leads,
        message: "Leads retrieved successfully",
      });
    } catch (error) {
      console.error("Error getting leads by status:", error);
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: "Failed to get leads by status",
      });
    }
  },

  getLeadsByCategory: async (req: Request, res: Response) => {
    try {
      const { categoryId } = req.params;
      const leads = await LeadService.getLeadsByCategory(categoryId);

      res.status(StatusCodes.OK).json({
        success: true,
        data: leads,
        message: "Leads retrieved successfully",
      });
    } catch (error) {
      console.error("Error getting leads by category:", error);
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: "Failed to get leads by category",
      });
    }
  },

  getLeadsByAssignedUser: async (req: Request, res: Response) => {
    try {
      const { userId } = req.params;
      const leads = await LeadService.getLeadsByAssignedUser(userId);

      res.status(StatusCodes.OK).json({
        success: true,
        data: leads,
        message: "Leads retrieved successfully",
      });
    } catch (error) {
      console.error("Error getting leads by assigned user:", error);
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: "Failed to get leads by assigned user",
      });
    }
  },
};
