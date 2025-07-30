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
      const { category, startDate, endDate, minAmount, maxAmount } = req.query;

      const expenses = await expenseService.getAllExpenses({
        ...(category && { category: category as string }),
        ...(startDate && { startDate: new Date(startDate as string) }),
        ...(endDate && { endDate: new Date(endDate as string) }),
        ...(minAmount && { minAmount: Number(minAmount) }),
        ...(maxAmount && { maxAmount: Number(maxAmount) }),
      });

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

  getExpenseStatistics: async (req: Request, res: Response) => {
    try {
      const stats = await expenseService.getExpenseStatistics();
      res.status(StatusCodes.OK).json({
        success: true,
        data: stats,
      });
    } catch (error) {
      console.error("Error fetching expense statistics:", error);
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: "Failed to fetch expense statistics",
      });
    }
  },
};
