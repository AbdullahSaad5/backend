import { Document, Model, Types } from "mongoose";
import { IFile } from "./user.contract";

export interface IBlogcategory extends Document {
    name: string;
    description?: string;
    image: string;
    isBlocked: boolean;
}

export type BlogcategoryModel = Model<IBlogcategory>;
