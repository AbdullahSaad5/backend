import { getZodErrors } from "@/utils/get-zod-errors.util";
import { NextFunction, Response, Request } from "express";
import { ReasonPhrases, StatusCodes } from "http-status-codes";
import { z, ZodSchema } from "zod";
import {
  IUser,
  UserCreatePayload,
  UserUpdatePayload,
  ProfileCompletionPayload,
} from "@/contracts/user.contract";
import { Types } from "mongoose";
import { IBodyRequest } from "@/contracts/request.contract";
import { REGEX } from "@/constants/regex";
import { ENUMS } from "@/constants/enum";

// Custom Zod validation for MongoDB ObjectId
const objectId = z
  .instanceof(Types.ObjectId)
  .or(z.string().regex(/^[0-9a-fA-F]{24}$/, "Invalid ObjectId"));

export const userValidation = {
  // create new user validation
  createUser: async (
    req: IBodyRequest<UserCreatePayload>,
    res: Response,
    next: NextFunction
  ) => {
    // Define the address schema
    const addressSchema = z.object({
      userId: z.string().optional(),
      country: z.string().trim().optional(),
      address: z.string().trim().optional(),
      county: z.string().trim().optional(),
      appartment: z.string().trim().optional(),
      city: z.string().trim().optional(),
      postalCode: z.string().trim().optional(),
      longitude: z.number().optional(),
      latitude: z.number().optional(),
      isDefault: z.boolean().optional(),
    });

    const schema: ZodSchema = z.object({
      firstName: z.string().trim().min(3, "First name is required"),
      lastName: z.string().trim().min(3, "Last name is required"),
      email: z
        .string()
        .trim()
        .min(3, "Email is required")
        .regex(REGEX.EMAIL, "Invalid email format"),
      password: z
        .string()
        .regex(
          REGEX.PASSWORD,
          "(A-Z) (a-z) (0-9) (one charcter) (between 8-20)"
        ),
      additionalAccessRights: z.array(z.string()).optional(),
      restrictedAccessRights: z.array(z.string()).optional(),
      phoneNumber: z.string().trim().min(3, "Phone number is required"),
      dob: z.string().optional(),
      // userType: z.objectId(),
      address: z.array(addressSchema).optional(),
    });
    try {
      const validatedData = schema.parse(req.body);
      Object.assign(req.body, validatedData);
      next();
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        const { message, issues } = getZodErrors(error);

        return res.status(StatusCodes.BAD_REQUEST).json({
          message: ReasonPhrases.BAD_REQUEST,
          status: StatusCodes.BAD_REQUEST,
          issueMessage: message,
          issues: issues,
        });
      } else {
        return res.status(StatusCodes.BAD_REQUEST).json({
          message: ReasonPhrases.BAD_REQUEST,
          status: StatusCodes.BAD_REQUEST,
        });
      }
    }
  },

  // update user validation
  updateUser: async (
    req: IBodyRequest<UserUpdatePayload>,
    res: Response,
    next: NextFunction
  ) => {
    // Create a partial schema for updates
    const schema: ZodSchema = z
      .object({
        firstName: z
          .string()
          .trim()
          .min(3, "First name is required")
          .max(50, "First name should not exceed then 50 char")
          .optional(),
        lastName: z
          .string()
          .trim()
          .min(3, "Last name is required")
          .max(50, "Last name should not exceed then 50 char")
          .optional(),
        email: z
          .string()
          .regex(REGEX.EMAIL, "Invalid email format")
          .max(50, "Email should not exceed then 50 char")
          .optional(),
        password: z
          .string()
          .regex(
            REGEX.PASSWORD,
            "(A-Z) (a-z) (0-9) (one character) (between 8-20)"
          )
          .optional(),
        signUpThrough: z.enum(["Google", "Apple", "Web"]).optional(),
        profileImage: z.string().optional(),
        EmailVerifiedOTP: z.string().optional(),
        EmailVerifiedOTPExpiredAt: z.date().optional(),
        isEmailVerified: z.boolean().optional(),
        EmailVerifiedAt: z.date().optional(),
        userType: objectId.optional(), // Reference to UserCategory
        additionalAccessRights: z.array(z.string()).optional(),
        restrictedAccessRights: z.array(z.string()).optional(),
        phoneNumber: z.string().optional(),
        dob: z.string().optional(),
      })
      .partial(); // Use `.partial()` to allow partial updates
    try {
      const validatedData = schema.parse(req.body);
      Object.assign(req.body, validatedData);
      next();
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        const { message, issues } = getZodErrors(error);

        return res.status(StatusCodes.BAD_REQUEST).json({
          message: ReasonPhrases.BAD_REQUEST,
          status: StatusCodes.BAD_REQUEST,
          issueMessage: message,
          issues: issues,
        });
      } else {
        return res.status(StatusCodes.BAD_REQUEST).json({
          message: ReasonPhrases.BAD_REQUEST,
          status: StatusCodes.BAD_REQUEST,
        });
      }
    }
  },

  // Profile completion validation
  profileCompletion: async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    const fileSchema = z.object({
      url: z.string(),
      type: z.string(),
      name: z.string().optional(),
    }).optional();

    const schema: ZodSchema = z.object({
      // Personal Information
      gender: z.string().optional().transform((val) => {
        // Convert empty string to undefined
        return val === "" ? undefined : val;
      }).pipe(z.enum(["Male", "Female", "Other"]).optional()),
      emergencyPhoneNumber: z.string().trim().optional(),
      profileImage: z.string().optional(),
      dob: z.string().optional(),
      
      // Geofencing Configuration
      geofencingRadius: z.number().min(100).max(1000).optional(),
      geofencingAttendanceEnabled: z.boolean().optional(),
      
      // Employment Information - Make optional for step-by-step updates
      jobTitle: z.string().trim().optional(),
      employmentStartDate: z.string().optional(),
      niNumber: z.string().trim().optional(),
      taxId: z.string().trim().optional(),
      
      // Foreign User Information
      isForeignUser: z.boolean().optional(),
      countryOfIssue: z.string().trim().optional(),
      passportNumber: z.string().trim().optional(),
      passportExpiryDate: z.string().optional(),
      passportDocument: z.union([fileSchema, z.null()]).optional(),
      visaNumber: z.string().trim().optional(),
      visaExpiryDate: z.string().optional(),
      visaDocument: z.union([fileSchema, z.null()]).optional(),
    }).refine((data) => {
      // Validate DOB - must be at least 18 years ago and not in future
      if (data.dob) {
        const dobDate = new Date(data.dob);
        const today = new Date();
        const minAgeDate = new Date();
        minAgeDate.setFullYear(today.getFullYear() - 18);
        
        if (dobDate > today) {
          throw new Error("Date of birth cannot be in the future");
        }
        if (dobDate > minAgeDate) {
          throw new Error("User must be at least 18 years old");
        }
      }
      
      // Validate employment start date - cannot be in future
      if (data.employmentStartDate) {
        const startDate = new Date(data.employmentStartDate);
        const today = new Date();
        
        if (startDate > today) {
          throw new Error("Employment start date cannot be in the future");
        }
      }
      
      // Validate NI number format only if it's provided
      if (data.niNumber && data.niNumber.trim()) {
        const niRegex = /^[A-Z]{2}\d{6}[A-Z]$/;
        if (!niRegex.test(data.niNumber)) {
          throw new Error("NI number must be in format: 2 letters, 6 numbers, 1 letter (e.g., QQ123456B)");
        }
      }
      
      // Validate foreign user fields if isForeignUser is true
      if (data.isForeignUser === true) {
        if (!data.countryOfIssue || data.countryOfIssue.trim() === '') {
          throw new Error("Country of issue is required for foreign employees");
        }
        if (!data.passportNumber || data.passportNumber.trim() === '') {
          throw new Error("Passport number is required for foreign employees");
        }
        if (!data.passportExpiryDate) {
          throw new Error("Passport expiry date is required for foreign employees");
        }
        if (!data.visaNumber || data.visaNumber.trim() === '') {
          throw new Error("Visa number is required for foreign employees");
        }
        if (!data.visaExpiryDate) {
          throw new Error("Visa expiry date is required for foreign employees");
        }
      }
      
      return true;
    });

    try {
      const validatedData = schema.parse(req.body);
      Object.assign(req.body, validatedData);
      next();
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        const { message, issues } = getZodErrors(error);

        return res.status(StatusCodes.BAD_REQUEST).json({
          message: ReasonPhrases.BAD_REQUEST,
          status: StatusCodes.BAD_REQUEST,
          issueMessage: message,
          issues: issues,
        });
      } else {
        return res.status(StatusCodes.BAD_REQUEST).json({
          message: ReasonPhrases.BAD_REQUEST,
          status: StatusCodes.BAD_REQUEST,
          issueMessage: error.message,
        });
      }
    }
  },

  // ID validation for get/delete
  validateId: (
    req: IBodyRequest<string>,
    res: Response,
    next: NextFunction
  ) => {
    const schema = z.object({
      id: objectId,
    });
    try {
      const validatedData = schema.parse(req.params);
      Object.assign(req.params, validatedData);
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        const { message, issues } = getZodErrors(error);
        return res.status(StatusCodes.BAD_REQUEST).json({
          message: ReasonPhrases.BAD_REQUEST,
          status: StatusCodes.BAD_REQUEST,
          issueMessage: message,
          issues: issues,
        });
      } else {
        return res.status(StatusCodes.BAD_REQUEST).json({
          message: ReasonPhrases.BAD_REQUEST,
          status: StatusCodes.BAD_REQUEST,
        });
      }
    }
  },
};
