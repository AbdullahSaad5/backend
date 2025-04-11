import { Document, Model, Types } from "mongoose";


export interface IUserAddress extends Document {
    userId: Types.ObjectId;
    country: string;
    address: string,
    label: string;
    appartment: string,
    city: string,
    postalCode: string,
    isDefault: boolean
}

export type UserAddressModel = Model<IUserAddress>;