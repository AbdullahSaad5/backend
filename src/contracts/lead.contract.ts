import { Model, Document, Types } from "mongoose";

export interface ILead extends Document {
    name: string;
    email: string;
    phoneNumber?: string;
    source?: string;
    purpose?: string;
    description?: string;
    status: "new" | "Contacted" | "Converted" | "Lost";
    assignedTo?: Types.ObjectId[];
    leadCategory: Types.ObjectId;
    createdAt?: Date;
    updatedAt?: Date;
}

export type ILeadModel = Model<ILead>; 