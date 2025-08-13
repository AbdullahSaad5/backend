import { getZodErrors } from "@/utils/get-zod-errors.util";
import { NextFunction, Response } from "express";
import { ReasonPhrases, StatusCodes } from "http-status-codes";
import { z, ZodSchema } from "zod";
import { Types } from "mongoose";
import { IBodyRequest } from "@/contracts/request.contract";
import { ProductCategoryCreatePayload, ProductCategoryUpdatePayload } from "@/contracts/product-category.contract";

// Custom Zod validation for MongoDB ObjectId
const objectId = z.instanceof(Types.ObjectId).or(z.string().regex(/^[0-9a-fA-F]{24}$/, "Invalid ObjectId"));

export const productCategoryValidation = {

  addCategory: async (
    req: IBodyRequest<ProductCategoryCreatePayload>,
    res: Response,
    next: NextFunction
  ) => {
    console.log(req.body.name, req.body.description, req.body.image);
    const schema: ZodSchema = z.object({
      name: z.string().min(1, "Product Category Name is required"), // userType is required
      description: z.string().optional(), // description is optional
      image: z.string().nonempty("At least one image/icon is required"), // permissions array must have at least one string
      tags: z.array(z.string()).nonempty("At least one tag is required"),
      isBlocked: z.boolean().optional(),
      isFeatured: z.boolean().optional(),
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

  updateCategory: async (
    req: IBodyRequest<ProductCategoryUpdatePayload>,
    res: Response,
    next: NextFunction
  ) => {
    console.log(req.body.name, req.body.description, req.body.image);
    const schema: ZodSchema = z.object({
      name: z.string().min(1, "Product Category Name is required").optional(), // userType is required
      description: z.string().optional(), // description is optional
      image: z.string().nonempty("At least one image/icon is required").optional(), // permissions array must have at least one string
      tags: z.array(z.string()).nonempty("At least one tag is required"),
      isBlocked: z.boolean().optional(),
      isFeatured: z.boolean().optional(),
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
