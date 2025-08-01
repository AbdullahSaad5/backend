import { Request, Response } from "express";
import { featuredCategoryService } from "@/services/featured-category.service";
import { StatusCodes } from "http-status-codes";

export const featuredCategoryController = {
  // Create a new featured category
  createCategory: async (req: Request, res: Response) => {
    try {
      let categoryData = { ...req.body };
      if (req.file && (req.file as any).location) {
        categoryData.imageUrl = (req.file as any).location;
      }
      const category = await featuredCategoryService.createCategory(categoryData);
      return res.status(StatusCodes.CREATED).json({
        success: true,
        message: "Featured category created successfully",
        data: category,
      });
    } catch (error) {
      return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: "Failed to create featured category",
        data: null,
      });
    }
  },

  // Get all featured categories
  getCategories: async (_req: Request, res: Response) => {
    try {
      const categories = await featuredCategoryService.getCategories();
      return res.status(StatusCodes.OK).json({
        success: true,
        data: categories,
      });
    } catch (error) {
      return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: "Failed to fetch featured categories",
        data: null,
      });
    }
  },

  // Update a featured category
  updateCategory: async (req: Request, res: Response) => {
    try {
      let updateData = { ...req.body };
      if (req.file && (req.file as any).location) {
        updateData.imageUrl = (req.file as any).location;
      }
      const category = await featuredCategoryService.updateCategory(req.params.id, updateData);
      return res.status(StatusCodes.OK).json({
        success: true,
        message: "Featured category updated successfully",
        data: category,
      });
    } catch (error) {
      return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: "Failed to update featured category",
        data: null,
      });
    }
  },

  // Update status only
  updateStatus: async (req: Request, res: Response) => {
    try {
      const { status } = req.body;
      
      if (!status || !["active", "inactive"].includes(status)) {
        return res.status(StatusCodes.BAD_REQUEST).json({
          success: false,
          message: "Status must be either 'active' or 'inactive'",
        });
      }

      const category = await featuredCategoryService.updateCategory(req.params.id, { status });
      
      if (!category) {
        return res.status(StatusCodes.NOT_FOUND).json({
          success: false,
          message: "Featured category not found",
        });
      }

      return res.status(StatusCodes.OK).json({
        success: true,
        message: "Featured category status updated successfully",
        data: category,
      });
    } catch (error) {
      return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: "Failed to update featured category status",
        data: null,
      });
    }
  },

  // Delete a featured category
  deleteCategory: async (req: Request, res: Response) => {
    try {
      const deleted = await featuredCategoryService.deleteCategory(req.params.id);
      return res.status(StatusCodes.OK).json({
        success: deleted,
        message: deleted ? "Featured category deleted successfully" : "Category not found",
      });
    } catch (error) {
      return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: "Failed to delete featured category",
      });
    }
  },
};
