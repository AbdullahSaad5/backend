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
  
  // Right to Work Information
  rightToWorkType?: "british_national_ilr" | "visa_holder";
  countryOfIssue?: string;
  passportNumber?: string;
  passportExpiryDate?: Date;
  visaNumber?: string;
  visaExpiryDate?: Date;
  employmentDocuments?: Array<IFile & { documentType?: string }>;
  
  // Employment Information
  jobTitle?: string;
  employmentStartDate?: Date;
  niNumber?: string;
  
  // Annual Leave Configuration
  annualLeaveEntitlement?: number;
  annualLeaveCarriedForward?: number;
  annualLeaveYear?: number;
  
  // Skills Information - Commented out - may be needed in future
  // skills?: string[];
  
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
  
  // Right to Work Information
  rightToWorkType?: "british_national_ilr" | "visa_holder";
  countryOfIssue?: string;
  passportNumber?: string;
  passportExpiryDate?: string;
  visaNumber?: string;
  visaExpiryDate?: string;
  employmentDocuments?: Array<IFile & { documentType?: string }>;
  
  // Employment Information
  jobTitle?: string;
  employmentStartDate?: string;
  niNumber?: string;
  
  // Annual Leave Configuration
  annualLeaveEntitlement?: number;
  annualLeaveCarriedForward?: number;
  annualLeaveYear?: number;
  
  // Skills Information - Commented out - may be needed in future
  // skills?: string[];
};

export interface IUserMethods {
  comparePassword: (password: string) => boolean;
  hashPassword: (password: string) => string;
}

export type UserModel = Model<IUser, unknown, IUserMethods>;
