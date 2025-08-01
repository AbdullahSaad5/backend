import { Document, Model, Types } from "mongoose";
import { IUserAddress } from "./user-address.contracts";

export interface IFile {
  originalname: string;
  encoding: string;
  mimetype: string;
  size: number;
  url: string;
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
  supplierKey?: string;
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

  // Profile Completion Fields
  // Personal Information
  gender?: "Male" | "Female" | "Other";
  emergencyPhoneNumber?: string;
  dob?: Date;
  
  // Geofencing Configuration
  geofencingRadius?: number;
  geofencingAttendanceEnabled?: boolean;
  
  // Foreign User Information
  isForeignUser?: boolean;
  countryOfIssue?: string;
  passportNumber?: string;
  passportExpiryDate?: Date;
  passportDocument?: IFile;
  visaNumber?: string;
  visaExpiryDate?: Date;
  visaDocument?: IFile;
  
  // Employment Information
  jobTitle?: string;
  employmentStartDate?: Date;
  niNumber?: string;
  
  // Profile Completion Status
  profileCompleted?: boolean;
  profileCompletionPercentage?: number;
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

export type ProfileCompletionPayload = {
  // Personal Information
  gender?: "Male" | "Female" | "Other";
  emergencyPhoneNumber?: string;
  profileImage?: string;
  dob?: string;
  
  // Geofencing Configuration
  geofencingRadius?: number;
  geofencingAttendanceEnabled?: boolean;
  
  // Foreign User Information
  isForeignUser?: boolean;
  countryOfIssue?: string;
  passportNumber?: string;
  passportExpiryDate?: string;
  passportDocument?: IFile;
  visaNumber?: string;
  visaExpiryDate?: string;
  visaDocument?: IFile;
  
  // Employment Information
  jobTitle?: string;
  employmentStartDate?: string;
  niNumber?: string;
};

export interface IUserMethods {
  comparePassword: (password: string) => boolean;
  hashPassword: (password: string) => string;
}

export type UserModel = Model<IUser, unknown, IUserMethods>;
