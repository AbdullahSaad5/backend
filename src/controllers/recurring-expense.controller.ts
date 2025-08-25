import { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import { RecurringExpenseService } from "@/services/recurring-expense.service";

export const RecurringExpenseController = {
  create: async (req: Request, res: Response) => {
    try {
      const {
        title,
        amount,
        category,
        frequency,
        startDate,
        interval,
        description,
        endDate,
        dayOfWeek,
        dayOfMonth,
        image,
      } = req.body;

      if (!title || !amount || !category || !frequency || !startDate) {
        return res.status(StatusCodes.BAD_REQUEST).json({
          success: false,
          message: "Title, Amount, Category, Frequency and Start Date are required",
        });
      }

      if (amount < 0) {
        return res.status(StatusCodes.BAD_REQUEST).json({
          success: false,
          message: "Amount cannot be negative",
        });
      }

      const created = await RecurringExpenseService.create({
        title,
        amount,
        category,
        frequency,
        startDate: new Date(startDate),
        interval: interval || 1,
        description,
        endDate: endDate ? new Date(endDate) : null,
        dayOfWeek,
        dayOfMonth,
        image: image || "",
      });

      res.status(StatusCodes.CREATED).json({ success: true, data: created });
    } catch (error) {
      console.error("Error creating recurring expense:", error);
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: "Failed to create recurring expense",
      });
    }
  },

  update: async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const updated = await RecurringExpenseService.update(id, req.body);
      if (!updated) {
        return res
          .status(StatusCodes.NOT_FOUND)
          .json({ success: false, message: "Recurring expense not found" });
      }
      res.status(StatusCodes.OK).json({ success: true, data: updated });
    } catch (error) {
      console.error("Error updating recurring expense:", error);
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: "Failed to update recurring expense",
      });
    }
  },

  remove: async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const deleted = await RecurringExpenseService.remove(id);
      if (!deleted) {
        return res
          .status(StatusCodes.NOT_FOUND)
          .json({ success: false, message: "Recurring expense not found" });
      }
      res
        .status(StatusCodes.OK)
        .json({ success: true, message: "Recurring expense deleted" });
    } catch (error) {
      console.error("Error deleting recurring expense:", error);
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: "Failed to delete recurring expense",
      });
    }
  },

  getById: async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const item = await RecurringExpenseService.getById(id);
      if (!item) {
        return res
          .status(StatusCodes.NOT_FOUND)
          .json({ success: false, message: "Recurring expense not found" });
      }
      res.status(StatusCodes.OK).json({ success: true, data: item });
    } catch (error) {
      console.error("Error getting recurring expense:", error);
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: "Failed to get recurring expense",
      });
    }
  },

  getAll: async (req: Request, res: Response) => {
    try {
      const { isBlocked } = req.query;
      const filter: any = {};
      if (typeof isBlocked !== "undefined") {
        filter.isBlocked = isBlocked === "false";
      }
      const items = await RecurringExpenseService.getAll(filter);
      res
        .status(StatusCodes.OK)
        .json({ success: true, count: items.length, data: items });
    } catch (error) {
      console.error("Error listing recurring expenses:", error);
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: "Failed to list recurring expenses",
      });
    }
  },

  /**
   * @desc    Search Recurring expenses with pagination and filters
   * @route   GET /api/recurring-expense/search
   * @access  Public
   */
  searchRecurringExpenses: async (req: Request, res: Response) => {
    try {
      const { 
        searchQuery, 
        isBlocked, 
        frequency, 
        page = 1, 
        limit = 10 
      } = req.query;

      // Parse and validate parameters
      const parsedPage = parseInt(page as string) || 1;
      const parsedLimit = parseInt(limit as string) || 10;
      const parsedIsBlocked = isBlocked !== undefined ? isBlocked === 'true' : undefined;
      const parsedFrequency = frequency as string;

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

      const result = await RecurringExpenseService.searchRecurringExpenses({
        searchQuery: searchQuery as string,
        isBlocked: parsedIsBlocked,
        frequency: parsedFrequency,
        page: parsedPage,
        limit: parsedLimit
      });

      res.status(StatusCodes.OK).json({ 
        success: true, 
        data: result
      });
    } catch (error) {
      console.error("Error searching recurring expenses:", error);
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ 
        success: false,
        message: "Error searching recurring expenses" 
      });
    }
  },

  toggleBlock: async (req: Request, res: Response) => {
      try {
        const { id } = req.params;
        const { isBlocked } = req.body;
        const result = await RecurringExpenseService.toggleBlock(id, isBlocked);
        res.status(StatusCodes.OK).json({
          success: true,
          message: `Recurring Expense ${isBlocked ? "blocked" : "unblocked"} successfully`,
          data: result,
        });
      } catch (error) {
        console.error("Toggle Block Recurring Expense Error:", error);
        res
          .status(StatusCodes.INTERNAL_SERVER_ERROR)
          .json({ success: false, message: "Error updating Recurring Expense status" });
      }
    },

  // Optional: manual trigger for processing due items instead of wait for cron
  triggerProcess: async (_req: Request, res: Response) => {
    try {
      const result = await RecurringExpenseService.processDue();
      res.status(StatusCodes.OK).json({ success: true, ...result });
    } catch (error) {
      console.error("Error processing due recurring expenses:", error);
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: "Failed to process due recurring expenses",
      });
    }
  },
};


