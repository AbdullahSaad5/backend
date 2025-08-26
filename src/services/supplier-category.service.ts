import { IFile } from "@/contracts/user.contract";
import { User, SupplierCategory } from "@/models";

export const supplierCategoryService = {
  createCategory: (name: String, description: string, image: string, productCategories?: string[], productType?: string) => {
    const newSupplierCategory = new SupplierCategory({ name, description, image, productCategories, productType });
    return newSupplierCategory.save();
  },

  editCategory: (id: string, data: { name?: string; description?: string; image?: string; productCategories?: string[]; productType?: string }) => {
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
    return SupplierCategory.find().populate('productCategories', 'name image');
  },

  getById: (id: string) => {
    return SupplierCategory.findById(id).populate('productCategories', 'name image');
  },

  toggleBlock: async (id: string, isBlocked: boolean) => {
    const updatedCategory = await SupplierCategory.findByIdAndUpdate(id, { isBlocked: isBlocked }, { new: true });
    if (!updatedCategory) {
      throw new Error("Category not found");
    }
    return updatedCategory;
  },
};
