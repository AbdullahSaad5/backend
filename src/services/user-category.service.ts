import { UserCategory } from "@/models";

export const userCategoryService = {
  getAllUsersCategories: () => {
    return UserCategory.find();
  },

  createCategory: (role: string, description: string, permissions: [string], categoryType: string) => {
    const newCategory = new UserCategory({
      role,
      description,
      permissions,
      categoryType,
    });
    return newCategory.save();
  },

  editCategory: (id: string, data: { role?: string; description?: string; permissions?: [string]; categoryType?: string }) => {
    return UserCategory.findByIdAndUpdate(id, data, { new: true });
  },

  deleteCategory: (id: string) => {
    const category = UserCategory.findByIdAndDelete(id);
    if (!category) {
      throw new Error("Category not found");
    }
    return category;
  },

  getById: (id: string) => {
    return UserCategory.findById(id);
  },

  toggleBlock: async (id: string, isBlocked: boolean) => {
    console.log("block : " , isBlocked)
    console.log("id : " , id)
    const updatedCategory = await UserCategory.findByIdAndUpdate(id, { isBlocked: isBlocked }, { new: true });
    if (!updatedCategory) {
      throw new Error("Category not found");
    }
    return updatedCategory;
  },
};
