import { z } from "zod";
import { Types } from "mongoose";
import { Request, Response, NextFunction } from "express";
import { StatusCodes, ReasonPhrases } from "http-status-codes";
import { getZodErrors } from "@/utils/get-zod-errors.util";
import { ENUMS } from "@/constants/enum";

// Custom Zod validation for MongoDB ObjectId
const objectId = z.instanceof(Types.ObjectId).or(z.string().regex(/^[0-9a-fA-F]{24}$/, "Invalid ObjectId"));

// Enums for order validation
const orderTypeEnum = z.enum(ENUMS.ORDER_TYPES as unknown as [string, ...string[]]);
const sourcePlatformEnum = z.enum(ENUMS.SOURCE_PLATFORMS as unknown as [string, ...string[]]);
const orderStatusEnum = z.enum(ENUMS.ORDER_STATUSES as unknown as [string, ...string[]]);
const paymentStatusEnum = z.enum(ENUMS.PAYMENT_STATUSES as unknown as [string, ...string[]]);
const refundStatusEnum = z.enum(ENUMS.REFUND_STATUSES as unknown as [string, ...string[]]);
const shippingStatusEnum = z.enum(ENUMS.SHIPPING_STATUSES as unknown as [string, ...string[]]);
const productConditionEnum = z.enum(ENUMS.PRODUCT_CONDITIONS_ORDER as unknown as [string, ...string[]]);
const discountTypeEnum = z.enum(ENUMS.DISCOUNT_TYPES as unknown as [string, ...string[]]);

// Address schema
const addressSchema = z.object({
  fullName: z.string().trim().optional(),
  street1: z.string().trim().min(1, "Street address is required"),
  street2: z.string().trim().optional(),
  city: z.string().trim().min(1, "City is required"),
  stateProvince: z.string().trim().min(1, "State/Province is required"),
  postalCode: z.string().trim().min(1, "Postal code is required"),
  country: z.string().trim().min(1, "Country is required"),
  phone: z.string().trim().optional(),
});

// Product attribute schema
const productAttributeSchema = z.object({
  name: z.string().trim().min(1, "Attribute name is required"),
  value: z.string().trim().min(1, "Attribute value is required"),
});

// Bundle component schema
const bundleComponentSchema = z.object({
  productId: objectId,
  sku: z.string().trim().optional(),
  name: z.string().trim().optional(),
  quantity: z.number().min(1, "Quantity must be at least 1"),
});

// Order item schema
const orderItemSchema = z.object({
  itemId: z.string().optional(),
  productId: objectId,
  sku: z.string().trim().optional(),
  name: z.string().trim().min(1, "Product name is required"),
  description: z.string().trim().optional(),
  quantity: z.number().min(1, "Quantity must be at least 1"),
  unitPrice: z.number().min(0, "Unit price must be non-negative"),
  condition: productConditionEnum,
  attributes: z.array(productAttributeSchema).optional(),
  components: z.array(bundleComponentSchema).optional(),
  itemTotal: z.number().min(0, "Item total must be non-negative"),
  discountAmount: z.number().min(0, "Discount amount must be non-negative").default(0),
  taxAmount: z.number().min(0, "Tax amount must be non-negative").default(0),
  finalPrice: z.number().min(0, "Final price must be non-negative"),
});

// Legacy order product schema (for backward compatibility)
const orderProductSchema = z.object({
  product: objectId,
  quantity: z.number().min(1, "Quantity must be at least 1"),
  price: z.number().min(0, "Price must be non-negative"),
  discount: z.number().min(0, "Discount must be non-negative").default(0),
});

// Discount applied schema
const discountAppliedSchema = z.object({
  type: discountTypeEnum.default("COUPON"),
  code: z.string().trim().optional(),
  amount: z.number().min(0, "Discount amount must be non-negative"),
  description: z.string().trim().optional(),
  appliedAt: z.date().default(() => new Date()),
});

// Refund details schema
const refundDetailsSchema = z.object({
  refundAmount: z.number().min(0, "Refund amount must be non-negative").optional(),
  refundStatus: refundStatusEnum.default("PENDING"),
  refundProcessedAt: z.date().optional(),
  refundTransactionId: z.string().trim().optional(),
});

// Replacement details schema
const replacementDetailsSchema = z.object({
  replacementOrderId: objectId.optional(),
  replacedItemIds: z.array(z.string()).optional(),
  newTrackingNumber: z.string().trim().optional(),
});

// Suggested task schema
const suggestedTaskSchema = z.object({
  tempId: z.string().min(1, "Temporary ID is required"),
  taskTypeId: objectId.optional(),
  name: z.string().trim().min(1, "Task name is required"),
  estimatedTimeMinutes: z.number().min(0).optional(),
  priority: z.number().optional(),
  notes: z.string().trim().optional(),
  assignedToUserId: objectId.optional(),
  assignedToUserName: z.string().trim().optional(),
  orderItemId: z.string().optional(),
  isCustom: z.boolean().default(false),
});

// Customer details schema
const customerDetailsSchema = z.object({
  firstName: z.string().trim().optional(),
  lastName: z.string().trim().optional(),
  email: z.string().email("Invalid email format").optional(),
  phone: z.string().trim().optional(),
});

// Main order schema
const orderSchema = z.object({
  // Primary Order Identification
  orderId: z.string().optional(),
  orderNumber: z.string().optional(),

  // Order Type
  type: orderTypeEnum.default("SALE"),
  originalOrderId: objectId.optional(),
  reason: z.string().trim().optional(),

  // Source Platform Integration
  sourcePlatform: sourcePlatformEnum.default("STOREFRONT"),
  externalOrderId: z.string().trim().optional(),
  externalOrderUrl: z.string().trim().optional(),
  marketplaceFee: z.number().min(0, "Marketplace fee must be non-negative").default(0),

  // Customer Information
  customer: objectId,
  customerId: objectId,
  customerDetails: customerDetailsSchema.optional(),
  email: z.string().email("Invalid email format"),

  // Dates & Timestamps
  orderDate: z.date().optional(),
  createdAt: z.date().optional(),
  updatedAt: z.date().optional(),
  placedAt: z.date().optional(),
  expectedCompletionDate: z.date().optional(),
  shippedAt: z.date().optional(),
  deliveredAt: z.date().optional(),

  // Order Status & Fulfillment Tracking
  status: orderStatusEnum.default("PENDING_PAYMENT"),
  specialInstructions: z.string().trim().optional(),
  isExpedited: z.boolean().default(false),

  // Financials & Pricing
  items: z.array(orderItemSchema).optional(),
  products: z.array(orderProductSchema).optional(), // Legacy field for backward compatibility
  subtotal: z.number().min(0, "Subtotal must be non-negative"),
  totalDiscount: z.number().min(0, "Total discount must be non-negative").default(0),
  discount: z.number().min(0, "Discount must be non-negative").default(0), // Legacy field
  shippingCost: z.number().min(0, "Shipping cost must be non-negative").default(0),
  shippingFee: z.number().min(0, "Shipping fee must be non-negative").default(0), // Legacy field
  taxAmount: z.number().min(0, "Tax amount must be non-negative").default(0),
  tax: z.number().min(0, "Tax must be non-negative").default(0), // Legacy field
  grandTotal: z.number().min(0, "Grand total must be non-negative"),
  currency: z.string().trim().default("USD"),

  // Discounts & Coupons Applied
  discountsApplied: z.array(discountAppliedSchema).optional(),

  // Payment Information
  paymentMethod: z.string().trim().optional(),
  paymentDetails: z.string().trim().optional(),
  transactionId: z.string().trim().optional(),
  paymentStatus: paymentStatusEnum.default("PENDING"),

  // Refund/Replacement Details
  refundDetails: refundDetailsSchema.optional(),
  replacementDetails: replacementDetailsSchema.optional(),

  // Shipping & Tracking Information
  shippingAddress: addressSchema,
  billingAddress: addressSchema.optional(),
  shippingMethod: z.string().trim().optional(),
  shippingStatus: shippingStatusEnum.default("Pending"),
  carrier: z.string().trim().optional(),
  trackingNumber: z.string().trim().optional(),
  trackingUrl: z.string().trim().optional(),

  // Order Fulfillment & Task Management
  taskIds: z.array(objectId).optional(),
  suggestedTasks: z.array(suggestedTaskSchema).optional(),

  // Audit Fields
  createdBy: objectId.optional(),
  updatedBy: objectId.optional(),
});

// Validation for creating an order
export const orderValidation = {
  createOrder: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const validatedData = orderSchema.parse(req.body);
      Object.assign(req.body, validatedData);
      next();
    } catch (error: any) {
      console.log(JSON.stringify(error, null, 2));
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

  // Validation for updating an order (fields are optional)
  updateOrder: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const updateSchema = orderSchema.partial();
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

  // Validation for order ID parameter
  validateOrderId: (req: Request, res: Response, next: NextFunction) => {
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

  // Validation for order status update
  validateOrderStatus: async (req: Request, res: Response, next: NextFunction) => {
    const statusSchema = z.object({
      status: orderStatusEnum,
      updatedBy: objectId.optional(),
    });

    try {
      const validatedData = statusSchema.parse(req.body);
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

  // Validation for refund order creation
  validateRefundOrder: async (req: Request, res: Response, next: NextFunction) => {
    const refundSchema = z.object({
      reason: z.string().trim().min(1, "Refund reason is required"),
      refundAmount: z.number().min(0, "Refund amount must be non-negative"),
      itemsToRefund: z.array(z.string()).optional(),
      createdBy: objectId.optional(),
    });

    try {
      const validatedData = refundSchema.parse(req.body);
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

  // Validation for replacement order creation
  validateReplacementOrder: async (req: Request, res: Response, next: NextFunction) => {
    const replacementSchema = z.object({
      reason: z.string().trim().min(1, "Replacement reason is required"),
      items: z.array(orderItemSchema).min(1, "At least one item is required"),
      createdBy: objectId.optional(),
    });

    try {
      const validatedData = replacementSchema.parse(req.body);
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
