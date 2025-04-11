import { z } from "zod";
import { Types } from "mongoose";
import { Request, Response, NextFunction } from "express";
import { StatusCodes, ReasonPhrases } from "http-status-codes";
import { getZodErrors } from "@/utils/get-zod-errors.util";

// Custom Zod validation for MongoDB ObjectId
const objectId = z
  .instanceof(Types.ObjectId)
  .or(z.string().regex(/^[0-9a-fA-F]{24}$/, "Invalid ObjectId"));

// Cart Item Schema
const cartItemSchema = z.object({
  productId: objectId, // Product in the cart
  quantity: z.number().min(1, "Quantity must be at least 1"), // Quantity of the product
  price: z.number().min(0, "Price must be at least 0"), // Price of the item
});

// Cart Status Enum Schema
const cartStatusSchema = z.enum(["active", "abandoned"]);

// Cart Creation Schema
const createCartSchema = z.object({
  userId: objectId, // User associated with the cart
  items: z.array(cartItemSchema).min(1, "At least one item is required"), // Items in the cart
  status: cartStatusSchema.optional(), // Status (optional, default to active)
  totalPrice: z.number().min(0, "Total price cannot be negative").optional(), // Total price of the cart
});

// Cart Update Schema (Partial, meaning optional fields)
const updateCartSchema = createCartSchema.partial();

// Cart ID Validation Schema
const validateCartIdSchema = z.object({
  cartId: objectId, // Cart ID
});

export const cartValidation = {
  // Validate cart creation
  createCart: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const validatedData = createCartSchema.parse(req.body);
      Object.assign(req.body, validatedData); // Attach validated data to req.body
      next(); // Proceed to the next middleware/controller
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        const { message, issues } = getZodErrors(error); // Extract Zod errors
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

  // Validate cart update (partial validation)
  updateCart: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const validatedData = updateCartSchema.parse(req.body);
      Object.assign(req.body, validatedData); // Attach validated data to req.body
      next(); // Proceed to the next middleware/controller
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        const { message, issues } = getZodErrors(error); // Extract Zod errors
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

  // Validate cart ID in the URL
  validateId: (req: Request, res: Response, next: NextFunction) => {
    const schema = validateCartIdSchema;
    try {
      const validatedData = schema.parse(req.params);
      Object.assign(req.params, validatedData); // Attach validated data to req.params
      next(); // Proceed to the next middleware/controller
    } catch (error) {
      if (error instanceof z.ZodError) {
        const { message, issues } = getZodErrors(error); // Extract Zod errors
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
