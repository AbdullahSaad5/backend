import { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import { expenseService } from "@/services/expense.service";

export const expenseController = {
  createExpense: async (req: Request, res: Response) => {
    try {
      const {title, description, amount, category, date, image } = req.body;

      // Validation
      if (!title || !description || !amount || !category) {
        return res.status(StatusCodes.BAD_REQUEST).json({
          success: false,
          message: "Missing required fields",
          errors: {
            ...(!title && { title: "Title is required" }),
            ...(!description && { description: "Description is required" }),
            ...(!amount && { amount: "Amount is required" }),
            ...(!category && { category: "Category is required" }),
          },
        });
      }

      if (amount < 0) {
        return res.status(StatusCodes.BAD_REQUEST).json({
          success: false,
          message: "Amount cannot be negative",
        });
      }

      const newExpense = await expenseService.createExpense({
        title,
        description,
        amount,
        category,
        date: date || new Date(),
        image: image || "",
      });

      res.status(StatusCodes.CREATED).json({
        success: true,
        message: "Expense created successfully",
        data: newExpense,
      });
    } catch (error) {
      console.error("Error creating expense:", error);
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: "Failed to create expense",
      });
    }
  },

  getExpense: async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const expense = await expenseService.getExpenseById(id);

      if (!expense) {
        return res.status(StatusCodes.NOT_FOUND).json({
          success: false,
          message: "Expense not found",
        });
      }

      res.status(StatusCodes.OK).json({
        success: true,
        data: expense,
      });
    } catch (error) {
      console.error("Error fetching expense:", error);
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: "Failed to fetch expense",
      });
    }
  },

  getAllExpenses: async (req: Request, res: Response) => {
    try {
      const expenses = await expenseService.getAllExpenses();

      res.status(StatusCodes.OK).json({
        success: true,
        count: expenses.length,
        data: expenses,
      });
    } catch (error) {
      console.error("Error fetching expenses:", error);
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: "Failed to fetch expenses",
      });
    }
  },

  /**
   * @desc    Search expenses with pagination and filters
   * @route   GET /api/expense/search
   * @access  Public
   */
  searchExpenses: async (req: Request, res: Response) => {
    try {
      const { 
        searchQuery, 
        isBlocked, 
        category, 
        expenseType, 
        payrollType, 
        page = 1, 
        limit = 10 
      } = req.query;

      // Parse and validate parameters
      const parsedPage = parseInt(page as string) || 1;
      const parsedLimit = parseInt(limit as string) || 10;
      const parsedIsBlocked = isBlocked !== undefined ? isBlocked === 'true' : undefined;
      const parsedCategory = category as string;
      const parsedExpenseType = expenseType as string;
      const parsedPayrollType = payrollType as string;

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

      const result = await expenseService.searchExpenses({
        searchQuery: searchQuery as string,
        isBlocked: parsedIsBlocked,
        category: parsedCategory,
        expenseType: parsedExpenseType,
        payrollType: parsedPayrollType,
        page: parsedPage,
        limit: parsedLimit
      });

      res.status(StatusCodes.OK).json({ 
        success: true, 
        data: result
      });
    } catch (error) {
      console.error("Error searching expenses:", error);
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ 
        success: false,
        message: "Error searching expenses" 
      });
    }
  },

  updateExpense: async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const updateData = req.body;

      if (updateData.amount && updateData.amount < 0) {
        return res.status(StatusCodes.BAD_REQUEST).json({
          success: false,
          message: "Amount cannot be negative",
        });
      }

      const updatedExpense = await expenseService.updateExpense(id, updateData);

      if (!updatedExpense) {
        return res.status(StatusCodes.NOT_FOUND).json({
          success: false,
          message: "Expense not found",
        });
      }

      res.status(StatusCodes.OK).json({
        success: true,
        message: "Expense updated successfully",
        data: updatedExpense,
      });
    } catch (error) {
      console.error("Error updating expense:", error);
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: "Failed to update expense",
      });
    }
  },

  deleteExpense: async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const deletedExpense = await expenseService.deleteExpense(id);

      if (!deletedExpense) {
        return res.status(StatusCodes.NOT_FOUND).json({
          success: false,
          message: "Expense not found",
        });
      }

      res.status(StatusCodes.OK).json({
        success: true,
        message: "Expense deleted successfully",
        data: deletedExpense,
      });
    } catch (error) {
      console.error("Error deleting expense:", error);
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: "Failed to delete expense",
      });
    }
  },
};
