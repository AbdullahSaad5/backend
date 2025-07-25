import { Document, Model } from "mongoose";

export interface IWorkmode extends Document {
    modeName: string;
    description?: string;
    employees: string[]; // Array of User ObjectIds
    createdAt?: Date;
    updatedAt?: Date;
}

export type WorkmodeModel = Model<IWorkmode>; 