import { Document, Model, Types } from "mongoose";


export interface IUserCategory extends Document {
    _id: Types.ObjectId;
    role: string;
    description?: string;
    permissions: string[];
    isBlocked: boolean;
    // isSupplier: boolean;
}


export type UserCategoryUpdatePayload = Partial<Pick<IUserCategory , "role" | "description" | "permissions">>

export type UserCategoryModel = Model<IUserCategory>;
