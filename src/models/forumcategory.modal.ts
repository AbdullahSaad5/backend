import { Schema, model } from "mongoose";
import { ICategory, ICategoryModel } from "@/contracts/forumcategory.contracts";

const CategorySchema = new Schema<ICategory, ICategoryModel>({
    name: {
        type: String,
        required: [true, "Name is required"],
        trim: true,
        maxlength: [100, "Name cannot exceed 100 characters"],
    },
    description: {
        type: String,
        required: [true, "Description is required"],
        trim: true,
        maxlength: [500, "Description cannot exceed 500 characters"],
    },
    image: {
        type: String,
        default: "",
    },

}, { timestamps: true });

export const CategoryModel = model<ICategory>("ForumCategory", CategorySchema);
