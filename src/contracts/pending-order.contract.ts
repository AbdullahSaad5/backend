import { Types, Document } from "mongoose";

export interface IPendingOrder extends Document {
  _id?: Types.ObjectId;
  orderId: string;
  paymentIntentId: string;
  customerId?: string;
  stripeCustomerId?: string;
  amount: number;
  currency: string;
  status: "pending" | "processing" | "completed" | "failed" | "cancelled";
  description?: string;
  metadata?: Record<string, string>;
  orderData?: {
    items: Array<{
      productId?: string;
      name: string;
      quantity: number;
      price: number;
      description?: string;
    }>;
    shippingAddress?: {
      name: string;
      line1: string;
      line2?: string;
      city: string;
      state: string;
      postalCode: string;
      country: string;
    };
    billingAddress?: {
      name: string;
      line1: string;
      line2?: string;
      city: string;
      state: string;
      postalCode: string;
      country: string;
    };
    customerEmail: string;
    customerPhone?: string;
  };
  paymentStatus:
    | "requires_payment_method"
    | "requires_confirmation"
    | "requires_action"
    | "processing"
    | "succeeded"
    | "canceled";
  expiresAt: Date;
  createdAt?: Date;
  updatedAt?: Date;

  // Instance methods
  markAsCompleted(): Promise<IPendingOrder>;
  markAsFailed(): Promise<IPendingOrder>;
  markAsCancelled(): Promise<IPendingOrder>;
  updatePaymentStatus(paymentStatus: IPendingOrder["paymentStatus"]): Promise<IPendingOrder>;
  extendExpiration(minutes?: number): Promise<IPendingOrder>;
}

export interface CreatePendingOrderPayload {
  paymentIntentId: string;
  customerId?: string;
  stripeCustomerId?: string;
  amount: number;
  currency: string;
  description?: string;
  metadata?: Record<string, string>;
  orderData?: IPendingOrder["orderData"];
  expirationMinutes?: number; // Default: 60 minutes
}

export interface UpdatePendingOrderPayload {
  status?: IPendingOrder["status"];
  paymentStatus?: IPendingOrder["paymentStatus"];
  metadata?: Record<string, string>;
  orderData?: Partial<IPendingOrder["orderData"]>;
}
