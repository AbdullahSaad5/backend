import { Document, Types } from "mongoose";

// Information about a product in the order
interface IOrderProduct {
  product: Types.ObjectId; // Reference to the Product model
  quantity: number; // Quantity of this product in the order
  price: number; // Price of this product at the time of the order
  discount?: number; // Optional discount on this product
}

// Payment status type
type PaymentStatus = "Pending" | "Completed" | "Failed";

// Shipping status type
type ShippingStatus = "Pending" | "Shipped" | "Delivered";

// Order status type
type OrderStatus =
  | "Pending"
  | "Processing"
  | "Shipped"
  | "Completed"
  | "Canceled";

// Shipping method type
type ShippingMethod = "Standard" | "Express";

// Payment method type
type PaymentMethod =
  | "Credit Card"
  | "PayPal"
  | "Bank Transfer"
  | "Cash on Delivery";

// Address reference for shipping or billing
interface IOrderAddress {
  street: string; // Street address
  city: string; // City name
  state: string; // State name
  postalCode: string; // Postal code
  country: string; // Country name
  phoneNumber?: string; // Optional phone number
}

// Full Order Contract Interface
interface IOrder {
  orderNumber: string; // Unique order number
  orderDate: Date; // Date when the order was placed
  status: OrderStatus; // Status of the order
  customer: Types.ObjectId; // Reference to the User model (customer)
  email: string; // Customer email for notifications
  shippingAddress: IOrderAddress; // Shipping address for the order
  billingAddress: IOrderAddress; // Billing address for the order
  products: IOrderProduct[]; // Array of products in the order
  subtotal: number; // Total price of products before discounts/taxes
  discount: number; // Discount applied to the entire order
  shippingFee: number; // Shipping fee for the order
  tax: number; // Tax applied to the order
  grandTotal: number; // Total amount after discount, shipping, and tax
  paymentStatus: PaymentStatus; // Payment status
  paymentMethod: PaymentMethod; // Payment method used
  paymentDetails?: string; // Optional transaction details or payment ID
  shippingStatus: ShippingStatus; // Shipping status
  shippingMethod: ShippingMethod; // Shipping method selected for the order
  trackingNumber?: string; // Optional tracking number for shipped orders
  createdAt: Date; // Created at timestamp
  updatedAt: Date; // Updated at timestamp
}

// Update Payload for Order (Partial type to support updates)
export type IOrderUpdatePayload = Partial<IOrder>;

export {
  IOrder,
  IOrderProduct,
  IOrderAddress,
  PaymentStatus,
  ShippingStatus,
  OrderStatus,
  ShippingMethod,
  PaymentMethod,
};
