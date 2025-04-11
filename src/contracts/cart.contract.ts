import { Document, Types } from "mongoose";

// Information about a product in the cart
interface ICartItemProduct {
  product: Types.ObjectId; // Reference to the Product model
  quantity: number; // Quantity of the product in the cart
  priceAtPurchase: number; // Price of the product at the time of adding it to the cart
  discount?: number; // Discount applied to this product (optional)
  totalPrice: number; // Total price for this cart item (quantity * priceAtPurchase - discount)
  status: "active" | "saved"; // Status of the cart item (active or saved for later)
}

// Cart pricing details
interface ICartPricing {
  subtotal: number; // Subtotal of the cart (before taxes and discounts)
  taxes: number; // Tax applied to the cart
  shippingCost: number; // Shipping cost for the cart
  discount: number; // Total discount applied to the cart
  total: number; // Final total price after applying taxes, shipping, and discounts
}

// Cart status type
type CartStatus = "active" | "abandoned";

// User reference and cart items
interface ICartDetails {
  user: Types.ObjectId; // Reference to the User model
  items: ICartItem[]; // Array of cart items
}

// Full Cart Interface
interface ICart {
  details: ICartDetails; // Cart-specific details (user reference and items)
  pricing: ICartPricing; // Pricing details for the cart
  status: CartStatus; // Status of the cart (active or abandoned)
  createdAt: Date; // Created at timestamp
  updatedAt: Date; // Updated at timestamp
}

// Cart Item Interface
interface ICartItem {
  product: ICartItemProduct; // Product in the cart
  quantity: number; // Quantity of the product in the cart
  priceAtPurchase: number; // Price at the time of adding the product to the cart
  discount?: number; // Discount on the product (optional)
  totalPrice: number; // Total price for this cart item
  status: "active" | "saved"; // Status of the cart item
}

// Update Payload for Cart (Partial type to support updates)
interface ICartUpdatePayload {
  details?: ICartDetails; // Update details (user reference, items, etc.)
  pricing?: ICartPricing; // Update pricing details
  status?: CartStatus; // Update status (active or abandoned)
  createdAt?: Date; // Update timestamp for creation
  updatedAt?: Date; // Update timestamp for modification
}

// Exporting all interfaces
export {
  ICart,
  ICartItem,
  ICartItemProduct,
  ICartPricing,
  CartStatus,
  ICartDetails,
  ICartUpdatePayload,
};
