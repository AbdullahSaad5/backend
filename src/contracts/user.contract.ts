import { Document, Model, Types } from "mongoose";
import { IUserAddress } from "./user-address.contracts";

export interface IFile {
  url: string;
  type: string;
  name?: string;
}

export interface ITeamAssignment {
  teamId: Types.ObjectId;
  priority: number; // 1 = primary, 2 = secondary, etc.
  assignedAt: Date;
}

export interface ISupervisorTeam {
  teamId: Types.ObjectId;
  assignedAt: Date;
}

export interface IUser extends Document {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  phoneNumber: string;
  dob?: string;
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
  // Team assignments
  teamAssignments: ITeamAssignment[];
  
  // Supervisor Configuration
  isSupervisor: boolean;
  supervisorTeams: ISupervisorTeam[];
  
  // Employee ID - unique 6-character alphanumeric identifier
  employeeId: string;

  // Profile Completion Fields
  // Personal Information
  gender?: "Male" | "Female" | "Other";
  emergencyPhoneNumber?: string;
  
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
  taxId?: string;
  
  // Annual Leave Configuration
  annualLeaveEntitlement?: number;
  annualLeaveCarriedForward?: number;
  annualLeaveYear?: number;
  
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
  | "userType"
  | "additionalAccessRights"
  | "restrictedAccessRights"
> & { 
  dob?: string;
  address: Partial<IUserAddress>;
  teamIds?: string[]; // Array of team IDs in priority order
  isSupervisor?: boolean; // Whether user is a supervisor
  supervisorTeamIds?: string[]; // Array of team IDs this user supervises
};

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
  taxId?: string;
  
  // Annual Leave Configuration
  annualLeaveEntitlement?: number;
  annualLeaveCarriedForward?: number;
  annualLeaveYear?: number;
};

export interface IUserMethods {
  comparePassword: (password: string) => boolean;
  hashPassword: (password: string) => string;
}

export type UserModel = Model<IUser, unknown, IUserMethods>;
