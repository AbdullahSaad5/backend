import { expenseService } from "./expense.service";
import { ExpenseModel } from "@/models/expense.model";

// System category IDs - these should be created in the database via seeder
const SYSTEM_CATEGORIES = {
  INVENTORY_PURCHASE: "688a0f06484b26aea1095f82", // Inventory Purchase category
  PAYROLL: "688a23bc78554b400be341cb", // Payroll category  
  RECURRING: "68a35f896286d84c0499eff2", // Already exists - Recursive Expense
};

export const SystemExpenseService = {
  /**
   * Create expense for inventory purchase
   */
  createInventoryPurchaseExpense: async (data: {
    productName: string;
    totalAmount: number;
    stockId: string;
    purchaseDate?: Date;
  }) => {
    try {
      // 🛡️ DUPLICATE PREVENTION: Check if expense already exists for this stock
      const existingExpense = await ExpenseModel.findOne({
        systemType: "inventory_purchase",
        inventoryReferenceId: data.stockId,
        isSystemGenerated: true
      });

      if (existingExpense) {
        console.log(`⚠️ Expense already exists for stock ID: ${data.stockId}`);
        return existingExpense;
      }

      return await expenseService.createExpense({
        title: `Inventory Purchase - ${data.productName}`,
        description: `System generated expense for inventory purchase of ${data.productName}`,
        amount: data.totalAmount,
        category: SYSTEM_CATEGORIES.INVENTORY_PURCHASE,
        date: data.purchaseDate || new Date(),
        image: "",
        isSystemGenerated: true,
        systemType: "inventory_purchase",
        inventoryReferenceId: data.stockId,
      });
    } catch (error) {
      console.error("Error creating inventory purchase expense:", error);
      throw error;
    }
  },

  /**
   * Create expense for payroll
   */
  createPayrollExpense: async (data: {
    employeeName: string;
    netPay: number;
    payrollId: string;
    payrollDate?: Date;
    payrollPeriod?: string;
  }) => {
    try {
      // 🛡️ DUPLICATE PREVENTION: Check if expense already exists for this payroll
      const existingExpense = await ExpenseModel.findOne({
        systemType: "payroll",
        payrollReferenceId: data.payrollId,
        isSystemGenerated: true
      });

      if (existingExpense) {
        console.log(`⚠️ Expense already exists for payroll ID: ${data.payrollId}`);
        return existingExpense;
      }

      return await expenseService.createExpense({
        title: `Payroll - ${data.employeeName}`,
        description: `System generated payroll expense for ${data.employeeName}${data.payrollPeriod ? ` (${data.payrollPeriod})` : ""}`,
        amount: data.netPay,
        category: SYSTEM_CATEGORIES.PAYROLL,
        date: data.payrollDate || new Date(),
        image: "",
        isSystemGenerated: true,
        systemType: "payroll",
        payrollReferenceId: data.payrollId,
      });
    } catch (error) {
      console.error("Error creating payroll expense:", error);
      throw error;
    }
  },

  /**
   * Create expense for recurring expense (already handled in recurring-expense.service.ts)
   */
  createRecurringExpense: async (data: {
    title: string;
    description: string;
    amount: number;
    date?: Date;
  }) => {
    try {
      return await expenseService.createExpense({
        title: data.title,
        description: data.description,
        amount: data.amount,
        category: SYSTEM_CATEGORIES.RECURRING,
        date: data.date || new Date(),
        image: "",
        isSystemGenerated: true,
        systemType: "recurring",
        recurringReferenceId: data.recurringExpenseId,
      });
    } catch (error) {
      console.error("Error creating recurring expense:", error);
      throw error;
    }
  },

  /**
   * Check if an expense already exists for a given stock ID
   */
  checkExistingExpense: async (stockId: string) => {
    try {
      const existingExpense = await ExpenseModel.findOne({
        systemType: "inventory_purchase",
        inventoryReferenceId: stockId,
        isSystemGenerated: true
      });
      return existingExpense;
    } catch (error) {
      console.error("Error checking existing expense:", error);
      return null;
    }
  },

  /**
   * Get system category IDs (helper for other services)
   */
  getSystemCategories: () => SYSTEM_CATEGORIES,
};
