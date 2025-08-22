import { expenseService } from "./expense.service";
import { RevenueService } from "./revenue.service";
import { ExpenseModel } from "@/models/expense.model";
import { RevenueModel } from "@/models/revenue.model";

export interface ProfitReportData {
  dateRange: {
    startDate: Date;
    endDate: Date;
  };
  totalRevenue: number;
  totalExpenses: number;
  profit: number;
  profitMargin: number; // Percentage
  revenueBreakdown: {
    source: string;
    amount: number;
    percentage: number;
  }[];
  expenseBreakdown: {
    category: string;
    amount: number;
    percentage: number;
    isSystemGenerated: boolean;
  }[];
  monthlyTrends: {
    month: string;
    revenue: number;
    expenses: number;
    profit: number;
  }[];
  dailyTrends: {
    date: string;
    revenue: number;
    expenses: number;
    profit: number;
  }[];
}

export interface TimeBasedReport {
  period: 'all-time' | 'daily' | 'monthly' | 'yearly';
  dateRange?: {
    startDate: Date;
    endDate: Date;
  };
  summary: {
    totalRevenue: number;
    totalExpenses: number;
    profit: number;
    profitMargin: number;
  };
  trends: {
    period: string;
    revenue: number;
    expenses: number;
    profit: number;
  }[];
  topExpenseCategories: {
    category: string;
    amount: number;
    percentage: number;
  }[];
  topRevenueSources: {
    source: string;
    amount: number;
    percentage: number;
  }[];
}

export const ProfitReportingService = {
  /**
   * Generate comprehensive profit report for date range
   */
  generateProfitReport: async (startDate: Date, endDate: Date): Promise<ProfitReportData> => {
    try {
      // Get revenues for the date range
      const revenues = await RevenueModel.find({
        date: { $gte: startDate, $lte: endDate },
        isBlocked: false
      });

      // Get expenses for the date range
      const expenses = await ExpenseModel.find({
        date: { $gte: startDate, $lte: endDate },
        isBlocked: false
      }).populate('category');

      // Calculate totals
      const totalRevenue = revenues.reduce((sum, revenue) => sum + revenue.amount, 0);
      const totalExpenses = expenses.reduce((sum, expense) => sum + expense.amount, 0);
      const profit = totalRevenue - totalExpenses;
      const profitMargin = totalRevenue > 0 ? (profit / totalRevenue) * 100 : 0;

      // Revenue breakdown by source
      const revenueBySource = revenues.reduce((acc: Record<string, number>, revenue) => {
        acc[revenue.source] = (acc[revenue.source] || 0) + revenue.amount;
        return acc;
      }, {});

      const revenueBreakdown = Object.entries(revenueBySource).map(([source, amount]) => ({
        source,
        amount,
        percentage: totalRevenue > 0 ? (amount / totalRevenue) * 100 : 0
      })).sort((a, b) => b.amount - a.amount);

      // Expense breakdown by category
      const expenseByCategory = expenses.reduce((acc: Record<string, { amount: number; isSystemGenerated: boolean }>, expense) => {
        let categoryName = 'Uncategorized';
        
        // Handle populated category object
        if (expense.category && typeof expense.category === 'object' && 'title' in expense.category) {
          categoryName = (expense.category as any).title;
        }
        
        if (!acc[categoryName]) {
          acc[categoryName] = { amount: 0, isSystemGenerated: !!expense.isSystemGenerated };
        }
        acc[categoryName].amount += expense.amount;
        return acc;
      }, {});

      const expenseBreakdown = Object.entries(expenseByCategory).map(([category, data]) => ({
        category,
        amount: data.amount,
        percentage: totalExpenses > 0 ? (data.amount / totalExpenses) * 100 : 0,
        isSystemGenerated: data.isSystemGenerated
      })).sort((a, b) => b.amount - a.amount);

      // Monthly trends
      const monthlyTrends = await ProfitReportingService.getMonthlyTrends(startDate, endDate);
      
      // Daily trends (for shorter periods)
      const daysDiff = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
      const dailyTrends = daysDiff <= 31 ? await ProfitReportingService.getDailyTrends(startDate, endDate) : [];

      return {
        dateRange: { startDate, endDate },
        totalRevenue,
        totalExpenses,
        profit,
        profitMargin,
        revenueBreakdown,
        expenseBreakdown,
        monthlyTrends,
        dailyTrends
      };
    } catch (error) {
      console.error('Error generating profit report:', error);
      throw error;
    }
  },

  /**
   * Generate time-based report with trends
   */
  generateTimeBasedReport: async (
    startDate?: Date, 
    endDate?: Date, 
    period: 'all-time' | 'daily' | 'monthly' | 'yearly' = 'all-time'
  ): Promise<TimeBasedReport> => {
    try {
      let profitReport;
      let trends: { period: string; revenue: number; expenses: number; profit: number; }[] = [];
      
      switch (period) {
        case 'all-time':
          // Get all data without date filters
          profitReport = await ProfitReportingService.generateAllTimeReport();
          trends = await ProfitReportingService.getAllTimeTrends();
          break;
        case 'yearly':
          // Get all data without date filters for yearly trends
          profitReport = await ProfitReportingService.generateAllTimeReport();
          trends = await ProfitReportingService.getYearlyTrends();
          break;
        case 'daily':
        case 'monthly':
          if (!startDate || !endDate) {
            throw new Error('Start date and end date are required for daily and monthly reports');
          }
          profitReport = await ProfitReportingService.generateProfitReport(startDate, endDate);
          
          if (period === 'daily') {
            trends = profitReport.dailyTrends.map(day => ({
              period: day.date,
              revenue: day.revenue,
              expenses: day.expenses,
              profit: day.profit
            }));
          } else {
            trends = profitReport.monthlyTrends.map(month => ({
              period: month.month,
              revenue: month.revenue,
              expenses: month.expenses,
              profit: month.profit
            }));
          }
          break;
      }

      return {
        period,
        dateRange: startDate && endDate ? { startDate, endDate } : undefined,
        summary: {
          totalRevenue: profitReport.totalRevenue,
          totalExpenses: profitReport.totalExpenses,
          profit: profitReport.profit,
          profitMargin: profitReport.profitMargin
        },
        trends,
        topExpenseCategories: profitReport.expenseBreakdown.slice(0, 5),
        topRevenueSources: profitReport.revenueBreakdown.slice(0, 5)
      };
    } catch (error) {
      console.error('Error generating time-based report:', error);
      throw error;
    }
  },

  /**
   * Get monthly trends data
   */
  getMonthlyTrends: async (startDate: Date, endDate: Date) => {
    const monthlyData = await ExpenseModel.aggregate([
      {
        $match: {
          date: { $gte: startDate, $lte: endDate },
          isBlocked: false
        }
      },
      {
        $group: {
          _id: {
            year: { $year: '$date' },
            month: { $month: '$date' }
          },
          totalExpenses: { $sum: '$amount' }
        }
      },
      {
        $sort: { '_id.year': 1, '_id.month': 1 }
      }
    ]);

    const monthlyRevenue = await RevenueModel.aggregate([
      {
        $match: {
          date: { $gte: startDate, $lte: endDate },
          isBlocked: false
        }
      },
      {
        $group: {
          _id: {
            year: { $year: '$date' },
            month: { $month: '$date' }
          },
          totalRevenue: { $sum: '$amount' }
        }
      },
      {
        $sort: { '_id.year': 1, '_id.month': 1 }
      }
    ]);

    // Combine expense and revenue data
    const combinedData = new Map();
    
    monthlyData.forEach(item => {
      const key = `${item._id.year}-${item._id.month}`;
      combinedData.set(key, { 
        ...combinedData.get(key), 
        expenses: item.totalExpenses,
        year: item._id.year,
        month: item._id.month
      });
    });

    monthlyRevenue.forEach(item => {
      const key = `${item._id.year}-${item._id.month}`;
      combinedData.set(key, { 
        ...combinedData.get(key), 
        revenue: item.totalRevenue,
        year: item._id.year,
        month: item._id.month
      });
    });

    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    
    return Array.from(combinedData.values()).map(item => ({
      month: `${months[item.month - 1]} ${item.year}`,
      revenue: item.revenue || 0,
      expenses: item.expenses || 0,
      profit: (item.revenue || 0) - (item.expenses || 0)
    }));
  },

  /**
   * Get daily trends data
   */
  getDailyTrends: async (startDate: Date, endDate: Date) => {
    const dailyExpenses = await ExpenseModel.aggregate([
      {
        $match: {
          date: { $gte: startDate, $lte: endDate },
          isBlocked: false
        }
      },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$date' } },
          totalExpenses: { $sum: '$amount' }
        }
      },
      {
        $sort: { '_id': 1 }
      }
    ]);

    const dailyRevenue = await RevenueModel.aggregate([
      {
        $match: {
          date: { $gte: startDate, $lte: endDate },
          isBlocked: false
        }
      },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$date' } },
          totalRevenue: { $sum: '$amount' }
        }
      },
      {
        $sort: { '_id': 1 }
      }
    ]);

    // Combine daily data
    const combinedData = new Map();
    
    dailyExpenses.forEach(item => {
      combinedData.set(item._id, { 
        ...combinedData.get(item._id), 
        expenses: item.totalExpenses,
        date: item._id
      });
    });

    dailyRevenue.forEach(item => {
      combinedData.set(item._id, { 
        ...combinedData.get(item._id), 
        revenue: item.totalRevenue,
        date: item._id
      });
    });

    // Convert to array and sort by date
    const result = Array.from(combinedData.values()).map(item => ({
      date: item.date,
      revenue: item.revenue || 0,
      expenses: item.expenses || 0,
      profit: (item.revenue || 0) - (item.expenses || 0)
    }));

    // Sort by date to ensure chronological order
    return result.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  },

  /**
   * Get weekly trends data
   */
  getWeeklyTrends: async (startDate: Date, endDate: Date) => {
    // Implementation for weekly trends
    const weeklyExpenses = await ExpenseModel.aggregate([
      {
        $match: {
          date: { $gte: startDate, $lte: endDate },
          isBlocked: false
        }
      },
      {
        $group: {
          _id: {
            year: { $year: '$date' },
            week: { $week: '$date' }
          },
          totalExpenses: { $sum: '$amount' }
        }
      },
      {
        $sort: { '_id.year': 1, '_id.week': 1 }
      }
    ]);

    const weeklyRevenue = await RevenueModel.aggregate([
      {
        $match: {
          date: { $gte: startDate, $lte: endDate },
          isBlocked: false
        }
      },
      {
        $group: {
          _id: {
            year: { $year: '$date' },
            week: { $week: '$date' }
          },
          totalRevenue: { $sum: '$amount' }
        }
      },
      {
        $sort: { '_id.year': 1, '_id.week': 1 }
      }
    ]);

    const combinedData = new Map();
    
    weeklyExpenses.forEach(item => {
      const key = `${item._id.year}-W${item._id.week}`;
      combinedData.set(key, { 
        ...combinedData.get(key), 
        expenses: item.totalExpenses,
        period: key
      });
    });

    weeklyRevenue.forEach(item => {
      const key = `${item._id.year}-W${item._id.week}`;
      combinedData.set(key, { 
        ...combinedData.get(key), 
        revenue: item.totalRevenue,
        period: key
      });
    });

    const result = Array.from(combinedData.values()).map(item => ({
      period: item.period,
      revenue: item.revenue || 0,
      expenses: item.expenses || 0,
      profit: (item.revenue || 0) - (item.expenses || 0)
    }));

    // Sort by period to ensure chronological order
    return result.sort((a, b) => a.period.localeCompare(b.period));
  },

  /**
   * Get yearly trends data
   */
  getYearlyTrends: async (startDate?: Date, endDate?: Date) => {
    const matchStage: any = { isBlocked: false };
    if (startDate && endDate) {
      matchStage.date = { $gte: startDate, $lte: endDate };
    }

    const yearlyExpenses = await ExpenseModel.aggregate([
      {
        $match: matchStage
      },
      {
        $group: {
          _id: { $year: '$date' },
          totalExpenses: { $sum: '$amount' }
        }
      },
      {
        $sort: { '_id': 1 }
      }
    ]);

    const yearlyRevenue = await RevenueModel.aggregate([
      {
        $match: matchStage
      },
      {
        $group: {
          _id: { $year: '$date' },
          totalRevenue: { $sum: '$amount' }
        }
      },
      {
        $sort: { '_id': 1 }
      }
    ]);

    const combinedData = new Map();
    
    yearlyExpenses.forEach(item => {
      combinedData.set(item._id.toString(), { 
        ...combinedData.get(item._id.toString()), 
        expenses: item.totalExpenses,
        period: item._id.toString()
      });
    });

    yearlyRevenue.forEach(item => {
      combinedData.set(item._id.toString(), { 
        ...combinedData.get(item._id.toString()), 
        revenue: item.totalRevenue,
        period: item._id.toString()
      });
    });

    const result = Array.from(combinedData.values()).map(item => ({
      period: item.period,
      revenue: item.revenue || 0,
      expenses: item.expenses || 0,
      profit: (item.revenue || 0) - (item.expenses || 0)
    }));

    // Sort by period to ensure chronological order
    return result.sort((a, b) => a.period.localeCompare(b.period));
  },

  /**
   * Generate all-time report without date filters
   */
  generateAllTimeReport: async (): Promise<ProfitReportData> => {
    try {
      // Get all revenues
      const revenues = await RevenueModel.find({
        isBlocked: false
      });

      // Get all expenses
      const expenses = await ExpenseModel.find({
        isBlocked: false
      }).populate('category');

      // Calculate totals
      const totalRevenue = revenues.reduce((sum, revenue) => sum + revenue.amount, 0);
      const totalExpenses = expenses.reduce((sum, expense) => sum + expense.amount, 0);
      const profit = totalRevenue - totalExpenses;
      const profitMargin = totalRevenue > 0 ? (profit / totalRevenue) * 100 : 0;

      // Revenue breakdown by source
      const revenueBySource = revenues.reduce((acc: Record<string, number>, revenue) => {
        acc[revenue.source] = (acc[revenue.source] || 0) + revenue.amount;
        return acc;
      }, {});

      const revenueBreakdown = Object.entries(revenueBySource).map(([source, amount]) => ({
        source,
        amount,
        percentage: totalRevenue > 0 ? (amount / totalRevenue) * 100 : 0
      })).sort((a, b) => b.amount - a.amount);

      // Expense breakdown by category
      const expenseByCategory = expenses.reduce((acc: Record<string, { amount: number; isSystemGenerated: boolean }>, expense) => {
        let categoryName = 'Uncategorized';
        
        // Handle populated category object
        if (expense.category && typeof expense.category === 'object' && 'title' in expense.category) {
          categoryName = (expense.category as any).title;
        }
        
        if (!acc[categoryName]) {
          acc[categoryName] = { amount: 0, isSystemGenerated: !!expense.isSystemGenerated };
        }
        acc[categoryName].amount += expense.amount;
        return acc;
      }, {});

      const expenseBreakdown = Object.entries(expenseByCategory).map(([category, data]) => ({
        category,
        amount: data.amount,
        percentage: totalExpenses > 0 ? (data.amount / totalExpenses) * 100 : 0,
        isSystemGenerated: data.isSystemGenerated
      })).sort((a, b) => b.amount - a.amount);

      return {
        dateRange: { startDate: new Date(0), endDate: new Date() },
        totalRevenue,
        totalExpenses,
        profit,
        profitMargin,
        revenueBreakdown,
        expenseBreakdown,
        monthlyTrends: [],
        dailyTrends: []
      };
    } catch (error) {
      console.error('Error generating all-time report:', error);
      throw error;
    }
  },

  /**
   * Get all-time trends data
   */
  getAllTimeTrends: async () => {
    // For all-time, we'll show yearly trends
    return await ProfitReportingService.getYearlyTrends();
  }
};
