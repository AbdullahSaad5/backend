import { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import { GuidesCategoryService } from "@/services/guidescategory.service";

export const GuidesCategoryController = {
  /**
   * @desc    Create a new Guides category
   * @route   POST /api/guides-categories
   * @access  Private/Admin
   */
  createGuidesCategory: async (req: Request, res: Response) => {
    try {
      const { title, description, image } = req.body;

      if (!title || !description) {
        return res.status(StatusCodes.BAD_REQUEST).json({
          success: false,
          message: "Title and description are required fields",
        });
      }

      const newCategory = await GuidesCategoryService.createGuidesCategory(
        title,
        description,
        image
      );

      res.status(StatusCodes.CREATED).json({
        success: true,
        message: "Guides category created successfully",
        data: newCategory,
      });
    } catch (error: any) {
      if (error.name === "MongoServerError" && error.code === 11000) {
        const field = Object.keys(error.keyPattern)[0];
        res.status(StatusCodes.BAD_REQUEST).json({
          success: false,
          message: `The ${field} must be unique. "${req.body[field]}" is already in use.`,
        });
      } else {
        console.error("Error creating Guides category:", error);
        res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
          success: false,
          message: "Error creating Guides category",
        });
      }
    }
  },

  /**
   * @desc    Update a Guides category
   * @route   PUT /api/guides-categories/:id
   * @access  Private/Admin
   */
  updateGuidesCategory: async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { title, description, image, isBlocked } = req.body;

      if (!id) {
        return res.status(StatusCodes.BAD_REQUEST).json({
          success: false,
          message: "Category ID is required",
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
      if (typeof isBlocked !== "undefined") updateData.isBlocked = isBlocked;

      const updatedCategory = await GuidesCategoryService.editGuidesCategory(
        id,
        updateData
      );

      if (!updatedCategory) {
        return res.status(StatusCodes.NOT_FOUND).json({
          success: false,
          message: "Guides category not found",
        });
      }

      res.status(StatusCodes.OK).json({
        success: true,
        message: "Guides category updated successfully",
        data: updatedCategory,
      });
    } catch (error: any) {
      if (error.name === "MongoServerError" && error.code === 11000) {
        const field = Object.keys(error.keyPattern)[0];
        res.status(StatusCodes.BAD_REQUEST).json({
          success: false,
          message: `The ${field} must be unique. "${req.body[field]}" is already in use.`,
        });
      } else {
        console.error("Error updating Guides category:", error);
        res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
          success: false,
          message: "Error updating Guides category",
        });
      }
    }
  },

  /**
   * @desc    Delete a Guides category
   * @route   DELETE /api/guides-categories/:id
   * @access  Private/Admin
   */
  deleteGuidesCategory: async (req: Request, res: Response) => {
    try {
      const { id } = req.params;

      if (!id) {
        return res.status(StatusCodes.BAD_REQUEST).json({
          success: false,
          message: "Category ID is required",
        });
      }

      const deletedCategory =
        await GuidesCategoryService.deleteGuidesCategory(id);

      if (!deletedCategory) {
        return res.status(StatusCodes.NOT_FOUND).json({
          success: false,
          message: "Guides category not found",
        });
      }

      res.status(StatusCodes.OK).json({
        success: true,
        message: "Guides category deleted successfully",
        data: deletedCategory,
      });
    } catch (error) {
      console.error("Error deleting Guides category:", error);
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: "Error deleting Guides category",
      });
    }
  },

  /**
   * @desc    Get all Guides categories
   * @route   GET /api/guides-categories
   * @access  Public
   */
  getAllGuidesCategories: async (req: Request, res: Response) => {
    try {
      const { category, search, isBlocked, page = 1, limit = 10 } = req.query;

      // const filter: { isBlocked?: boolean } = {};
      // if (isBlocked !== undefined) {
      //   filter.isBlocked = isBlocked === "true";
      // }
      const pageNum = Number(page) || 1;
      const limitNum = Number(limit) || 10;
      const skip = (pageNum - 1) * limitNum;

      const { categories, totalCount } =
        await GuidesCategoryService.getAllGuidesCategories(
          {
            ...(category && { category: category as string }),
            ...(search && { search: search as string }),
            ...(isBlocked !== undefined && { isBlocked: isBlocked === "true" }),
          },
          limitNum,
          skip
        );

      res.status(StatusCodes.OK).json({
        success: true,
        count: totalCount,
        currentPage: pageNum,
        totalPages: Math.ceil(totalCount / limitNum),
        limit: limitNum,
        data: categories,
      });
    } catch (error) {
      console.error("Error getting Guides categories:", error);
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: "Error getting Guides categories",
      });
    }
  },

  /**
   * @desc    Get single Guides category by ID
   * @route   GET /api/guides-categories/:id
   * @access  Public
   */
  getGuidesCategoryById: async (req: Request, res: Response) => {
    try {
      const { id } = req.params;

      if (!id) {
        return res.status(StatusCodes.BAD_REQUEST).json({
          success: false,
          message: "Category ID is required",
        });
      }

      const category = await GuidesCategoryService.getById(id);

      if (!category) {
        return res.status(StatusCodes.NOT_FOUND).json({
          success: false,
          message: "Guides category not found",
        });
      }

      res.status(StatusCodes.OK).json({
        success: true,
        data: category,
      });
    } catch (error) {
      console.error("Error getting Guides category:", error);
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: "Error getting Guides category",
      });
    }
  },
};
