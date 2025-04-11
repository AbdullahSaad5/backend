import { z } from "zod";
import { Types } from "mongoose";
import { Request, Response, NextFunction } from "express";
import { StatusCodes, ReasonPhrases } from "http-status-codes";
import { getZodErrors } from "@/utils/get-zod-errors.util";

// Custom Zod validation for MongoDB ObjectId
const objectId = z
  .instanceof(Types.ObjectId)
  .or(z.string().regex(/^[0-9a-fA-F]{24}$/, "Invalid ObjectId"));

// Order status and payment status enums
const orderStatusEnum = z.enum(["pending", "shipped", "delivered", "canceled"]);
const paymentStatusEnum = z.enum(["pending", "paid", "failed"]);

// Order schema
const orderSchema = z.object({
  userId: objectId, // Validates the userId to be a valid MongoDB ObjectId
  bundleId: objectId, // Validates the bundleId to be a valid MongoDB ObjectId
  quantity: z.number().min(1, "Quantity must be at least 1"), // Quantity must be at least 1
  paymentStatus: paymentStatusEnum, // Validates paymentStatus
  orderStatus: orderStatusEnum, // Validates orderStatus
  orderDate: z.date().optional(), // Order date, optional
  deliveryDate: z.date().optional(), // Delivery date, optional
});

// Validation for creating an order
export const orderValidation = {
  createOrder: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const validatedData = orderSchema.parse(req.body); // Validate the body using the schema
      Object.assign(req.body, validatedData); // Assign the validated data back to the request body
      next(); // Proceed to the next middleware/controller
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        const { message, issues } = getZodErrors(error); // Extract the errors
        return res.status(StatusCodes.BAD_REQUEST).json({
          message: ReasonPhrases.BAD_REQUEST,
          status: StatusCodes.BAD_REQUEST,
          issueMessage: message,
          issues: issues, // Return the specific validation issues
        });
      } else {
        return res.status(StatusCodes.BAD_REQUEST).json({
          message: ReasonPhrases.BAD_REQUEST,
          status: StatusCodes.BAD_REQUEST,
        });
      }
    }
  },

  // Validation for updating an order (fields are optional in this case)
  updateOrder: async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Make all fields optional in the update schema
      const updateSchema = orderSchema.partial();
      const validatedData = updateSchema.parse(req.body); // Validate the body using the schema
      Object.assign(req.body, validatedData); // Assign the validated data back to the request body
      next(); // Proceed to the next middleware/controller
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        const { message, issues } = getZodErrors(error); // Extract the errors
        return res.status(StatusCodes.BAD_REQUEST).json({
          message: ReasonPhrases.BAD_REQUEST,
          status: StatusCodes.BAD_REQUEST,
          issueMessage: message,
          issues: issues, // Return the specific validation issues
        });
      } else {
        return res.status(StatusCodes.BAD_REQUEST).json({
          message: ReasonPhrases.BAD_REQUEST,
          status: StatusCodes.BAD_REQUEST,
        });
      }
    }
  },

  // Validation for validating the orderId parameter (MongoDB ObjectId)
  validateOrderId: (req: Request, res: Response, next: NextFunction) => {
    const schema = z.object({
      id: objectId, // Validate the id parameter using ObjectId
    });
    try {
      const validatedData = schema.parse(req.params); // Validate the order ID in the params
      Object.assign(req.params, validatedData); // Assign the validated data back to the request params
      next(); // Proceed to the next middleware/controller
    } catch (error) {
      if (error instanceof z.ZodError) {
        const { message, issues } = getZodErrors(error); // Extract the errors
        return res.status(StatusCodes.BAD_REQUEST).json({
          message: ReasonPhrases.BAD_REQUEST,
          status: StatusCodes.BAD_REQUEST,
          issueMessage: message,
          issues: issues, // Return the specific validation issues
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
