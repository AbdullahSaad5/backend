import { getZodErrors } from "@/utils/get-zod-errors.util";
import { NextFunction, Response } from "express";
import { ReasonPhrases, StatusCodes } from "http-status-codes";
import { z, ZodSchema } from "zod";
import { IUser, UserCreatePayload } from "@/contracts/user.contract";
import { UserRegisterPayload, UserLoginPayload , UserUpdateProfilePayload } from "@/contracts/user-auth.contract";
import { IBodyRequest } from "@/contracts/request.contract";
import { REGEX } from "@/constants/regex";
import { ENUMS } from "@/constants/enum";
import { Types } from "mongoose";

const objectId = z.instanceof(Types.ObjectId).or(z.string().regex(/^[0-9a-fA-F]{24}$/, "Invalid ObjectId"));

export const authValidation = {
  // Validation for user registration
  registerUser: async (req: IBodyRequest<UserRegisterPayload>, res: Response, next: NextFunction) => {
    const schema: ZodSchema = z.object({
      firstName: z.string().trim().min(3, "First name is required"),
      lastName: z.string().trim().min(3, "Last name is required"),
      email: z.string().trim().min(3, "Email is required").regex(REGEX.EMAIL, "Invalid email format"),
      phoneNumber: z.string().trim().optional(),
      password: z.string().regex(REGEX.PASSWORD, "(A-Z) (a-z) (0-9) (one charcter) (between 8-20)").optional(),
      signUpThrough: z.enum(["Google", "Apple", "Web"]).default("Web"),
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

  // Validation for user login
  loginUser: async (req: IBodyRequest<UserLoginPayload>, res: Response, next: NextFunction) => {
    const schema: ZodSchema = z.object({
      email: z.string().trim().min(3, "Email is required").regex(REGEX.EMAIL, "Invalid email format"),
      password: z.string().regex(REGEX.PASSWORD, "(A-Z) (a-z) (0-9) (one charcter) (between 8-20)"),
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


  

  // Validation for update profile
  updateProfile: async (req: IBodyRequest<UserUpdateProfilePayload>, res: Response, next: NextFunction) => {

    // Define the address schema
  const addressSchema =  z.object({
    userId: z.string().optional(), // Optional if it's an update; otherwise, it's for new addresses
    county: z.string().trim().min(3, "County must be at least 3 characters").optional(),
    street: z.string().trim().min(3, "Street must be at least 3 characters").optional(),
    city: z.string().trim().min(2, "City must be at least 2 characters").optional(),
    state: z.string().trim().min(2, "State must be at least 2 characters").optional(),
    postalCode: z.string().trim().optional(),
    country: z.string().trim().min(2, "Country must be at least 2 characters").optional(),
    isDefault: z.boolean().optional(),
  })

    const schema: ZodSchema = z.object({
      firstName: z.string().trim().min(3, "First name is required").optional(),
      lastName: z.string().trim().min(3, "Last name is required").optional(),
      phoneNumber: z.string().trim().optional(),
      profileImage: z.string().url("Invalid URL format for profile image").optional(),
      dob: z.date().optional(),
      oldPassword: z.string().optional(),
      newPassword: z.string().regex(REGEX.PASSWORD, "(A-Z) (a-z) (0-9) (one charcter) (between 8-20)").optional(),
      address: addressSchema.optional(),
    })
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

  // Validation for user forgot password
  forgotPassword: async (req: IBodyRequest<{ email: string }>, res: Response, next: NextFunction) => {
    const schema: ZodSchema = z.object({
      email: z.string().trim().min(3, "Email is required").regex(REGEX.EMAIL, "Invalid email format"),
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

  // Validation for user reset password
  resetPassword: async (
    req: IBodyRequest<{ newPassword: string }>,
    res: Response,
    next: NextFunction
  ) => {
    const schema: ZodSchema = z.object({
      password: z.string().regex(REGEX.PASSWORD, "(A-Z) (a-z) (0-9) (one character) (between 8-20)"),
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

};
