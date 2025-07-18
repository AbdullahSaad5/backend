import { GuidesCategoryModel } from "@/models/guidescategory.model";

export const GuidesCategoryService = {
  createGuidesCategory: (title: string, description: string, image: string) => {
    const newGuidesCategory = new GuidesCategoryModel({ title, description, image });
    return newGuidesCategory.save();
  },

  editGuidesCategory: (id: string, data: { title?: string; description?: string; image?: string; isBlocked?: boolean }) => {
    return GuidesCategoryModel.findByIdAndUpdate(id, data, { new: true });
  },

  deleteGuidesCategory: (id: string) => {
    const guidesCategory = GuidesCategoryModel.findByIdAndDelete(id);
    if (!guidesCategory) {
      throw new Error("Guides category not found");
    }
    return guidesCategory;
  },

  getAllGuidesCategories: () => {
    return GuidesCategoryModel.find();
  },

  getById: (id: string) => {
    return GuidesCategoryModel.findById(id);
  },
};