import { ProductCategoryUpdatePayload } from "@/contracts/product-category.contract";
import { ProductCategory } from "@/models";

export const productCategoryService = {
  createCategory: (
    name: String,
    ebayCategoryId: string,
    // ebayCategoryId: string,
    description: string,
    image: string,
    tags: string[],
    isBlocked: boolean,
    isPart: boolean
  ) => {
    const newProductCategory = new ProductCategory({
      name,
      ebayCategoryId,
      // ebayCategoryId,
      description,
      image,
      tags,
      isBlocked,
      isPart,
    });
    return newProductCategory.save();
  },

  getAllCategory: () => {
    return ProductCategory.find();
  },

  getById: (id: string) => {
    return ProductCategory.findById(id);
  },

  editCategory: (id: string, data: ProductCategoryUpdatePayload) => {
    return ProductCategory.findByIdAndUpdate(id, data, { new: true });
  },

  deleteCategory: (id: string) => {
    const category = ProductCategory.findByIdAndDelete(id);
    if (!category) {
      throw new Error("Category not found");
    }
    return category;
  },

  toggleBlock: async (id: string, isBlocked: boolean) => {
    const updatedCategory = await ProductCategory.findByIdAndUpdate(id, { isBlocked: isBlocked }, { new: true });
    if (!updatedCategory) {
      throw new Error("Category not found");
    }
    return updatedCategory;
  },
};
