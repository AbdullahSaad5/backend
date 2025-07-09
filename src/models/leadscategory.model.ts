import { Schema, model } from "mongoose";
import { ILeadsCategory, ILeadsCategoryModel } from "@/contracts/leadscategory.contract";

const LeadsCategorySchema = new Schema<ILeadsCategory, ILeadsCategoryModel>({
    title: {
        type: String,
        required: [true, "Title is required"],
        unique: true,
        maxlength: [100, "Title cannot exceed 100 characters"],
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
    isBlocked: {
        type: Boolean,
        default: false,
    },
});

export const LeadsCategoryModel = model<ILeadsCategory>("LeadsCategory", LeadsCategorySchema); 