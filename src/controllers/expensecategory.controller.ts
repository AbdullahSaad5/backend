import { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import { ExpenseCategoryService } from "@/services/expensecategory.service";

export const ExpenseCategoryController = {
  /**
   * @desc    Create a new Expense category
   * @route   POST /api/Expense-categories
   * @access  Private/Admin
   */
  createExpenseCategory: async (req: Request, res: Response) => {
    try {
      const { title, description, image, isSystemGenerated } = req.body;
      
      if (!title || !description) {
        return res.status(StatusCodes.BAD_REQUEST).json({
          success: false,
          message: "Title and description are required fields"
        });
      }

      const newCategory = await ExpenseCategoryService.createExpensecategory(
        title,
        description,
        image,
        isSystemGenerated
      );

      res.status(StatusCodes.CREATED).json({ 
        success: true, 
        message: "Expense category created successfully", 
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
        console.error("Error creating Expense category:", error);
        res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ 
          success: false,
          message: "Error creating Expense category" 
        });
      }
    }
  },

  /**
   * @desc    Update a Expense category
   * @route   PUT /api/Expense-categories/:id
   * @access  Private/Admin
   */
  updateExpenseCategory: async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { title, description, image, isSystemGenerated,  isBlocked } = req.body;

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
        isSystemGenerated?: boolean;
        isBlocked?: boolean;
      } = {};

      if (title) updateData.title = title;
      if (description) updateData.description = description;
      if (image) updateData.image = image;
      if (typeof isSystemGenerated !== 'undefined') updateData.isSystemGenerated = isSystemGenerated;
      if (typeof isBlocked !== 'undefined') updateData.isBlocked = isBlocked;

      const updatedCategory = await ExpenseCategoryService.editExpensecategory(id, updateData);

      if (!updatedCategory) {
        return res.status(StatusCodes.NOT_FOUND).json({
          success: false,
          message: "Expense category not found"
        });
      }

      res.status(StatusCodes.OK).json({ 
        success: true, 
        message: "Expense category updated successfully", 
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
        console.error("Error updating Expense category:", error);
        res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ 
          success: false,
          message: "Error updating Expense category" 
        });
      }
    }
  },

  /**
   * @desc    Delete a Expense category
   * @route   DELETE /api/Expense-categories/:id
   * @access  Private/Admin
   */
  deleteExpenseCategory: async (req: Request, res: Response) => {
    try {
      const { id } = req.params;

      if (!id) {
        return res.status(StatusCodes.BAD_REQUEST).json({
          success: false,
          message: "Category ID is required"
        });
      }

      const deletedCategory = await ExpenseCategoryService.deleteExpensecategory(id);

      if (!deletedCategory) {
        return res.status(StatusCodes.NOT_FOUND).json({
          success: false,
          message: "Expense category not found"
        });
      }

      res.status(StatusCodes.OK).json({ 
        success: true, 
        message: "Expense category deleted successfully", 
        data: deletedCategory 
      });
    } catch (error) {
      console.error("Error deleting Expense category:", error);
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ 
        success: false,
        message: "Error deleting Expense category" 
      });
    }
  },

  /**
   * @desc    Get all Expense categories
   * @route   GET /api/Expense-categories
   * @access  Public
   */
  getAllExpenseCategories: async (req: Request, res: Response) => {
    try {
      const { isBlocked } = req.query;
      
      const filter: { isBlocked?: boolean } = {};
      if (isBlocked !== undefined) {
        filter.isBlocked = isBlocked === 'true';
      }

      const categories = await ExpenseCategoryService.getAllExpensecategory();

      res.status(StatusCodes.OK).json({ 
        success: true, 
        count: categories.length,
        data: categories 
      });
    } catch (error) {
      console.error("Error getting Expense categories:", error);
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ 
        success: false,
        message: "Error getting Expense categories" 
      });
    }
  },

  /**
   * @desc    Search Expense categories with pagination and filters
   * @route   GET /api/Expense-categories/search
   * @access  Public
   */
  searchExpenseCategories: async (req: Request, res: Response) => {
    try {
      const { 
        searchQuery, 
        isBlocked, 
        isSystemGenerated, 
        page = 1, 
        limit = 10 
      } = req.query;

      // Parse and validate parameters
      const parsedPage = parseInt(page as string) || 1;
      const parsedLimit = parseInt(limit as string) || 10;
      const parsedIsBlocked = isBlocked !== undefined ? isBlocked === 'true' : undefined;
      const parsedIsSystemGenerated = isSystemGenerated !== undefined ? isSystemGenerated === 'true' : undefined;

      // Validate pagination parameters
      if (parsedPage < 1) {
        return res.status(StatusCodes.BAD_REQUEST).json({
          success: false,
          message: "Page must be greater than 0"
        });
      }

      if (parsedLimit < 1 || parsedLimit > 100) {
        return res.status(StatusCodes.BAD_REQUEST).json({
          success: false,
          message: "Limit must be between 1 and 100"
        });
      }

      const result = await ExpenseCategoryService.searchExpenseCategories({
        searchQuery: searchQuery as string,
        isBlocked: parsedIsBlocked,
        isSystemGenerated: parsedIsSystemGenerated,
        page: parsedPage,
        limit: parsedLimit
      });

      res.status(StatusCodes.OK).json({ 
        success: true, 
        data: result
      });
    } catch (error) {
      console.error("Error searching Expense categories:", error);
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ 
        success: false,
        message: "Error searching Expense categories" 
      });
    }
  },

  /**
   * @desc    Get single Expense category by ID
   * @route   GET /api/Expense-categories/:id
   * @access  Public
   */
  getExpenseCategoryById: async (req: Request, res: Response) => {
    try {
      const { id } = req.params;

      if (!id) {
        return res.status(StatusCodes.BAD_REQUEST).json({
          success: false,
          message: "Category ID is required"
        });
      }

      const category = await ExpenseCategoryService.getById(id);

      if (!category) {
        return res.status(StatusCodes.NOT_FOUND).json({
          success: false,
          message: "Expense category not found"
        });
      }

      res.status(StatusCodes.OK).json({ 
        success: true, 
        data: category 
      });
    } catch (error) {
      console.error("Error getting Expense category:", error);
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ 
        success: false,
        message: "Error getting Expense category" 
      });
    }
  },
};