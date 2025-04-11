import { Document, Model, Types } from "mongoose";
import { IFile, IUser } from "./user.contract";

export type supplierAddPayload = Pick<
  IUser,
  | "firstName"
  | "lastName"
  | "email"
  | "password"
  | "phoneNumber"
  | "supplierCategory"
  | "userType"
  | "additionalDocuments"
> & { address: ISupplierAddress };

export interface ISupplierAddress extends Document {
  userId: Types.ObjectId;
  country: string;
  address: string;
  label: string;
  appartment: string;
  city: string;
  postalCode: string;
  isDefault: boolean;
}
