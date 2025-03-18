import { PartCategoryUpdatePayload } from "@/contracts/part-category.contract";
import { PartCategory } from "@/models";

export const partCategoryService = {

  createCategory: (name: String, description: string, image: string, tags: string[] , isBlocked:boolean) => {
    const newPartCategory = new PartCategory({ name, description, image , tags , isBlocked});
    return newPartCategory.save();
  },

  getAllCategory: () => {
    return PartCategory.find();
  },

  getById: (id: string) => {
    return PartCategory.findById(id);
  },

  editCategory: (id: string, data: PartCategoryUpdatePayload) => {
    return PartCategory.findByIdAndUpdate(id, data, { new: true });
  },

  deleteCategory: (id: string) => {
    const category = PartCategory.findByIdAndDelete(id);
    if (!category) {
      throw new Error("Category not found");
    }
    return category;
  },

  toggleBlock: async (id: string, isBlocked: boolean) => {
    const updatedCategory = await PartCategory.findByIdAndUpdate(id, { isBlocked: isBlocked }, { new: true });
    if (!updatedCategory) {
      throw new Error("Category not found");
    }
    return updatedCategory;
  },

};

