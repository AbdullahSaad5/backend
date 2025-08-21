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
    isSystemGenerated?: boolean;
    systemType?: "inventory_purchase" | "payroll" | "recurring" | "adjustment";
    inventoryReferenceId?: string;
    payrollReferenceId?: string;
    recurringReferenceId?: string;
    adjustmentReferenceId?: string;
  }): Promise<IExpense> => {
    const expense = new ExpenseModel(data);
    return expense.save();
  },

  /**
   * Get expense by ID
   */
  getExpenseById: async (id: string): Promise<IExpense | null> => {
    return ExpenseModel.findById(id)
      .populate("category")
      .populate("inventoryReferenceId")
      .populate("payrollReferenceId")
      .populate("recurringReferenceId")
      .populate("adjustmentReferenceId");
  },

  //  Get all expenses
  getAllExpenses: async (): Promise<IExpense[]> => {
    const Results = await ExpenseModel.find()
      .populate("category")
      .populate("inventoryReferenceId")
      .populate("payrollReferenceId")
      .populate("recurringReferenceId")
      .populate("adjustmentReferenceId");
    console.log("Results of getAllExpenses with populated references:", Results);
    return Results;
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
    }).populate("category")
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
