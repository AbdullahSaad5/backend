import { ExpenseModel } from "@/models/expense.model";
import { RevenueModel } from "@/models/revenue.model";
import { Types } from "mongoose";

/**
 * 📊 FINANCIAL REPORTING SERVICE
 * 
 * This service provides comprehensive financial analytics and reporting
 * by aggregating data from all expense sources (manual, inventory, payroll, recurring)
 * and revenue sources for complete business financial insights.
 */
export const FinancialReportingService = {
  
  /**
   * 📈 Get expense breakdown by category
   */
  getExpenseBreakdownByCategory: async (startDate?: Date, endDate?: Date) => {
    const matchStage: any = {};
    if (startDate || endDate) {
      matchStage.date = {};
      if (startDate) matchStage.date.$gte = startDate;
      if (endDate) matchStage.date.$lte = endDate;
    }

    return await ExpenseModel.aggregate([
      ...(Object.keys(matchStage).length > 0 ? [{ $match: matchStage }] : []),
      {
        $lookup: {
          from: "iexpensemodels", // Expense category collection name
          localField: "category",
          foreignField: "_id",
          as: "categoryInfo"
        }
      },
      {
        $group: {
          _id: "$category",
          categoryName: { $first: { $arrayElemAt: ["$categoryInfo.title", 0] } },
          totalAmount: { $sum: "$amount" },
          count: { $sum: 1 },
          isSystemGenerated: { $first: "$isSystemGenerated" },
          systemType: { $first: "$systemType" }
        }
      },
      { $sort: { totalAmount: -1 } }
    ]);
  },

  /**
   * 📊 Get expense breakdown by type (manual vs system-generated)
   */
  getExpenseBreakdownByType: async (startDate?: Date, endDate?: Date) => {
    const matchStage: any = {};
    if (startDate || endDate) {
      matchStage.date = {};
      if (startDate) matchStage.date.$gte = startDate;
      if (endDate) matchStage.date.$lte = endDate;
    }

    return await ExpenseModel.aggregate([
      ...(Object.keys(matchStage).length > 0 ? [{ $match: matchStage }] : []),
      {
        $group: {
          _id: {
            isSystemGenerated: "$isSystemGenerated",
            systemType: "$systemType"
          },
          totalAmount: { $sum: "$amount" },
          count: { $sum: 1 }
        }
      },
      {
        $project: {
          type: {
            $cond: {
              if: "$_id.isSystemGenerated",
              then: {
                $switch: {
                  branches: [
                    { case: { $eq: ["$_id.systemType", "inventory_purchase"] }, then: "Inventory Purchase" },
                    { case: { $eq: ["$_id.systemType", "payroll"] }, then: "Payroll" },
                    { case: { $eq: ["$_id.systemType", "recurring"] }, then: "Recurring Expense" },
                    { case: { $eq: ["$_id.systemType", "adjustment"] }, then: "Expense Adjustment" }
                  ],
                  default: "System Generated"
                }
              },
              else: "Manual Expense"
            }
          },
          totalAmount: 1,
          count: 1
        }
      },
      { $sort: { totalAmount: -1 } }
    ]);
  },

  /**
   * 💰 Get total expenses and revenue for profit/loss calculation
   */
  getProfitLossStatement: async (startDate?: Date, endDate?: Date) => {
    const dateFilter: any = {};
    if (startDate || endDate) {
      if (startDate) dateFilter.$gte = startDate;
      if (endDate) dateFilter.$lte = endDate;
    }

    const [expenseTotal, revenueTotal] = await Promise.all([
      ExpenseModel.aggregate([
        ...(Object.keys(dateFilter).length > 0 ? [{ $match: { date: dateFilter } }] : []),
        { $group: { _id: null, total: { $sum: "$amount" }, count: { $sum: 1 } } }
      ]),
      RevenueModel.aggregate([
        ...(Object.keys(dateFilter).length > 0 ? [{ $match: { date: dateFilter } }] : []),
        { $group: { _id: null, total: { $sum: "$amount" }, count: { $sum: 1 } } }
      ])
    ]);

    const totalExpenses = expenseTotal[0]?.total || 0;
    const totalRevenues = revenueTotal[0]?.total || 0;
    const expenseCount = expenseTotal[0]?.count || 0;
    const revenueCount = revenueTotal[0]?.count || 0;

    return {
      totalRevenues,
      totalExpenses,
      netProfit: totalRevenues - totalExpenses,
      revenueCount,
      expenseCount,
      profitMargin: totalRevenues > 0 ? ((totalRevenues - totalExpenses) / totalRevenues) * 100 : 0
    };
  },

  /**
   * 📅 Get monthly expense trends
   */
  getMonthlyExpenseTrends: async (year: number) => {
    return await ExpenseModel.aggregate([
      {
        $match: {
          date: {
            $gte: new Date(year, 0, 1),
            $lte: new Date(year, 11, 31)
          }
        }
      },
      {
        $group: {
          _id: {
            month: { $month: "$date" },
            isSystemGenerated: "$isSystemGenerated",
            systemType: "$systemType"
          },
          totalAmount: { $sum: "$amount" },
          count: { $sum: 1 }
        }
      },
      {
        $group: {
          _id: "$_id.month",
          monthlyTotal: { $sum: "$totalAmount" },
          breakdown: {
            $push: {
              type: {
                $cond: {
                  if: "$_id.isSystemGenerated",
                  then: {
                    $switch: {
                      branches: [
                        { case: { $eq: ["$_id.systemType", "inventory_purchase"] }, then: "Inventory" },
                        { case: { $eq: ["$_id.systemType", "payroll"] }, then: "Payroll" },
                        { case: { $eq: ["$_id.systemType", "recurring"] }, then: "Recurring" },
                        { case: { $eq: ["$_id.systemType", "adjustment"] }, then: "Adjustment" }
                      ],
                      default: "System"
                    }
                  },
                  else: "Manual"
                }
              },
              amount: "$totalAmount",
              count: "$count"
            }
          }
        }
      },
      { $sort: { _id: 1 } }
    ]);
  },

  /**
   * 🔍 Get expense details with reference data
   */
  getExpenseWithReferences: async (expenseId: string) => {
    const expense = await ExpenseModel.findById(expenseId)
      .populate('category', 'title description')
      .lean();

    if (!expense) return null;

    // If it's a system-generated expense, fetch reference data
    if (expense.isSystemGenerated) {
      let referenceData = null;
      
      switch (expense.systemType) {
        case "inventory_purchase":
          // Fetch stock details
          if (expense.inventoryReferenceId) {
            const Stock = require("@/models/stock.model").Stock;
            referenceData = await Stock.findById(expense.inventoryReferenceId)
              .populate('inventoryId', 'productInfo')
              .lean();
          }
          break;
          
        case "payroll":
          // Fetch payroll details
          if (expense.payrollReferenceId) {
            const ProcessedPayroll = require("@/models/processedpayroll.model").ProcessedPayroll;
            referenceData = await ProcessedPayroll.findById(expense.payrollReferenceId)
              .populate('employeeId', 'firstName lastName email')
              .lean();
          }
          break;
          
        case "recurring":
          // Fetch recurring expense details
          if (expense.recurringReferenceId) {
            const RecurringExpenseModel = require("@/models/recurring-expense.model").RecurringExpenseModel;
            referenceData = await RecurringExpenseModel.findById(expense.recurringReferenceId).lean();
          }
          break;
          
        case "adjustment":
          // Fetch original expense details
          if (expense.adjustmentReferenceId) {
            referenceData = await ExpenseModel.findById(expense.adjustmentReferenceId)
              .populate('category', 'title')
              .lean();
          }
          break;
      }

      return { ...expense, referenceData };
    }

    return expense;
  },

  /**
   * 📋 Get comprehensive financial summary
   */
  getFinancialSummary: async (startDate?: Date, endDate?: Date) => {
    const [
      profitLoss,
      expenseBreakdown,
      typeBreakdown
    ] = await Promise.all([
      this.getProfitLossStatement(startDate, endDate),
      this.getExpenseBreakdownByCategory(startDate, endDate),
      this.getExpenseBreakdownByType(startDate, endDate)
    ]);

    return {
      profitLoss,
      expenseBreakdown,
      typeBreakdown,
      period: {
        startDate: startDate || "All time",
        endDate: endDate || "All time"
      }
    };
  }
};
