import { Model, Document } from "mongoose";

export interface IFaqCategory extends Document {
    title: string, 
    description: string, 
    image?: string,
    isBlocked: boolean,
}

export type IFaqCategoryModel = Model<IFaqCategory>