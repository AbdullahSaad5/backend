import { ExpenseCategory } from "@/models/expensecategory.model";

export const ExpenseCategoryService = {
  createExpensecategory: (title: String, description: string, image: string, isSystemGenerated: boolean) => {
    const newExpensecategory = new ExpenseCategory({ title, description, image, isSystemGenerated });
    return newExpensecategory.save();
  },

  editExpensecategory: (id: string, data: { title?: string; description?: string; image?: string, isSystemGenerated?: boolean }) => {
    return ExpenseCategory.findByIdAndUpdate(id, data, { new: true });
  },
  deleteExpensecategory: async (id: string) => {
    const expensecategory = await ExpenseCategory.findByIdAndDelete(id);
    if (!expensecategory) {
      throw new Error("Expensecategory not found");
    }
    return expensecategory;
  },

  getAllExpensecategory: () => {
    return ExpenseCategory.find();
  },

  getById: (id: string) => {
    return ExpenseCategory.findById(id);
  },

  searchExpenseCategories: async (filters: {
    searchQuery?: string;
    isBlocked?: boolean;
    isSystemGenerated?: boolean;
    page?: number;
    limit?: number;
  }) => {
    const { searchQuery, isBlocked, isSystemGenerated, page = 1, limit = 10 } = filters;
    
    // Build filter object
    const filter: any = {};
    
    if (isBlocked !== undefined) {
      filter.isBlocked = isBlocked;
    }
    
    if (isSystemGenerated !== undefined) {
      filter.isSystemGenerated = isSystemGenerated;
    }
    
    // Build search query
    if (searchQuery) {
      filter.$or = [
        { title: { $regex: searchQuery, $options: 'i' } },
        { description: { $regex: searchQuery, $options: 'i' } }
      ];
    }
    
    // Calculate skip value for pagination
    const skip = (page - 1) * limit;
    
    // Get total count for pagination
    const totalExpenseCategories = await ExpenseCategory.countDocuments(filter);
    
    // Get paginated results
    const expenseCategories = await ExpenseCategory.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);
    
    return {
      expenseCategories,
      pagination: {
        totalExpenseCategories,
        currentPage: page,
        totalPages: Math.ceil(totalExpenseCategories / limit),
        limit,
        hasNextPage: page < Math.ceil(totalExpenseCategories / limit),
        hasPrevPage: page > 1
      }
    };
  },
};
