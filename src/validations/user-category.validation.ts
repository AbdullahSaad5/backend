import { getZodErrors } from "@/utils/get-zod-errors.util";
import { NextFunction, Response } from "express";
import { ReasonPhrases, StatusCodes } from "http-status-codes";
import { z, ZodSchema } from "zod";
import { Types } from "mongoose";
import { IBodyRequest } from "@/contracts/request.contract";
import { REGEX } from "@/constants/regex";
import { IUserCategory, UserCategoryUpdatePayload } from "@/contracts/user-category.contract";

// Custom Zod validation for MongoDB ObjectId
const objectId = z.instanceof(Types.ObjectId).or(z.string().regex(/^[0-9a-fA-F]{24}$/, "Invalid ObjectId"));

export const userCategoryValidation = {
  createUserCategory: async (req: IBodyRequest<IUserCategory>, res: Response, next: NextFunction) => {
    const schema: ZodSchema = z.object({
      role: z.string().min(1, "User Category role is required"), // userType is required
      description: z.string().optional(), // description is optional
      permissions: z.array(z.string()).min(1, "At least one permission is required"), // permissions array must have at least one string
      categoryType: z.enum(["admin", "super admin", "customer", "supplier", "other"], {
        required_error: "Category type is required",
        invalid_type_error: "Category type must be a valid value",
      }),
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

  updateUserCategory: async (req: IBodyRequest<UserCategoryUpdatePayload>, res: Response, next: NextFunction) => {
    const schema: ZodSchema = z.object({
      role: z.string().min(3, "User type is required").optional(),
      description: z.string().optional().optional(),
      permissions: z.array(z.string()).min(1, "At least one permission is required").optional(),
      categoryType: z.enum(["admin", "super admin", "customer", "supplier", "other"]).optional(),
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

  // ID validation for get, delete, or block/unblock supplier category
  validateId: (req: IBodyRequest<string>, res: Response, next: NextFunction) => {
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
