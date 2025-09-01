import { Schema, model, Types, Model } from "mongoose";
import { IPendingOrder } from "@/contracts/pending-order.contract";
import { generateUniqueId } from "@/utils/generate-unique-id.util";

// Interface for static methods
interface IPendingOrderModel extends Model<IPendingOrder> {
  findByPaymentIntentId(paymentIntentId: string): Promise<IPendingOrder | null>;
  findByCustomerId(customerId: string): Promise<IPendingOrder[]>;
  findPendingOrders(): Promise<IPendingOrder[]>;
  findExpiredOrders(): Promise<IPendingOrder[]>;
}

// Sub-schema for order items
const OrderItemSchema = new Schema(
  {
    productId: { type: String, trim: true },
    name: { type: String, required: true, trim: true },
    quantity: { type: Number, required: true, min: 1 },
    price: { type: Number, required: true, min: 0 },
    description: { type: String, trim: true },
  },
  { _id: false }
);

// Sub-schema for addresses
const AddressSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    line1: { type: String, required: true, trim: true },
    line2: { type: String, trim: true },
    city: { type: String, required: true, trim: true },
    state: { type: String, required: true, trim: true },
    postalCode: { type: String, required: true, trim: true },
    country: { type: String, required: true, trim: true, default: "US" },
  },
  { _id: false }
);

// Sub-schema for order data
const OrderDataSchema = new Schema(
  {
    items: [OrderItemSchema],
    shippingAddress: AddressSchema,
    billingAddress: AddressSchema,
    customerEmail: { type: String, required: true, trim: true, lowercase: true },
    customerPhone: { type: String, trim: true },
  },
  { _id: false }
);

// Main Pending Order Schema
const pendingOrderSchema = new Schema<IPendingOrder>(
  {
    // Unique order identifier
    orderId: {
      type: String,
      unique: true,
      default: () => generateUniqueId("PND"),
      index: true,
    },

    // Stripe payment intent ID
    paymentIntentId: {
      type: String,
      required: true,
      unique: true,
      index: true,
      trim: true,
    },

    // Customer identifiers
    customerId: {
      type: String,
      trim: true,
      index: true,
      sparse: true,
    },
    stripeCustomerId: {
      type: String,
      trim: true,
      index: true,
      sparse: true,
    },

    // Payment details
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
    currency: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
      default: "USD",
    },

    // Order status
    status: {
      type: String,
      enum: ["pending", "processing", "completed", "failed", "cancelled"],
      default: "pending",
      index: true,
    },

    // Payment status from Stripe
    paymentStatus: {
      type: String,
      enum: [
        "requires_payment_method",
        "requires_confirmation",
        "requires_action",
        "processing",
        "succeeded",
        "canceled",
      ],
      default: "requires_payment_method",
      index: true,
    },

    // Optional fields
    description: {
      type: String,
      trim: true,
    },

    // Metadata for additional information
    metadata: {
      type: Object,
      default: {},
    },

    // Order data
    orderData: OrderDataSchema,

    // Expiration date for cleanup
    expiresAt: {
      type: Date,
      required: true,
      index: { expireAfterSeconds: 0 }, // MongoDB TTL index
      default: () => new Date(Date.now() + 60 * 60 * 1000), // 1 hour from now
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for efficient queries
pendingOrderSchema.index({ createdAt: -1 });
pendingOrderSchema.index({ customerId: 1, status: 1 });
pendingOrderSchema.index({ stripeCustomerId: 1, status: 1 });
pendingOrderSchema.index({ status: 1, createdAt: -1 });
pendingOrderSchema.index({ paymentStatus: 1, createdAt: -1 });

// Static methods
pendingOrderSchema.statics.findByPaymentIntentId = function (paymentIntentId: string) {
  return this.findOne({ paymentIntentId });
};

pendingOrderSchema.statics.findByCustomerId = function (customerId: string) {
  return this.find({ customerId }).sort({ createdAt: -1 });
};

pendingOrderSchema.statics.findPendingOrders = function () {
  return this.find({ status: "pending" }).sort({ createdAt: -1 });
};

pendingOrderSchema.statics.findExpiredOrders = function () {
  return this.find({
    expiresAt: { $lt: new Date() },
    status: { $nin: ["completed", "cancelled"] },
  });
};

// Instance methods
pendingOrderSchema.methods.markAsCompleted = function () {
  this.status = "completed";
  this.paymentStatus = "succeeded";
  return this.save();
};

pendingOrderSchema.methods.markAsFailed = function () {
  this.status = "failed";
  return this.save();
};

pendingOrderSchema.methods.markAsCancelled = function () {
  this.status = "cancelled";
  this.paymentStatus = "canceled";
  return this.save();
};

pendingOrderSchema.methods.updatePaymentStatus = function (paymentStatus: IPendingOrder["paymentStatus"]) {
  this.paymentStatus = paymentStatus;

  // Auto-update order status based on payment status
  if (paymentStatus === "succeeded") {
    this.status = "completed";
  } else if (paymentStatus === "canceled") {
    this.status = "cancelled";
  } else if (paymentStatus === "processing") {
    this.status = "processing";
  }

  return this.save();
};

pendingOrderSchema.methods.extendExpiration = function (minutes: number = 60) {
  this.expiresAt = new Date(Date.now() + minutes * 60 * 1000);
  return this.save();
};

export const PendingOrder = model<IPendingOrder, IPendingOrderModel>("PendingOrder", pendingOrderSchema);
