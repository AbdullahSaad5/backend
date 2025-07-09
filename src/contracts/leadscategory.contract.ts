import { Model, Document } from "mongoose";

export interface ILeadsCategory extends Document {
    title: string,
    description: string,
    image?: string,
    isBlocked: boolean,
}

export type ILeadsCategoryModel = Model<ILeadsCategory> 