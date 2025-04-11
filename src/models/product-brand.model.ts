import { IProductBrand, ProductBrandModel } from "@/contracts/product-brand.contract";
import { Schema, model } from "mongoose";

const productBrandSchema = new Schema<IProductBrand, ProductBrandModel>(
  {
    name: { type: String, required: true },
    description: { type: String },
    logo: { type: String },
    isBlocked: { type: Boolean, default: false },
  },
  {
    timestamps: true,
  }
);

export const ProductBrand = model<IProductBrand, ProductBrandModel>("ProductBrand", productBrandSchema);
