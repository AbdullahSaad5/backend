import { Document, Model, Types } from "mongoose";
import { IUserAddress } from "./user-address.contracts";

export interface IFile {
  originalname: string;
  encoding: string;
  mimetype: string;
  size: number;
  url: string;
  type: string;
  type: string;
  filename: string;
}

export interface IUser extends Document {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  phoneNumber: string;
  dob: string;
  SupplierKey?: string;
  // address: Types.ObjectId
  signUpThrough: string;
  profileImage?: string;
  EmailVerifiedOTP?: string;
  EmailVerifiedOTPExpiredAt?: Date;
  isEmailVerified: boolean;
  EmailVerifiedAt: Date;
  userType: Types.ObjectId;
  supplierCategory: Types.ObjectId;
  additionalAccessRights: string[];
  restrictedAccessRights: string[];
  resetPasswordToken?: string;
  resetPasswordExpires?: number;
  isBlocked: boolean;
  additionalDocuments: [IFile];
  // isSupplier: boolean;
}

export type UserCreatePayload = Pick<
  IUser,
  | "firstName"
  | "lastName"
  | "email"
  | "password"
  | "phoneNumber"
  | "dob"
  | "userType"
  | "additionalAccessRights"
  | "restrictedAccessRights"
> & { address: Partial<IUserAddress> };

export type UserUpdatePayload = Partial<UserCreatePayload>;

export interface IUserMethods {
  comparePassword: (password: string) => boolean;
  hashPassword: (password: string) => string;
}

export type UserModel = Model<IUser, unknown, IUserMethods>;
