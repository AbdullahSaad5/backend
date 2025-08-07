import { Schema, model } from "mongoose";
import { ICategory, ICategoryModel } from "@/contracts/forumcategory.contracts";

const CategorySchema = new Schema<ICategory, ICategoryModel>({
    name: {
        type: String,
        required: [true, "Name is required"],
        trim: true,
        maxlength: [100, "Name cannot exceed 100 characters"],
    },

}, { timestamps: true });

export const CategoryModel = model<ICategory>("ForumCategory", CategorySchema);

