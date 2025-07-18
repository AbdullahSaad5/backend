import { Model, Document } from "mongoose";

export interface IComplaintCategory extends Document {
    title: string, 
    description: string, 
    image?: string,
    isBlocked: boolean,
}

export type ComplaintCategoryModel = Model<IComplaintCategory>


