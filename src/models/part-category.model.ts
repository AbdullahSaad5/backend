import { IPartCategory, PartCategoryModel } from "@/contracts/part-category.contract";
import {Schema , model } from "mongoose";


const partCategorySchema = new Schema<IPartCategory , PartCategoryModel>(
    {
      name: { type: String, required: true , unique: true , lowercase: true},
      description: { type: String, required: true },
      image: { type: String },
      tags: { type: [String] },
      isBlocked: { type: Boolean, default: false },
    },
    {
      timestamps: true,
    }
);

export const PartCategory = model<IPartCategory , PartCategoryModel>('PartCategory', partCategorySchema);