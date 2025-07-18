
import { FaqCategoryModel } from "@/models/faqcategory.model";

export const FaqCategoryService = {
  createFaqCategory: (title: string, description: string, image: string) => {
    const newFaqCategory = new FaqCategoryModel({ title, description, image });
    return newFaqCategory.save();
  },

  editFaqCategory: (id: string, data: { title?: string; description?: string; image?: string; isBlocked?: boolean }) => {
    return FaqCategoryModel.findByIdAndUpdate(id, data, { new: true });
  },

  deleteFaqCategory: (id: string) => {
    const faqCategory = FaqCategoryModel.findByIdAndDelete(id);
    if (!faqCategory) {
      throw new Error("FAQ category not found");
    }
    return faqCategory;
  },

  getAllFaqCategories: () => {
    return FaqCategoryModel.find();
  },

  getById: (id: string) => {
    return FaqCategoryModel.findById(id);
  },
};