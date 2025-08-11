import { Document, Model, Types } from "mongoose";


export type UserCategoryType = "admin" | "super admin" | "customer" | "supplier" | "other";

export interface IUserCategory extends Document {
    _id: Types.ObjectId;
    role: string;
    description?: string;
    permissions: string[];
    isBlocked: boolean;
    categoryType: UserCategoryType;
    // isSupplier: boolean;
}


export type UserCategoryUpdatePayload = Partial<Pick<IUserCategory , "role" | "description" | "permissions" | "categoryType">>

export type UserCategoryModel = Model<IUserCategory>;
