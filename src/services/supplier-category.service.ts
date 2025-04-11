import { IFile } from "@/contracts/user.contract";
import { User, SupplierCategory } from "@/models";

export const supplierCategoryService = {
  createCategory: (name: String, description: string, image: string) => {
    const newSupplierCategory = new SupplierCategory({ name, description, image });
    return newSupplierCategory.save();
  },

  editCategory: (id: string, data: { name?: string; description?: string; image?: string }) => {
    return SupplierCategory.findByIdAndUpdate(id, data, { new: true });
  },

  deleteCategory: (id: string) => {
    const category = SupplierCategory.findByIdAndDelete(id);
    if (!category) {
      throw new Error("Category not found");
    }
    return category;
  },

  getAllCategory: () => {
    return SupplierCategory.find();
  },

  getById: (id: string) => {
    return SupplierCategory.findById(id);
  },

  toggleBlock: async (id: string, isBlocked: boolean) => {
    const updatedCategory = await SupplierCategory.findByIdAndUpdate(id, { isBlocked: isBlocked }, { new: true });
    if (!updatedCategory) {
      throw new Error("Category not found");
    }
    return updatedCategory;
  },
};
