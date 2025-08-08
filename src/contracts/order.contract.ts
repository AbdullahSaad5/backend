import { Document, Types } from "mongoose";
import { ENUMS } from "@/constants/enum";

// Order Type
export type OrderType = (typeof ENUMS.ORDER_TYPES)[number];

// Source Platform
export type SourcePlatform = (typeof ENUMS.SOURCE_PLATFORMS)[number];

// Order Status
export type OrderStatus = (typeof ENUMS.ORDER_STATUSES)[number];

// Payment Status
export type PaymentStatus = (typeof ENUMS.PAYMENT_STATUSES)[number];

// Refund Status
export type RefundStatus = (typeof ENUMS.REFUND_STATUSES)[number];

// Shipping Status
export type ShippingStatus = (typeof ENUMS.SHIPPING_STATUSES)[number];

// Product Condition
export type ProductCondition = (typeof ENUMS.PRODUCT_CONDITIONS_ORDER)[number];

// Discount Type
export type DiscountType = (typeof ENUMS.DISCOUNT_TYPES)[number];

// Address Interface
export interface IOrderAddress {
  fullName?: string;
  street1: string;
  street2?: string;
  city: string;
  stateProvince: string;
  postalCode: string;
  country: string;
  phone?: string;
}

// Product Attribute Interface
export interface IProductAttribute {
  name: string;
  value: string;
}

// Bundle Component Interface
export interface IBundleComponent {
  productId: Types.ObjectId;
  sku?: string;
  name?: string;
  quantity: number;
}

// Order Item Interface
export interface IOrderItem {
  itemId: string;
  productId: Types.ObjectId;
  sku?: string;
  name: string;
  description?: string;
  quantity: number;
  unitPrice: number;
  condition: ProductCondition;
  attributes?: IProductAttribute[];
  components?: IBundleComponent[];
  itemTotal: number;
  discountAmount: number;
  taxAmount: number;
  finalPrice: number;
}

// Legacy Product Interface (for backward compatibility)
export interface IOrderProduct {
  product: Types.ObjectId;
  quantity: number;
  price: number;
  discount?: number;
}

// Discount Applied Interface
export interface IDiscountApplied {
  type: DiscountType;
  code?: string;
  amount: number;
  description?: string;
  appliedAt: Date;
}

// Refund Details Interface
export interface IRefundDetails {
  refundAmount?: number;
  refundStatus: RefundStatus;
  refundProcessedAt?: Date;
  refundTransactionId?: string;
}

// Replacement Details Interface
export interface IReplacementDetails {
  replacementOrderId?: Types.ObjectId;
  replacedItemIds?: string[];
  newTrackingNumber?: string;
}

// Suggested Task Interface
export interface ISuggestedTask {
  tempId: string;
  taskTypeId?: Types.ObjectId;
  name: string;
  estimatedTimeMinutes?: number;
  priority?: number;
  notes?: string;
  assignedToUserId?: Types.ObjectId;
  assignedToUserName?: string;
  orderItemId?: string;
  isCustom: boolean;
}

// Main Order Interface
export interface IOrder extends Document {
  // Primary Order Identification
  orderId: string;
  orderNumber: string;

  // Order Type
  type: OrderType;
  originalOrderId?: Types.ObjectId;
  reason?: string;

  // Source Platform Integration
  sourcePlatform: SourcePlatform;
  externalOrderId?: string;
  externalOrderUrl?: string;
  marketplaceFee: number;

  // Customer Information
  customer: Types.ObjectId;
  customerId: Types.ObjectId;
  customerDetails?: {
    firstName?: string;
    lastName?: string;
    email?: string;
    phone?: string;
  };
  email: string;

  // Dates & Timestamps
  orderDate: Date;
  createdAt: Date;
  updatedAt: Date;
  placedAt?: Date;
  expectedCompletionDate?: Date;
  shippedAt?: Date;
  deliveredAt?: Date;

  // Order Status & Fulfillment Tracking
  status: OrderStatus;
  specialInstructions?: string;
  isExpedited: boolean;

  // Financials & Pricing
  items: IOrderItem[];
  products: IOrderProduct[]; // Legacy field for backward compatibility
  subtotal: number;
  totalDiscount: number;
  discount: number; // Legacy field for backward compatibility
  shippingCost: number;
  shippingFee: number; // Legacy field for backward compatibility
  taxAmount: number;
  tax: number; // Legacy field for backward compatibility
  grandTotal: number;
  currency: string;

  // Discounts & Coupons Applied
  discountsApplied: IDiscountApplied[];

  // Payment Information
  paymentMethod?: string;
  paymentDetails?: string;
  transactionId?: string;
  paymentStatus: PaymentStatus;

  // Refund/Replacement Details
  refundDetails?: IRefundDetails;
  replacementDetails?: IReplacementDetails;

  // Shipping & Tracking Information
  shippingAddress: IOrderAddress;
  billingAddress?: IOrderAddress;
  shippingMethod?: string;
  shippingStatus: ShippingStatus;
  carrier?: string;
  trackingNumber?: string;
  trackingUrl?: string;

  // Order Fulfillment & Task Management
  taskIds: Types.ObjectId[];
  suggestedTasks: ISuggestedTask[];

  // Audit Fields
  createdBy?: Types.ObjectId;
  updatedBy?: Types.ObjectId;
}

// Update Payload for Order
export type IOrderUpdatePayload = Partial<IOrder>;
