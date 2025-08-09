import { Schema, model, Types } from "mongoose";
import { IOrder } from "@/contracts/order.contract";
import {
  AddressSchema,
  OrderItemSchema,
  OrderDiscountSchema,
  RefundDetailsSchema,
  ReplacementDetailsSchema,
  SuggestedTaskSchema,
  OrderProductSchema,
} from "./order-sub-schemas";
import { generateUniqueId } from "@/utils/generate-unique-id.util";
import { ENUMS } from "@/constants/enum";

// --- Main Order Schema ---
const orderSchema = new Schema(
  {
    // Primary Order Identification
    orderId: { type: String, unique: true, default: () => generateUniqueId("ORD") },
    orderNumber: { type: String, required: true, default: () => `ORD-${Date.now()}` },

    // Order Type (Sale, Refund, Replacement)
    type: {
      type: String,
      enum: ENUMS.ORDER_TYPES,
      required: true,
      default: "SALE",
      index: true,
    },
    originalOrderId: {
      type: Schema.Types.ObjectId,
      ref: "Order",
      index: true,
      sparse: true,
    },
    reason: { type: String, trim: true },

    // Source Platform Integration
    sourcePlatform: {
      type: String,
      enum: ENUMS.SOURCE_PLATFORMS,
      required: true,
      default: "STOREFRONT",
      index: true,
    },
    externalOrderId: { type: String, trim: true, sparse: true, index: true },
    externalOrderUrl: { type: String, trim: true },
    marketplaceFee: { type: Number, default: 0, min: 0 },

    // Customer Information
    customer: { type: Types.ObjectId, ref: "User", required: true, index: true },
    customerId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    customerDetails: {
      firstName: { type: String, trim: true },
      lastName: { type: String, trim: true },
      email: { type: String, trim: true },
      phone: { type: String, trim: true },
    },
    email: { type: String, lowercase: true, required: true },

    // Dates & Timestamps
    orderDate: { type: Date, default: Date.now },
    createdAt: { type: Date, default: Date.now, index: true },
    updatedAt: { type: Date, default: Date.now },
    placedAt: { type: Date },
    expectedCompletionDate: { type: Date },
    shippedAt: { type: Date },
    deliveredAt: { type: Date },

    // Order Status & Fulfillment Tracking
    status: {
      type: String,
      enum: ENUMS.ORDER_STATUSES,
      required: true,
      default: "PENDING_PAYMENT",
      index: true,
    },
    specialInstructions: { type: String, trim: true },
    isExpedited: { type: Boolean, default: false },

    // Financials & Pricing
    items: [OrderItemSchema],
    products: [OrderProductSchema], // Legacy field for backward compatibility
    subtotal: { type: Number, required: true, min: 0 },
    totalDiscount: { type: Number, default: 0, min: 0 },
    discount: { type: Number, default: 0, min: 0 }, // Legacy field for backward compatibility
    shippingCost: { type: Number, default: 0, min: 0 },
    shippingFee: { type: Number, default: 0, min: 0 }, // Legacy field for backward compatibility
    taxAmount: { type: Number, default: 0, min: 0 },
    tax: { type: Number, default: 0, min: 0 }, // Legacy field for backward compatibility
    grandTotal: { type: Number, required: true, min: 0 },
    currency: { type: String, default: "USD", trim: true },

    // Discounts & Coupons Applied (Order-level)
    discountsApplied: [OrderDiscountSchema],

    // Payment Information
    paymentMethod: { type: String, trim: true },
    paymentDetails: { type: String, required: false },
    transactionId: { type: String, trim: true, index: true, sparse: true },
    paymentStatus: {
      type: String,
      enum: ENUMS.PAYMENT_STATUSES,
      default: "PENDING",
    },

    // Refund/Replacement Details
    refundDetails: RefundDetailsSchema,
    replacementDetails: ReplacementDetailsSchema,

    // Shipping & Tracking Information
    shippingAddress: { type: AddressSchema, required: true },
    billingAddress: { type: AddressSchema },
    shippingMethod: { type: String, trim: true },
    shippingStatus: {
      type: String,
      enum: ENUMS.SHIPPING_STATUSES,
      default: "Pending",
    },
    carrier: { type: String, trim: true },
    trackingNumber: { type: String, trim: true, index: true, sparse: true },
    trackingUrl: { type: String, trim: true },

    // Order Fulfillment & Task Management
    taskIds: [{ type: Schema.Types.ObjectId, ref: "OrderTask", index: true }],
    suggestedTasks: [SuggestedTaskSchema],

    // Audit Fields
    createdBy: { type: Schema.Types.ObjectId, ref: "User" },
    updatedBy: { type: Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

// Model for Order
export const Order = model<IOrder>("Order", orderSchema);
