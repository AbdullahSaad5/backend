import mongoose, { Schema, model , Document } from "mongoose";
import { IUserCategory , UserCategoryModel } from "@/contracts/user-category.contract";


const userCategorySchema = new Schema<IUserCategory >({
    role: { type: String, required: true , unique: true , lowercase: true},
    description: { type: String },
    permissions: { type: [String], required: true }, 
    isBlocked: { type: Boolean, default: false },
}, { timestamps: true });

export const UserCategory = model<IUserCategory , UserCategoryModel>('UserCategory', userCategorySchema);

