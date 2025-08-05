import { Document, Model, Types } from "mongoose";

export interface ITeam extends Document {
    _id: Types.ObjectId;
    name: string;
    userCategoryId: Types.ObjectId;
    description?: string;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
}

export type TeamCreatePayload = {
    name: string;
    userCategoryId: string;
    description?: string;
};

export type TeamUpdatePayload = Partial<Pick<ITeam, "name" | "description" | "isActive">>;

export type TeamModel = Model<ITeam>;
