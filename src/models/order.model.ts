import { Schema, model, Types } from "mongoose";
import { IUser } from "@/contracts/user.contract"; // User model for customer reference
import { IListing } from "@/contracts/listing.contract"; // Product model for ordered items
import { IUserAddress } from "@/contracts/user-address.contracts"; // Address model for shipping/billing info

// Order Schema Definition
const orderSchema = new Schema(
  {
    // Basic Order Information
    orderNumber: {
      type: String,
      required: true,

      default: () => `ORD-${Date.now()}`, // Auto-generate a simple order number
    },
    orderDate: {
      type: Date,
      default: Date.now, // Date when order is placed
    },

    // Order Status (Pending, Processing, Shipped, Completed, Canceled)
    status: {
      type: String,
      enum: ["Pending", "Processing", "Shipped", "Completed", "Canceled"],
      default: "Pending", // Default status when order is created
    },

    // Customer Information
    customer: {
      type: Types.ObjectId,
      ref: "User", // Reference to the User model for customer details
      required: true,
    },
    email: {
      type: String,
      lowercase: true,
      required: true, // Customer email for order confirmation & updates
    },
    shippingAddress: {
      type: Types.ObjectId,
      ref: "Address", // Reference to Address model for shipping details
      required: true,
    },
    billingAddress: {
      type: Types.ObjectId,
      ref: "Address", // Reference to Address model for billing details
      required: true,
    },

    // Ordered Products
    products: [
      {
        product: {
          type: Types.ObjectId,
          ref: "Product", // Reference to Product model
          required: true,
        },
        quantity: {
          type: Number,
          required: true,
          min: 1, // Ensure at least one item is ordered
        },
        price: {
          type: Number,
          required: true,
        },
        discount: {
          type: Number,
          default: 0, // Discount on individual product (if any)
        },
      },
    ],

    // Financials and Payment Information
    subtotal: {
      type: Number,
      required: true, // Total price of products before discounts/taxes
      min: 0,
    },
    discount: {
      type: Number,
      default: 0, // Total discount applied to the order
      min: 0,
    },
    shippingFee: {
      type: Number,
      default: 0, // Shipping charges
      min: 0,
    },
    tax: {
      type: Number,
      default: 0, // Tax on the order
      min: 0,
    },
    grandTotal: {
      type: Number,
      required: true, // Grand total after discount, shipping, and tax
      min: 0,
    },

    // Payment Information
    paymentStatus: {
      type: String,
      enum: ["Pending", "Completed", "Failed"],
      default: "Pending", // Default status when order is created
    },
    paymentMethod: {
      type: String,
      enum: ["Credit Card", "PayPal", "Bank Transfer", "Cash on Delivery"], // Payment methods
      required: true,
    },
    paymentDetails: {
      type: String, // Stores transaction ID or other details related to payment
      required: false,
    },

    // Shipping Information
    shippingStatus: {
      type: String,
      enum: ["Pending", "Shipped", "Delivered"],
      default: "Pending", // Default status for shipping
    },
    shippingMethod: {
      type: String,
      enum: ["Standard", "Express"],
      required: true, // Shipping method used for the order
    },
    trackingNumber: {
      type: String, // Tracking number for shipped orders
      required: false,
    },
  },
  { timestamps: true } // Automatically manage createdAt and updatedAt fields
);

// Model for Order
export const Order = model("Order", orderSchema);
