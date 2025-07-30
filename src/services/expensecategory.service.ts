import { IExpenseModel } from "@/models/expensecategory.model";

export const ExpenseCategoryService = {
  createExpensecategory: (title: String, description: string, image: string, isSystemGenerated: boolean) => {
    const newExpensecategory = new IExpenseModel({ title, description, image, isSystemGenerated });
    return newExpensecategory.save();
  },

  editExpensecategory: (id: string, data: { title?: string; description?: string; image?: string, isSystemGenerated?: boolean }) => {
    return IExpenseModel.findByIdAndUpdate(id, data, { new: true });
  },
  deleteExpensecategory: (id: string) => {
    const Expensecategory = IExpenseModel.findByIdAndDelete(id);
    if (!Expensecategory) {
      throw new Error("Expensecategory not found");
    }
    return Expensecategory;
  },

  getAllExpensecategory: () => {
    return IExpenseModel.find();
  },

  getById: (id: string) => {
    return IExpenseModel.findById(id);
  },

  
};
