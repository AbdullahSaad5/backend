import { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import { guideService } from "@/services/guide.service";
import { isValidObjectId } from "mongoose";

export const guideController = {
  createGuide: async (req: Request, res: Response) => {
    try {
      const { title, description, type, category, content } = req.body;

      // Validation
      if (!title || !description || !type || !category || !content) {
        return res.status(StatusCodes.BAD_REQUEST).json({
          success: false,
          message: "Missing required fields",
          errors: {
            ...(!title && { title: "Title is required" }),
            ...(!description && { description: "Description is required" }),
            ...(!type && { description: "type is required" }),
            ...(!category && { category: "Category is required" }),
            ...(!content && { content: "Content is required" }),
          },
        });
      }

      // Validate category ID format
      if (!isValidObjectId(category)) {
        return res.status(StatusCodes.BAD_REQUEST).json({
          success: false,
          message: "Invalid category ID format",
        });
      }

      const newGuide = await guideService.createGuide({
        title,
        description,
        type,
        category,
        content,
      });

      res.status(StatusCodes.CREATED).json({
        success: true,
        message: "Guide created successfully",
        data: newGuide,
      });
    } catch (error: any) {
      if (error.name === 'CastError') {
        return res.status(StatusCodes.BAD_REQUEST).json({
          success: false,
          message: "Invalid category ID",
        });
      }
      console.error("Error creating guide:", error);
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: "Failed to create guide",
      });
    }
  },

  getGuide: async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      
      if (!isValidObjectId(id)) {
        return res.status(StatusCodes.BAD_REQUEST).json({
          success: false,
          message: "Invalid guide ID format",
        });
      }

      const guide = await guideService.getGuideById(id);

      if (!guide) {
        return res.status(StatusCodes.NOT_FOUND).json({
          success: false,
          message: "Guide not found",
        });
      }

      res.status(StatusCodes.OK).json({
        success: true,
        data: guide,
      });
    } catch (error) {
      console.error("Error fetching guide:", error);
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: "Failed to fetch guide",
      });
    }
  },

  getAllGuides: async (req: Request, res: Response) => {
    try {
      const { category, search, isBlocked } = req.query;

      // Validate category ID format if provided
      if (category && !isValidObjectId(category as string)) {
        return res.status(StatusCodes.BAD_REQUEST).json({
          success: false,
          message: "Invalid category ID format",
        });
      }

      const guides = await guideService.getAllGuides({
        ...(category && { category: category as string }),
        ...(search && { search: search as string }),
        ...(isBlocked !== undefined && { isBlocked: isBlocked === "true" }),
      });

      res.status(StatusCodes.OK).json({
        success: true,
        count: guides.length,
        data: guides,
      });
    } catch (error) {
      console.error("Error fetching guides:", error);
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: "Failed to fetch guides",
      });
    }
  },

  updateGuide: async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const updateData = req.body;

      if (!isValidObjectId(id)) {
        return res.status(StatusCodes.BAD_REQUEST).json({
          success: false,
          message: "Invalid guide ID format",
        });
      }

      // Validate category ID format if provided in update
      if (updateData.category && !isValidObjectId(updateData.category)) {
        return res.status(StatusCodes.BAD_REQUEST).json({
          success: false,
          message: "Invalid category ID format",
        });
      }

      const updatedGuide = await guideService.updateGuide(id, updateData);

      if (!updatedGuide) {
        return res.status(StatusCodes.NOT_FOUND).json({
          success: false,
          message: "Guide not found",
        });
      }

      res.status(StatusCodes.OK).json({
        success: true,
        message: "Guide updated successfully",
        data: updatedGuide,
      });
    } catch (error: any) {
      if (error.name === 'CastError') {
        return res.status(StatusCodes.BAD_REQUEST).json({
          success: false,
          message: "Invalid ID format",
        });
      }
      console.error("Error updating guide:", error);
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: "Failed to update guide",
      });
    }
  },

  deleteGuide: async (req: Request, res: Response) => {
    try {
      const { id } = req.params;

      if (!isValidObjectId(id)) {
        return res.status(StatusCodes.BAD_REQUEST).json({
          success: false,
          message: "Invalid guide ID format",
        });
      }

      const deletedGuide = await guideService.deleteGuide(id);

      if (!deletedGuide) {
        return res.status(StatusCodes.NOT_FOUND).json({
          success: false,
          message: "Guide not found",
        });
      }

      res.status(StatusCodes.OK).json({
        success: true,
        message: "Guide deleted successfully",
        data: deletedGuide,
      });
    } catch (error) {
      console.error("Error deleting guide:", error);
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: "Failed to delete guide",
      });
    }
  },

  
};