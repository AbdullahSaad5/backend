import { Router } from "express";
import { FinancialReportingController } from "@/controllers/financial-reporting.controller";

/**
 * 📊 FINANCIAL REPORTING ROUTES
 * 
 * Provides comprehensive financial analytics endpoints for:
 * - Expense breakdowns by category and type
 * - Profit/loss statements
 * - Monthly trends analysis
 * - Detailed expense tracking with references
 */
export const financialReporting = (router: Router) => {
  // Expense analytics
  router.get("/expenses/by-category", FinancialReportingController.getExpenseBreakdownByCategory);
  router.get("/expenses/by-type", FinancialReportingController.getExpenseBreakdownByType);
  
  // Profit/Loss
  router.get("/profit-loss", FinancialReportingController.getProfitLossStatement);
  
  // Trends
  router.get("/trends/monthly/:year", FinancialReportingController.getMonthlyExpenseTrends);
  
  // Comprehensive summary
  router.get("/summary", FinancialReportingController.getFinancialSummary);
  
  // Detailed expense tracking
  router.get("/expense/:id/details", FinancialReportingController.getExpenseWithReferences);
};
