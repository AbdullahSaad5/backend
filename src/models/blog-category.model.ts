import mongoose, { Schema, model, Document } from "mongoose";
import { IBlogcategory, BlogcategoryModel } from "@/contracts/blog-category.contract";
import { fileSchema } from "./user.model";

const blogcategorySchema = new Schema<IBlogcategory, BlogcategoryModel>({
  name: { type: String, required: true , lowercase: true},
  description: { type: String },
  image: { type: String },
  isBlocked: { type: Boolean, default: false },
});

export const BlogCategory = model("BlogCategory", blogcategorySchema);