
import { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import { FaqCategoryService } from "@/services/faqcategory.service";

export const FaqCategoryController = {
  /**
   * @desc    Create a new FAQ category
   * @route   POST /api/faq-categories
   * @access  Private/Admin
   */
  createFaqCategory: async (req: Request, res: Response) => {
    try {
      const { title, description, image } = req.body;
      
      if (!title || !description) {
        return res.status(StatusCodes.BAD_REQUEST).json({
          success: false,
          message: "Title and description are required fields"
        });
      }

      const newCategory = await FaqCategoryService.createFaqCategory(
        title,
        description,
        image,
      );

      res.status(StatusCodes.CREATED).json({ 
        success: true, 
        message: "FAQ category created successfully", 
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
        console.error("Error creating FAQ category:", error);
        res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ 
          success: false,
          message: "Error creating FAQ category" 
        });
      }
    }
  },

  /**
   * @desc    Update a FAQ category
   * @route   PUT /api/faq-categories/:id
   * @access  Private/Admin
   */
  updateFaqCategory: async (req: Request, res: Response) => {
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

      const updatedCategory = await FaqCategoryService.editFaqCategory(id, updateData);

      if (!updatedCategory) {
        return res.status(StatusCodes.NOT_FOUND).json({
          success: false,
          message: "FAQ category not found"
        });
      }

      res.status(StatusCodes.OK).json({ 
        success: true, 
        message: "FAQ category updated successfully", 
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
        console.error("Error updating FAQ category:", error);
        res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ 
          success: false,
          message: "Error updating FAQ category" 
        });
      }
    }
  },

  /**
   * @desc    Delete a FAQ category
   * @route   DELETE /api/faq-categories/:id
   * @access  Private/Admin
   */
  deleteFaqCategory: async (req: Request, res: Response) => {
    try {
      const { id } = req.params;

      if (!id) {
        return res.status(StatusCodes.BAD_REQUEST).json({
          success: false,
          message: "Category ID is required"
        });
      }

      const deletedCategory = await FaqCategoryService.deleteFaqCategory(id);

      if (!deletedCategory) {
        return res.status(StatusCodes.NOT_FOUND).json({
          success: false,
          message: "FAQ category not found"
        });
      }

      res.status(StatusCodes.OK).json({ 
        success: true, 
        message: "FAQ category deleted successfully", 
        data: deletedCategory 
      });
    } catch (error) {
      console.error("Error deleting FAQ category:", error);
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ 
        success: false,
        message: "Error deleting FAQ category" 
      });
    }
  },

  /**
   * @desc    Get all FAQ categories
   * @route   GET /api/faq-categories
   * @access  Public
   */
  getAllFaqCategories: async (req: Request, res: Response) => {
    try {
      const { isBlocked } = req.query;
      
      const filter: { isBlocked?: boolean } = {};
      if (isBlocked !== undefined) {
        filter.isBlocked = isBlocked === 'true';
      }

      const categories = await FaqCategoryService.getAllFaqCategories();

      res.status(StatusCodes.OK).json({ 
        success: true, 
        count: categories.length,
        data: categories 
      });
    } catch (error) {
      console.error("Error getting FAQ categories:", error);
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ 
        success: false,
        message: "Error getting FAQ categories" 
      });
    }
  },

  /**
   * @desc    Get single FAQ category by ID
   * @route   GET /api/faq-categories/:id
   * @access  Public
   */
  getFaqCategoryById: async (req: Request, res: Response) => {
    try {
      const { id } = req.params;

      if (!id) {
        return res.status(StatusCodes.BAD_REQUEST).json({
          success: false,
          message: "Category ID is required"
        });
      }

      const category = await FaqCategoryService.getById(id);

      if (!category) {
        return res.status(StatusCodes.NOT_FOUND).json({
          success: false,
          message: "FAQ category not found"
        });
      }

      res.status(StatusCodes.OK).json({ 
        success: true, 
        data: category 
      });
    } catch (error) {
      console.error("Error getting FAQ category:", error);
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ 
        success: false,
        message: "Error getting FAQ category" 
      });
    }
  },
};