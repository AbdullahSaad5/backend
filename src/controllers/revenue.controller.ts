// src/controllers/revenue.controller.ts
import { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import { RevenueService } from "@/services/revenue.service";

export const RevenueController = {
  /**
   * @desc    Create a new Revenue record
   * @route   POST /api/revenues
   * @access  Private/Admin
   */
  createRevenue: async (req: Request, res: Response) => {
    try {
      const { description, amount, source, receiveType, date, image } = req.body;
      
      if (!description || amount === undefined || !source || !receiveType || !image) {
        return res.status(StatusCodes.BAD_REQUEST).json({
          success: false,
          message: "Description, Amount, Source, Receive Type and Revenue Receipt are required fields"
        });
      }

      if (amount < 0) {
        return res.status(StatusCodes.BAD_REQUEST).json({
          success: false,
          message: "Amount cannot be negative"
        });
      }

      const newRevenue = await RevenueService.createRevenue(
        description,
        amount,
        source,
        receiveType,
        date ? new Date(date) : new Date(),
        image,
      );

      res.status(StatusCodes.CREATED).json({ 
        success: true, 
        message: "Revenue record created successfully", 
        data: newRevenue 
      });
    } catch (error) {
      console.error("Error creating Revenue record:", error);
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ 
        success: false,
        message: "Error creating Revenue record" 
      });
    }
  },

  /**
   * @desc    Update a Revenue record
   * @route   PUT /api/revenues/:id
   * @access  Private/Admin
   */
  updateRevenue: async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { description, amount, source, receiveType, date, image, isBlocked } = req.body;

      if (!id) {
        return res.status(StatusCodes.BAD_REQUEST).json({
          success: false,
          message: "Revenue ID is required"
        });
      }

      const updateData: {
        description?: string;
        amount?: number;
        source?: string;
        receiveType?: string;
        date?: Date;
        image?: string;
        isBlocked?: boolean;
      } = {};

      if (description) updateData.description = description;
      if (amount !== undefined) {
        if (amount < 0) {
          return res.status(StatusCodes.BAD_REQUEST).json({
            success: false,
            message: "Amount cannot be negative"
          });
        }
        updateData.amount = amount;
      }
      if (source) updateData.source = source;
      if (receiveType) updateData.receiveType = receiveType;
      if (date) updateData.date = new Date(date);
      if (image) updateData.image = image
      if (typeof isBlocked !== 'undefined') updateData.isBlocked = isBlocked;

      const updatedRevenue = await RevenueService.editRevenue(id, updateData);

      if (!updatedRevenue) {
        return res.status(StatusCodes.NOT_FOUND).json({
          success: false,
          message: "Revenue record not found"
        });
      }

      res.status(StatusCodes.OK).json({ 
        success: true, 
        message: "Revenue record updated successfully", 
        data: updatedRevenue 
      });
    } catch (error) {
      console.error("Error updating Revenue record:", error);
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ 
        success: false,
        message: "Error updating Revenue record" 
      });
    }
  },

  /**
   * @desc    Delete a Revenue record
   * @route   DELETE /api/revenues/:id
   * @access  Private/Admin
   */
  deleteRevenue: async (req: Request, res: Response) => {
    try {
      const { id } = req.params;

      if (!id) {
        return res.status(StatusCodes.BAD_REQUEST).json({
          success: false,
          message: "Revenue ID is required"
        });
      }

      const deletedRevenue = await RevenueService.deleteRevenue(id);

      if (!deletedRevenue) {
        return res.status(StatusCodes.NOT_FOUND).json({
          success: false,
          message: "Revenue record not found"
        });
      }

      res.status(StatusCodes.OK).json({ 
        success: true, 
        message: "Revenue record deleted successfully", 
        data: deletedRevenue 
      });
    } catch (error) {
      console.error("Error deleting Revenue record:", error);
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ 
        success: false,
        message: "Error deleting Revenue record" 
      });
    }
  },

  /**
   * @desc    Get all Revenue records
   * @route   GET /api/revenues
   * @access  Public
   */
  getAllRevenues: async (req: Request, res: Response) => {
    try {
      const { isBlocked, source, startDate, endDate } = req.query;
      
      let revenues;
      
      if (startDate || endDate) {
        const start = startDate ? new Date(startDate as string) : new Date(0);
        const end = endDate ? new Date(endDate as string) : new Date();
        
        revenues = await RevenueService.getRevenuesByDateRange(
          start,
          end,
          source as string | undefined
        );
      } else {
        const filter: { isBlocked?: boolean; source?: string } = {};
        if (isBlocked !== undefined) {
          filter.isBlocked = isBlocked === 'true';
        }
        if (source) {
          filter.source = source as string;
        }
        
        revenues = await RevenueService.getAllRevenues(filter);
      }

      res.status(StatusCodes.OK).json({ 
        success: true, 
        count: revenues.length,
        data: revenues 
      });
    } catch (error) {
      console.error("Error getting Revenue records:", error);
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ 
        success: false,
        message: "Error getting Revenue records" 
      });
    }
  },

  /**
   * @desc    Get single Revenue record by ID
   * @route   GET /api/revenues/:id
   * @access  Public
   */
  getRevenueById: async (req: Request, res: Response) => {
    try {
      const { id } = req.params;

      if (!id) {
        return res.status(StatusCodes.BAD_REQUEST).json({
          success: false,
          message: "Revenue ID is required"
        });
      }

      const revenue = await RevenueService.getRevenueById(id);

      if (!revenue) {
        return res.status(StatusCodes.NOT_FOUND).json({
          success: false,
          message: "Revenue record not found"
        });
      }

      res.status(StatusCodes.OK).json({ 
        success: true, 
        data: revenue 
      });
    } catch (error) {
      console.error("Error getting Revenue record:", error);
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ 
        success: false,
        message: "Error getting Revenue record" 
      });
    }
  },
};