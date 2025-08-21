import { expenseService } from "./expense.service";
import { ExpenseModel } from "@/models/expense.model";

/**
 * 🔄 EXPENSE ADJUSTMENT SERVICE
 * 
 * Handles expense corrections, refunds, and adjustments
 * while maintaining proper audit trail and financial accuracy
 */
export const ExpenseAdjustmentService = {

  /**
   * Create adjustment expense (positive for additional costs, negative for refunds)
   */
  createAdjustment: async (data: {
    originalExpenseId: string;
    adjustmentAmount: number; // Positive for additional cost, negative for refund
    reason: string;
    adjustmentDate?: Date;
    adjustedBy?: string;
  }) => {
    try {
      // Verify original expense exists
      const originalExpense = await ExpenseModel.findById(data.originalExpenseId);
      if (!originalExpense) {
        throw new Error("Original expense not found");
      }

      // Create adjustment expense
      const categoryId = typeof originalExpense.category === 'string' 
        ? originalExpense.category 
        : originalExpense.category._id.toString();

      const adjustmentExpense = await expenseService.createExpense({
        title: `Adjustment: ${originalExpense.title}`,
        description: `Expense adjustment - ${data.reason}`,
        amount: Math.abs(data.adjustmentAmount), // Store as positive amount
        category: categoryId,
        date: data.adjustmentDate || new Date(),
        image: "",
        isSystemGenerated: true,
        systemType: "adjustment", // Now properly supported in enum
        adjustmentReferenceId: data.originalExpenseId,
      });

      // Update original expense with adjustment reference
      await ExpenseModel.findByIdAndUpdate(data.originalExpenseId, {
        $push: {
          adjustments: {
            adjustmentId: adjustmentExpense._id,
            amount: data.adjustmentAmount,
            reason: data.reason,
            date: data.adjustmentDate || new Date(),
            adjustedBy: data.adjustedBy
          }
        }
      });

      return adjustmentExpense;
    } catch (error) {
      console.error("Error creating expense adjustment:", error);
      throw error;
    }
  },

  /**
   * Get expense with all adjustments
   */
  getExpenseWithAdjustments: async (expenseId: string) => {
    const expense = await ExpenseModel.findById(expenseId)
      .populate('category', 'title')
      .lean();

    if (!expense) return null;

    // Get all adjustments for this expense
    const adjustments = await ExpenseModel.find({
      systemType: "adjustment",
      adjustmentReferenceId: expenseId,
      isSystemGenerated: true
    }).lean();

    const totalAdjustments = adjustments.reduce((sum, adj) => sum + adj.amount, 0);
    const effectiveAmount = expense.amount + totalAdjustments;

    return {
      ...expense,
      adjustments,
      totalAdjustments,
      effectiveAmount
    };
  },

  /**
   * Calculate net expense amount including adjustments
   */
  calculateNetExpenseAmount: async (expenseId: string): Promise<number> => {
    const expenseWithAdjustments = await ExpenseAdjustmentService.getExpenseWithAdjustments(expenseId);
    return expenseWithAdjustments?.effectiveAmount || 0;
  }
};
