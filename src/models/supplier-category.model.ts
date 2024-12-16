import mongoose, { Schema, model, Document } from "mongoose";
import { ISupplierCategory, SupplierCategoryModel } from "@/contracts/supplier-category.contract";
import { fileSchema } from "./user.model";

const supplierCategorySchema = new Schema<ISupplierCategory, SupplierCategoryModel>({
  name: { type: String, required: true , unique: true },
  description: { type: String },
  image: { type: String },
  isBlocked: { type: Boolean, default: false },
});

export const SupplierCategory = model("SupplierCategory", supplierCategorySchema);
