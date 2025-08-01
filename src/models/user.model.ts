import mongoose, { Schema, model } from "mongoose";
import { REGEX } from "@/constants/regex";
import { compareSync, hashSync } from "bcrypt";
import { ENUMS } from "@/constants/enum";
import { IUser, IUserMethods, UserModel } from "@/contracts/user.contract";

const validateEmail = (email: string) => REGEX.EMAIL.test(email);

// NI Number validation function
const validateNINumber = (niNumber: string) => {
  const niRegex = /^[A-Z]{2}\d{6}[A-Z]$/;
  return niRegex.test(niNumber);
};

export const fileSchema = {
  originalname: { type: String },
  encoding: { type: String },
  mimetype: { type: String },
  size: { type: Number },
  url: { type: String },
  type: { type: String },
  filename: { type: String },
};

const schema = new Schema<IUser, UserModel, IUserMethods>(
  {
    firstName: { type: String, required: true },
    lastName: { type: String },
    email: {
      type: String,
      required: true,
      lowercase: true,
      validate: {
        validator: validateEmail,
        message: "Invalid email format",
      },
    },
    password: { type: String, select: false },
    phoneNumber: { type: String },
    dob: { type: String },
    signUpThrough: {
      type: String,
      enum: ENUMS.SIGNUP_THROUGH,
      required: true,
      default: "Web",
    },
    profileImage: { type: String },
    isEmailVerified: { type: Boolean, default: false },
    EmailVerifiedAt: { type: Date },
    userType: { type: Schema.Types.ObjectId, ref: "UserCategory" },

    supplierCategory: {
      type: Schema.Types.ObjectId,
      ref: "SupplierCategory",
    },
    additionalAccessRights: { type: [String], default: [] },
    restrictedAccessRights: { type: [String], default: [] },
    resetPasswordToken: { type: String },
    resetPasswordExpires: { type: Number },
    additionalDocuments: { type: [fileSchema], _id: false },
    isBlocked: { type: Boolean, default: false },

    // supplierKey added but not required by default
    supplierKey: { type: String },

    // Profile Completion Fields
    // Personal Information
    gender: { 
      type: String, 
      enum: ["Male", "Female", "Other"]
    },
    emergencyPhoneNumber: { type: String },
    dob: { type: Date },
    
    // Geofencing Configuration
    geofencingRadius: { 
      type: Number, 
      min: 100, 
      max: 1000, 
      default: 500
    },
    geofencingAttendanceEnabled: { 
      type: Boolean, 
      default: false
    },
    
    // Foreign User Information
    isForeignUser: { 
      type: Boolean, 
      default: false
    },
    countryOfIssue: { type: String },
    passportNumber: { type: String },
    passportExpiryDate: { type: Date },
    passportDocument: { type: fileSchema, _id: false },
    visaNumber: { type: String },
    visaExpiryDate: { type: Date },
    visaDocument: { type: fileSchema, _id: false },
    
    // Employment Information
    jobTitle: { type: String },
    employmentStartDate: { type: Date },
    niNumber: { 
      type: String, 
      validate: {
        validator: validateNINumber,
        message: "NI number must be in format: 2 letters, 6 numbers, 1 letter (e.g., QQ123456B)"
      }
    },
    
    // Profile Completion Status
    profileCompleted: { 
      type: Boolean, 
      default: false
    },
    profileCompletionPercentage: { 
      type: Number, 
      min: 0, 
      max: 100, 
      default: 0
    },
  },
  { timestamps: true }
);

// Middleware to enforce supplierKey requirement for Supplier userType
schema.pre("save", async function (next) {
  if (!this.userType) return next(); // If userType is not set, skip

  try {
    const userCategory = await mongoose
      .model("UserCategory")
      .findById(this.userType);

    if (
      userCategory &&
      userCategory.role.toLowerCase() === "supplier" &&
      !this.supplierKey
    ) {
      return next(new Error("supplierKey is required for Supplier userType"));
    }

    next();
  } catch (error: any) {
    return next(error);
  }
});

schema.methods.hashPassword = function (password: string) {
  return hashSync(password, 10);
};

schema.methods.comparePassword = function (password: string) {
  return compareSync(password, this.password);
};

export const User = model<IUser, UserModel>("User", schema);
