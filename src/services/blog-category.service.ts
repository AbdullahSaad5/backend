import { BlogCategory } from "@/models/blog-category.model";

export const BlogCategoryService = {
  createCategory: (name: String, description: string, image: string) => {
    const newBlogCategory = new BlogCategory({ name, description, image });
    return newBlogCategory.save();
  },

  editCategory: (id: string, data: { name?: string; description?: string; image?: string }) => {
    return BlogCategory.findByIdAndUpdate(id, data, { new: true });
  },

  deleteCategory: (id: string) => {
    const category = BlogCategory.findByIdAndDelete(id);
    if (!category) {
      throw new Error("Category not found");
    }
    return category;
  },

  getAllCategory: () => {
    return BlogCategory.find();
  },

  getById: (id: string) => {
    return BlogCategory.findById(id);
  },

  toggleBlock: async (id: string, isBlocked: boolean) => {
    const updatedCategory = await BlogCategory.findByIdAndUpdate(id, { isBlocked: isBlocked }, { new: true });
    if (!updatedCategory) {
      throw new Error("Category not found");
    }
    return updatedCategory;
  },
};
