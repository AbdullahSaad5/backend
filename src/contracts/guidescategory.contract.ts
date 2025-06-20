import { Model, Document } from "mongoose";

export interface IGuidesCategory extends Document {
    title: string, 
    description: string, 
    image?: string,
    isBlocked: boolean,
}

export type IGuidesCategoryModel = Model<IGuidesCategory>