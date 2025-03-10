import { Schema, model, Types } from "mongoose";
import { IProduct } from "@/contracts/listing.contract"; // Ensure this path is correct
import { IUser } from "@/contracts/user.contract"; // Ensure this path is correct

// Schema for Cart Item
const cartItemSchema = new Schema(
  {
    // Reference to Product Model
    product: {
      type: Types.ObjectId,
      ref: "Product", // Reference to the Product model
      required: true,
    },

    // Quantity of the product in the cart
    quantity: {
      type: Number,
      required: true,
      min: 1, // Ensuring at least one unit of product
    },

    // Price of the product at the time it was added to the cart
    priceAtPurchase: {
      type: Number,
      required: true,
    },

    // Discount on the individual product
    discount: {
      type: Number,
      default: 0,
    },

    // Total price for the cart item (quantity * priceAtPurchase - discount)
    totalPrice: {
      type: Number,
      required: true,
    },

    // Status of the cart item (active or saved)
    status: {
      type: String,
      enum: ["active", "saved"],
      default: "active", // Default to active
    },
  },
  { timestamps: true } // Automatically manage createdAt and updatedAt fields
);

// Schema for Cart
const cartSchema = new Schema(
  {
    // Reference to User Model
    user: {
      type: Types.ObjectId,
      ref: "User", // Reference to User model
      required: true,
    },

    // List of items in the cart
    items: [cartItemSchema],

    // Subtotal of the cart before taxes and discounts
    subtotal: {
      type: Number,
      default: 0,
    },

    // Taxes applied to the cart
    taxes: {
      type: Number,
      default: 0,
    },

    // Shipping cost for the cart
    shippingCost: {
      type: Number,
      default: 0,
    },

    // Total discount applied to the cart
    discount: {
      type: Number,
      default: 0,
    },

    // Final total price of the cart after applying taxes, shipping, and discounts
    total: {
      type: Number,
      required: true,
    },
  },
  { timestamps: true } // Automatically manage createdAt and updatedAt fields
);

// Pre-save middleware to recalculate totalPrice for each cart item
cartItemSchema.pre("save", function (next) {
  this.totalPrice = this.quantity * this.priceAtPurchase - this.discount; // Recalculate totalPrice
  next();
});

// Method to calculate the total of the cart (including subtotal, taxes, shipping, and discounts)
cartSchema.methods.calculateTotal = function () {
  let subtotal = 0;
  let taxes = 0;
  let discount = 0;
  let shippingCost = 0;

  // Loop through the cart items and add their totalPrice to the subtotal
  this.items.forEach((item: { totalPrice: number; discount: number }) => {
    subtotal += item.totalPrice; // Add each item's totalPrice to the subtotal
    discount += item.discount; // Add item discount
  });

  // Apply a 10% tax on the subtotal (after discounts)
  taxes = (subtotal - discount) * 0.1;

  // For simplicity, the shipping cost is fixed (this can be modified dynamically based on user location, etc.)
  shippingCost = 10; // Fixed shipping cost for now

  // Set the calculated fields on the cart document
  this.subtotal = subtotal;
  this.taxes = taxes;
  this.discount = discount;
  this.shippingCost = shippingCost;

  // Final total calculation (subtotal + taxes + shippingCost - discount)
  this.total = subtotal + taxes + shippingCost - discount;

  return this.total;
};

// Cart Model
export const Cart = model("Cart", cartSchema);
