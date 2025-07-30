import { ExpenseModel } from "../models/expense.model";
import { IExpense } from "@/contracts/expense.contract";

export const expenseService = {
  /**
   * Create a new expense record
   */
  createExpense: async (data: {
    title: string;
    description: string;
    amount: number;
    category: string;
    date: Date;
    image: string;
  }): Promise<IExpense> => {
    const expense = new ExpenseModel(data);
    return expense.save();
  },

  /**
   * Get expense by ID
   */
  getExpenseById: async (id: string): Promise<IExpense | null> => {
    return ExpenseModel.findById(id);
  },

  /**
   * Get all expenses with optional filters
   */
  getAllExpenses: async (
    filters: {
      category?: string;
      startDate?: Date;
      endDate?: Date;
      minAmount?: number;
      maxAmount?: number;
    } = {}
  ): Promise<IExpense[]> => {
    const query: any = {};
  
    if (filters.category) query.category = filters.category;
    if (filters.startDate || filters.endDate) {
      query.date = {};
      if (filters.startDate) query.date.$gte = filters.startDate;
      if (filters.endDate) query.date.$lte = filters.endDate;
    }
    if (filters.minAmount || filters.maxAmount) {
      query.amount = {};
      if (filters.minAmount) query.amount.$gte = filters.minAmount;
      if (filters.maxAmount) query.amount.$lte = filters.maxAmount;
    }
  
    return ExpenseModel.find(query)
      .populate({
        path: 'category',
        select: 'title', // Only get the title from Category
        model: 'IExpenseModel' // The model name you used when creating the Category model
      })
      .sort({ date: -1 });
  },

  /**
   * Update an existing expense
   */
  updateExpense: async (
    id: string,
    updateData: Partial<IExpense>
  ): Promise<IExpense | null> => {
    return ExpenseModel.findByIdAndUpdate(id, updateData, {
      new: true,
      runValidators: true,
    });
  },

  /**
   * Delete an expense
   */
  deleteExpense: async (id: string): Promise<IExpense | null> => {
    return ExpenseModel.findByIdAndDelete(id);
  },

  /**
   * Get expense statistics by category
   */
  getExpenseStatistics: async (): Promise<
    { category: string; total: number }[]
  > => {
    return ExpenseModel.aggregate([
      {
        $group: {
          _id: "$category",
          total: { $sum: "$amount" },
        },
      },
      {
        $project: {
          category: "$_id",
          total: 1,
          _id: 0,
        },
      },
      { $sort: { total: -1 } },
    ]);
  },
};
