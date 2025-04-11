import { z } from "zod";
import { Types } from "mongoose";
import { Request, Response, NextFunction } from "express";
import { StatusCodes, ReasonPhrases } from "http-status-codes";
import { getZodErrors } from "@/utils/get-zod-errors.util";

// Custom Zod validation for MongoDB ObjectId
const objectId = z
  .instanceof(Types.ObjectId)
  .or(z.string().regex(/^[0-9a-fA-F]{24}$/, "Invalid ObjectId"));

const productInBundleSchema = z.object({
  product: objectId,
  quantity: z.number().min(1, "Quantity must be at least 1"),
  price: z.number().min(0, "Price must be at least 0"),
  discount: z.number().min(0, "Discount cannot be negative").optional(),
});

const bundleDiscountSchema = z.object({
  amount: z.number().min(0, "Discount amount must be at least 0"),
  validityPeriod: z
    .object({
      startDate: z.date().optional(),
      endDate: z.date().optional(),
    })
    .optional(),
});

const bundleDetailsSchema = z.object({
  bundleName: z.string().min(1, "Bundle name is required"),
  description: z.string().min(1, "Description is required"),
  imageUrls: z.array(z.string()).optional(),
});

const bundlePricingSchema = z.object({
  totalCost: z.number().min(0, "Total cost cannot be negative"),
  bundleDiscount: bundleDiscountSchema.optional(),
});

const bundleSchema = z.object({
  details: bundleDetailsSchema,
  products: z.array(productInBundleSchema),
  pricing: bundlePricingSchema,
  category: objectId,
  brand: objectId.optional(),
  stock: z.object({
    bundleQuantity: z.number().min(0, "Stock quantity must be at least 0"),
    stockNotificationLevel: z.number(),
  }),
  status: z.enum(["draft", "published"]),
});

export const bundleValidation = {
  createBundle: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const validatedData = bundleSchema.parse(req.body);
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

  updateBundle: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const updateSchema = bundleSchema.partial();
      const validatedData = updateSchema.parse(req.body);
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
