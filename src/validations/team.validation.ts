import { getZodErrors } from "@/utils/get-zod-errors.util";
import { NextFunction, Response, Request } from "express";
import { ReasonPhrases, StatusCodes } from "http-status-codes";
import { z, ZodSchema } from "zod";
import { Types } from "mongoose";

// Custom Zod validation for MongoDB ObjectId
const objectId = z.instanceof(Types.ObjectId).or(z.string().regex(/^[0-9a-fA-F]{24}$/, "Invalid ObjectId"));

export const teamValidation = {
  createTeam: async (req: Request, res: Response, next: NextFunction) => {
    const schema: ZodSchema = z.object({
      name: z.string().min(1, "Team name is required"),
      userCategoryId: z.string().regex(/^[0-9a-fA-F]{24}$/, "Invalid user category ID"),
      description: z.string().optional(),
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

  updateTeam: async (req: Request, res: Response, next: NextFunction) => {
    const schema: ZodSchema = z.object({
      name: z.string().min(1, "Team name is required").optional(),
      description: z.string().optional(),
      isActive: z.boolean().optional(),
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

  // ID validation for get, delete, or update operations
  validateId: (req: Request, res: Response, next: NextFunction) => {
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
