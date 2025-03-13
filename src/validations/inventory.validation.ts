import { getZodErrors } from "@/utils/get-zod-errors.util";
import { NextFunction, Response } from "express";
import { ReasonPhrases, StatusCodes } from "http-status-codes";
import { z, ZodSchema } from "zod";
import { Types } from "mongoose";
import { IBodyRequest } from "@/contracts/request.contract";
import { REGEX } from "@/constants/regex";
import { IInventory, IInventoryUpdatePayload } from "@/contracts/inventory.contract";

// Custom Zod validation for MongoDB ObjectId
const objectId = z.instanceof(Types.ObjectId).or(z.string().regex(/^[0-9a-fA-F]{24}$/, "Invalid ObjectId"));

// Platform-Specific Schema: Amazon
const amazonSchema = z.object({
  title: z.string({
    message:"Title is required"
  }).trim().min(3, "Title is required"),
  brand: z.string({
    message:"Brand is required"
  }).trim().min(2, "Brand is required"),
  category: objectId.refine((value) => value !== undefined && value !== null, {
    message: "Category is required"
  }),
  technicalSpecifications: z
    .object({
      processorType: z.string().optional(),
      motherboard: z.string().optional(),
      cpuFan: z.string().optional(),
      case: z.string().optional(),
      accessoriesExpansionsNetworking: z.string().optional(),
      graphicsCard: z.string().optional(),
      ramSize: z.string().optional(),
      storageDetails: z.string().optional(),
      operatingSystem: z.string().optional(),
      additionalSpecifications: z.string().optional(),
    })
    .optional(),
  quantity: z.number().min(0, "Quantity must be a non-negative number").optional(),
  pricing: z.object({
    pricePerUnit: z.number().positive("Price per unit must be positive").optional(),
    discountPrice: z.number().optional(),
  }),
  condition: z.object({
    status: z.enum(["New", "Refurbished", "Used"]).optional(),
    details: z.string().optional(),
  }),
  shipping: z.object({
    weight: z.string().trim().optional(),
    options: z.array(z.string()).optional(),
    estimatedDeliveryTime: z.string().optional(),
  }),
  description: z.string().trim().min(3, "Description is required"),
  keywords: z
    .object({
      relevantKeywords: z.array(z.string()).optional(),
      suggestedKeywords: z.array(z.string()).optional(),
    })
    .optional(),
  fulfillmentMethod: z.enum(["FBA", "FBM"]).optional(),
  identifier: z.string().trim().min(1, "Identifier is required").optional(),
  vatPercentage: z.number().optional(),
  salesTaxPercentage: z.number().optional(),
  applyTaxAtCheckout: z.boolean().optional(),
  taxConfirmation: z.boolean().optional(),
});

// Platform-Specific Schema: eBay
const ebaySchema = amazonSchema.extend({
  pricing: amazonSchema.shape.pricing.extend({
    buyItNowPrice: z.number().optional(),
    auctionStartingPrice: z.number().optional(),
  }),
  fulfillmentMethod: z.enum(["eBay Fulfillment", "Self-Fulfilled"]).optional(),
  shipping: amazonSchema.shape.shipping.extend({
    handlingTime: z.string().optional(),
  }),
});


// Platform-Specific Schema: Website
const websiteSchema = amazonSchema.extend({
  fulfillmentMethod: z.enum(["Dropshipping", "In-House Fulfillment"]).optional(),
});


// vatPercentage: { type: Number, required: true, default: 0 }, // VAT Percentage
//     salesTaxPercentage: { type: Number, required: true, default: 0 }, // Sales Tax Percentage
//     applyTaxAtCheckout: { type: Boolean, default: false }, // Apply Tax at checkout flag
//     taxConfirmation: { type: Boolean, default: false }, // Tax confirmation flag

// Inventory Schema
const inventorySchema = z.object({
  images: z.array(z.string().url("Invalid URL format")).min(1, "At least one image is required"),
  isBlocked: z.boolean().optional(),
  platformDetails: z.object({
    amazon: amazonSchema.optional(),
    ebay: ebaySchema.optional(),
    website: websiteSchema.optional(),
  }),
  status: z.enum(["draft", "published"]),

});

// Inventory Validation
export const inventoryValidation = {
  addInventory: async (req: IBodyRequest<IInventory>, res: Response, next: NextFunction) => {
    try {
      const validatedData = inventorySchema.parse(req.body);
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

  // Update Inventory (Support for partial updates)
  updateInventory: async (req: IBodyRequest<IInventoryUpdatePayload>, res: Response, next: NextFunction) => {
    try {
      const validatedData = inventorySchema.parse(req.body); // Allow partial updates
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

  // ID validation
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
