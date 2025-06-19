import { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import { guideService } from "@/services/guide.service";

export const guideController = {
  createGuide: async (req: Request, res: Response) => {
    try {
      const { title, description, category, content } = req.body;

      // Validation
      if (!title || !description || !category || !content) {
        return res.status(StatusCodes.BAD_REQUEST).json({
          success: false,
          message: "Missing required fields",
          errors: {
            ...(!title && { title: "Title is required" }),
            ...(!description && { description: "Description is required" }),
            ...(!category && { category: "Category is required" }),
            ...(!content && { content: "Content is required" }),
          },
        });
      }

      const newGuide = await guideService.createGuide({
        title,
        description,
        category,
        content,
      });

      res.status(StatusCodes.CREATED).json({
        success: true,
        message: "Guide created successfully",
        data: newGuide,
      });
    } catch (error) {
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
      const { category, isBlocked, search } = req.query;

      const guides = await guideService.getAllGuides({
        ...(category && { category: category as string }),
        ...(isBlocked !== undefined && { isBlocked: isBlocked === 'true' }),
        ...(search && { search: search as string }),
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
    } catch (error) {
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

  toggleBlockStatus: async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const updatedGuide = await guideService.toggleBlockStatus(id);

      if (!updatedGuide) {
        return res.status(StatusCodes.NOT_FOUND).json({
          success: false,
          message: "Guide not found",
        });
      }

      res.status(StatusCodes.OK).json({
        success: true,
        message: `Guide ${updatedGuide.isBlocked ? 'blocked' : 'unblocked'} successfully`,
        data: updatedGuide,
      });
    } catch (error) {
      console.error("Error toggling guide block status:", error);
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: "Failed to toggle guide block status",
      });
    }
  },
};