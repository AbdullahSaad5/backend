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
    payrollType?: "ACTUAL" | "GOVERNMENT";
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
      .populate({
        path: "inventoryReferenceId",
        populate: [
          {
            path: "inventoryId",
            populate: {
              path: "productInfo.productCategory",
            },
          },
          {
            path: "productSupplier",
          },
          {
            path: "receivedBy",
          },
          {
            path: "selectedVariations.variationId",
          },
        ],
      })
      .populate({
        path: "payrollReferenceId",
        populate: {
          path: "employeeId",
        },
      })
      .populate("recurringReferenceId")
      .populate("adjustmentReferenceId");
    console.log(
      "Results of getAllExpenses with populated references:",
      Results
    );
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
    }).populate("category");
  },

  /**
   * Delete an expense
   */
  deleteExpense: async (id: string): Promise<IExpense | null> => {
    return ExpenseModel.findByIdAndDelete(id);
  },

  /**
   * Search expenses with pagination and filters
   */
  searchExpenses: async (filters: {
    searchQuery?: string;
    isBlocked?: boolean;
    category?: string;
    expenseType?: string;
    payrollType?: string;
    page?: number;
    limit?: number;
  }) => {
    const { searchQuery, isBlocked, category, expenseType, payrollType, page = 1, limit = 10 } = filters;
    
    // Build filter object
    const filter: any = {};
    
    if (isBlocked !== undefined) {
      filter.isBlocked = isBlocked;
    }
    
    if (category) {
      filter.category = category;
    }
    
    if (expenseType && expenseType !== "all") {
      if (expenseType === "manual") {
        filter.isSystemGenerated = false;
      } else if (expenseType === "system") {
        filter.isSystemGenerated = true;
      }
    }
    
    // Special handling for payroll type filter
    // We want to show all expenses but only show the selected payroll type for payroll expenses
    if (payrollType) {
      // For payroll expenses, filter by payroll type
      // For non-payroll expenses, include them regardless of payroll type
      filter.$or = [
        { systemType: { $ne: "payroll" } }, // Include all non-payroll expenses
        { 
          systemType: "payroll", 
          payrollType: payrollType 
        } // Include only the selected payroll type for payroll expenses
      ];
    }
    
    // Build search query
    if (searchQuery) {
      const searchFilter = {
        $or: [
          { title: { $regex: searchQuery, $options: 'i' } },
          { description: { $regex: searchQuery, $options: 'i' } }
        ]
      };
      
      // If we already have $or for payroll filter, combine them
      if (filter.$or) {
        filter.$and = [
          { $or: filter.$or },
          searchFilter
        ];
        delete filter.$or;
      } else {
        filter.$or = searchFilter.$or;
      }
    }
    
    // Calculate skip value for pagination
    const skip = (page - 1) * limit;
    
    // Get total count for pagination
    const totalExpenses = await ExpenseModel.countDocuments(filter);
    
    // Get paginated results with population
    const expenses = await ExpenseModel.find(filter)
      .populate("category")
      .populate({
        path: "inventoryReferenceId",
        populate: [
          {
            path: "inventoryId",
            populate: {
              path: "productInfo.productCategory",
            },
          },
          {
            path: "productSupplier",
          },
          {
            path: "receivedBy",
          },
          {
            path: "selectedVariations.variationId",
          },
        ],
      })
      .populate({
        path: "payrollReferenceId",
        populate: {
          path: "employeeId",
        },
      })
      .populate("recurringReferenceId")
      .populate("adjustmentReferenceId")
      .sort({ date: -1 })
      .skip(skip)
      .limit(limit);
    
    return {
      expenses,
      pagination: {
        totalExpenses,
        currentPage: page,
        totalPages: Math.ceil(totalExpenses / limit),
        limit,
        hasNextPage: page < Math.ceil(totalExpenses / limit),
        hasPrevPage: page > 1
      }
    };
  },
};
