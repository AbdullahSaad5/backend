import { ProductCategoryUpdatePayload } from "@/contracts/product-category.contract";
import { ProductCategory } from "@/models";

export const productCategoryService = {
  createCategory: (
    name: string,
    ebayCategoryId: string,
    amazonCategoryId: string,
    description: string,
    image: string,
    tags: string[],
    isBlocked: boolean,
    isPart: boolean,
    isFeatured: boolean
  ) => {
    const newProductCategory = new ProductCategory({
      name,
      ebayCategoryId,
      amazonCategoryId,
      description,
      image,
      tags,
      isBlocked,
      isPart,
      isFeatured,
    });
    return newProductCategory.save();
  },

  getAllCategory: () => {
    return ProductCategory.find();
  },
  getAllCategoryWeb: (filter: any) => {
    return ProductCategory.find(filter);
  },

  getById: (id: string) => {
    return ProductCategory.findById(id);
  },

  editCategory: (id: string, data: ProductCategoryUpdatePayload) => {
    return ProductCategory.findByIdAndUpdate(id, data, { new: true });
  },

  deleteCategory: async (id: string) => {
    const category = await ProductCategory.findByIdAndDelete(id);
    if (!category) {
      throw new Error("Category not found");
    }
    return category;
  },

  toggleBlock: async (id: string, isBlocked: boolean) => {
    const updatedCategory = await ProductCategory.findByIdAndUpdate(id, { isBlocked }, { new: true });
    if (!updatedCategory) {
      throw new Error("Category not found");
    }
    return updatedCategory;
  },

  toggleFeatured: async (id: string, isFeatured: boolean) => {
    // If trying to feature a category, check if we already have 4 featured categories
    if (isFeatured) {
      const featuredCount = await ProductCategory.countDocuments({ isFeatured: true });
      if (featuredCount >= 4) {
        throw new Error("Maximum of 4 categories can be featured at a time");
      }
    }

    const updatedCategory = await ProductCategory.findByIdAndUpdate(id, { isFeatured }, { new: true });
    if (!updatedCategory) {
      throw new Error("Category not found");
    }
    return updatedCategory;
  },
};
