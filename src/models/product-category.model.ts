import { IProductCategory, ProductCategoryModel } from "@/contracts/product-category.contract";
import { Schema, model } from "mongoose";

const productCategorySchema = new Schema<IProductCategory, ProductCategoryModel>(
  {
    name: { type: String, required: true, lowercase: true },
    ebayCategoryId: { type: String },
    amazonCategoryId: { type: String },
    description: { type: String, required: true },
    image: { type: String },
    tags: { type: [String] },
    isBlocked: { type: Boolean, default: false },
    isPart: { type: Boolean, default: false },
    isFeatured: { type: Boolean, default: false },
  },
  {
    timestamps: true,
  }
);

export const ProductCategory = model<IProductCategory, ProductCategoryModel>("ProductCategory", productCategorySchema);
