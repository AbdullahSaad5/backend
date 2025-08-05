import FeaturedCategoryModel from "@/models/featured-category.model";
import { IFeaturedCategory } from "@/contracts/featured-category.contract";

export const featuredCategoryService = {
  // Create a new featured category
  createCategory: async (data: Partial<IFeaturedCategory>): Promise<IFeaturedCategory> => {
    const category = await FeaturedCategoryModel.create(data);
    return category;
  },

  // Get all featured categories
  getCategories: async (): Promise<IFeaturedCategory[]> => {
    return FeaturedCategoryModel.find().sort({ createdAt: -1 }).exec();
  },

  // Get active categories only
  getActiveCategories: async (): Promise<IFeaturedCategory[]> => {
    return FeaturedCategoryModel.find({ status: "active" }).sort({ createdAt: -1 }).exec();
  },

  // Update a featured category
  updateCategory: async (id: string, data: Partial<IFeaturedCategory>): Promise<IFeaturedCategory | null> => {
    return FeaturedCategoryModel.findByIdAndUpdate(id, data, { new: true });
  },

  // Delete a featured category
  deleteCategory: async (id: string): Promise<boolean> => {
    const result = await FeaturedCategoryModel.findByIdAndDelete(id);
    return !!result;
  },
};
