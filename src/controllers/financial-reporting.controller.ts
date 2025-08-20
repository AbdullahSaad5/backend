import { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import { FinancialReportingService } from "@/services/financial-reporting.service";

/**
 * 📊 FINANCIAL REPORTING CONTROLLER
 * 
 * Provides endpoints for comprehensive financial analytics and reporting
 * including expense breakdowns, profit/loss statements, and trends analysis
 */
export const FinancialReportingController = {

  /**
   * @desc    Get expense breakdown by category
   * @route   GET /api/financial-reporting/expenses/by-category
   * @query   startDate, endDate (optional)
   */
  getExpenseBreakdownByCategory: async (req: Request, res: Response) => {
    try {
      const { startDate, endDate } = req.query;
      
      const breakdown = await FinancialReportingService.getExpenseBreakdownByCategory(
        startDate ? new Date(startDate as string) : undefined,
        endDate ? new Date(endDate as string) : undefined
      );

      res.status(StatusCodes.OK).json({
        success: true,
        data: breakdown,
      });
    } catch (error) {
      console.error("Error getting expense breakdown by category:", error);
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: "Failed to get expense breakdown",
      });
    }
  },

  /**
   * @desc    Get expense breakdown by type (manual vs system)
   * @route   GET /api/financial-reporting/expenses/by-type
   * @query   startDate, endDate (optional)
   */
  getExpenseBreakdownByType: async (req: Request, res: Response) => {
    try {
      const { startDate, endDate } = req.query;
      
      const breakdown = await FinancialReportingService.getExpenseBreakdownByType(
        startDate ? new Date(startDate as string) : undefined,
        endDate ? new Date(endDate as string) : undefined
      );

      res.status(StatusCodes.OK).json({
        success: true,
        data: breakdown,
      });
    } catch (error) {
      console.error("Error getting expense breakdown by type:", error);
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: "Failed to get expense breakdown",
      });
    }
  },

  /**
   * @desc    Get profit/loss statement
   * @route   GET /api/financial-reporting/profit-loss
   * @query   startDate, endDate (optional)
   */
  getProfitLossStatement: async (req: Request, res: Response) => {
    try {
      const { startDate, endDate } = req.query;
      
      const statement = await FinancialReportingService.getProfitLossStatement(
        startDate ? new Date(startDate as string) : undefined,
        endDate ? new Date(endDate as string) : undefined
      );

      res.status(StatusCodes.OK).json({
        success: true,
        data: statement,
      });
    } catch (error) {
      console.error("Error getting profit/loss statement:", error);
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: "Failed to get profit/loss statement",
      });
    }
  },

  /**
   * @desc    Get monthly expense trends
   * @route   GET /api/financial-reporting/trends/monthly/:year
   * @param   year - Year to analyze
   */
  getMonthlyExpenseTrends: async (req: Request, res: Response) => {
    try {
      const { year } = req.params;
      const yearNum = parseInt(year);
      
      if (isNaN(yearNum)) {
        return res.status(StatusCodes.BAD_REQUEST).json({
          success: false,
          message: "Invalid year parameter",
        });
      }
      
      const trends = await FinancialReportingService.getMonthlyExpenseTrends(yearNum);

      res.status(StatusCodes.OK).json({
        success: true,
        data: trends,
      });
    } catch (error) {
      console.error("Error getting monthly expense trends:", error);
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: "Failed to get expense trends",
      });
    }
  },

  /**
   * @desc    Get comprehensive financial summary
   * @route   GET /api/financial-reporting/summary
   * @query   startDate, endDate (optional)
   */
  getFinancialSummary: async (req: Request, res: Response) => {
    try {
      const { startDate, endDate } = req.query;
      
      const summary = await FinancialReportingService.getFinancialSummary(
        startDate ? new Date(startDate as string) : undefined,
        endDate ? new Date(endDate as string) : undefined
      );

      res.status(StatusCodes.OK).json({
        success: true,
        data: summary,
      });
    } catch (error) {
      console.error("Error getting financial summary:", error);
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: "Failed to get financial summary",
      });
    }
  },

  /**
   * @desc    Get expense details with reference data
   * @route   GET /api/financial-reporting/expense/:id/details
   * @param   id - Expense ID
   */
  getExpenseWithReferences: async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      
      const expenseDetails = await FinancialReportingService.getExpenseWithReferences(id);
      
      if (!expenseDetails) {
        return res.status(StatusCodes.NOT_FOUND).json({
          success: false,
          message: "Expense not found",
        });
      }

      res.status(StatusCodes.OK).json({
        success: true,
        data: expenseDetails,
      });
    } catch (error) {
      console.error("Error getting expense details:", error);
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: "Failed to get expense details",
      });
    }
  },
};
