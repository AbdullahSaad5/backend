import { Model, Document, Types } from "mongoose";

export interface ICategory extends Document {
    name: string;
    description: string;
    image: string;
    createdAt?: Date;
    updatedAt?: Date;
}

export type ICategoryModel = Model<ICategory>;