import mongoose, { Schema, model , Document } from "mongoose";
import { IUserCategory , UserCategoryModel } from "@/contracts/user-category.contract";


const userCategorySchema = new Schema<IUserCategory >({
    role: { type: String, required: true, lowercase: true , unique: true},
    description: { type: String },
    permissions: { type: [String], required: true },
    isBlocked: { type: Boolean, default: false },
    categoryType: { type: String, required: true, lowercase: true, enum: ["admin", "super admin", "customer", "supplier", "other"] },
}, { timestamps: true });

export const UserCategory = model<IUserCategory , UserCategoryModel>('UserCategory', userCategorySchema);

