import { ExpenseCategory } from "@/models/expensecategory.model";

export const ExpenseCategoryService = {
  createExpensecategory: (title: String, description: string, image: string, isSystemGenerated: boolean) => {
    const newExpensecategory = new ExpenseCategory({ title, description, image, isSystemGenerated });
    return newExpensecategory.save();
  },

  editExpensecategory: (id: string, data: { title?: string; description?: string; image?: string, isSystemGenerated?: boolean }) => {
    return ExpenseCategory.findByIdAndUpdate(id, data, { new: true });
  },
  deleteExpensecategory: (id: string) => {
    const Expensecategory = ExpenseCategory.findByIdAndDelete(id);
    if (!Expensecategory) {
      throw new Error("Expensecategory not found");
    }
    return Expensecategory;
  },

  getAllExpensecategory: () => {
    return ExpenseCategory.find();
  },

  getById: (id: string) => {
    return ExpenseCategory.findById(id);
  },

  
};
