import { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import { complaintService } from "@/services/complaint.service";

export const complaintCategoryController = {
  /**
   * @desc    Create a new complaint category
   * @route   POST /api/complaint-categories
   * @access  Private/Admin
   */
  createComplaintCategory: async (req: Request, res: Response) => {
    try {
      const { title, description, image } = req.body;
      
      if (!title || !description) {
        return res.status(StatusCodes.BAD_REQUEST).json({
          success: false,
          message: "Title and description are required fields"
        });
      }

      const newCategory = await complaintService.createComplaint(
        title,
        description,
        image,
      );

      res.status(StatusCodes.CREATED).json({ 
        success: true, 
        message: "Complaint category created successfully", 
        data: newCategory 
      });
    } catch (error: any) {
      if (error.name === "MongoServerError" && error.code === 11000) {
        const field = Object.keys(error.keyPattern)[0];
        res.status(StatusCodes.BAD_REQUEST).json({
          success: false,
          message: `The ${field} must be unique. "${req.body[field]}" is already in use.`,
        });
      } else {
        console.error("Error creating complaint category:", error);
        res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ 
          success: false,
          message: "Error creating complaint category" 
        });
      }
    }
  },

  /**
   * @desc    Update a complaint category
   * @route   PUT /api/complaint-categories/:id
   * @access  Private/Admin
   */
  updateComplaintCategory: async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { title, description, image, isBlocked } = req.body;

      if (!id) {
        return res.status(StatusCodes.BAD_REQUEST).json({
          success: false,
          message: "Category ID is required"
        });
      }

      const updateData: {
        title?: string;
        description?: string;
        image?: string;
        isBlocked?: boolean;
      } = {};

      if (title) updateData.title = title;
      if (description) updateData.description = description;
      if (image) updateData.image = image;
      if (typeof isBlocked !== 'undefined') updateData.isBlocked = isBlocked;

      const updatedCategory = await complaintService.editComplaint(id, updateData);

      if (!updatedCategory) {
        return res.status(StatusCodes.NOT_FOUND).json({
          success: false,
          message: "Complaint category not found"
        });
      }

      res.status(StatusCodes.OK).json({ 
        success: true, 
        message: "Complaint category updated successfully", 
        data: updatedCategory 
      });
    } catch (error: any) {
      if (error.name === "MongoServerError" && error.code === 11000) {
        const field = Object.keys(error.keyPattern)[0];
        res.status(StatusCodes.BAD_REQUEST).json({
          success: false,
          message: `The ${field} must be unique. "${req.body[field]}" is already in use.`,
        });
      } else {
        console.error("Error updating complaint category:", error);
        res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ 
          success: false,
          message: "Error updating complaint category" 
        });
      }
    }
  },

  /**
   * @desc    Delete a complaint category
   * @route   DELETE /api/complaint-categories/:id
   * @access  Private/Admin
   */
  deleteComplaintCategory: async (req: Request, res: Response) => {
    try {
      const { id } = req.params;

      if (!id) {
        return res.status(StatusCodes.BAD_REQUEST).json({
          success: false,
          message: "Category ID is required"
        });
      }

      const deletedCategory = await complaintService.deleteComplaint(id);

      if (!deletedCategory) {
        return res.status(StatusCodes.NOT_FOUND).json({
          success: false,
          message: "Complaint category not found"
        });
      }

      res.status(StatusCodes.OK).json({ 
        success: true, 
        message: "Complaint category deleted successfully", 
        data: deletedCategory 
      });
    } catch (error) {
      console.error("Error deleting complaint category:", error);
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ 
        success: false,
        message: "Error deleting complaint category" 
      });
    }
  },

  /**
   * @desc    Get all complaint categories
   * @route   GET /api/complaint-categories
   * @access  Public
   */
  getAllComplaintCategories: async (req: Request, res: Response) => {
    try {
      const { isBlocked } = req.query;
      
      const filter: { isBlocked?: boolean } = {};
      if (isBlocked !== undefined) {
        filter.isBlocked = isBlocked === 'true';
      }

      const categories = await complaintService.getAllComplaint();

      res.status(StatusCodes.OK).json({ 
        success: true, 
        count: categories.length,
        data: categories 
      });
    } catch (error) {
      console.error("Error getting complaint categories:", error);
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ 
        success: false,
        message: "Error getting complaint categories" 
      });
    }
  },

  /**
   * @desc    Get single complaint category by ID
   * @route   GET /api/complaint-categories/:id
   * @access  Public
   */
  getComplaintCategoryById: async (req: Request, res: Response) => {
    try {
      const { id } = req.params;

      if (!id) {
        return res.status(StatusCodes.BAD_REQUEST).json({
          success: false,
          message: "Category ID is required"
        });
      }

      const category = await complaintService.getById(id);

      if (!category) {
        return res.status(StatusCodes.NOT_FOUND).json({
          success: false,
          message: "Complaint category not found"
        });
      }

      res.status(StatusCodes.OK).json({ 
        success: true, 
        data: category 
      });
    } catch (error) {
      console.error("Error getting complaint category:", error);
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ 
        success: false,
        message: "Error getting complaint category" 
      });
    }
  },
};