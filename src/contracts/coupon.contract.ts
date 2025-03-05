import { Document, Types } from "mongoose";

// Full Cart Interface
interface ICoupon extends Document {
  code: string;
  discountType: "percentage" | "fixed"; // Percentage discount or fixed amount discount
  discountValue: number;
  maxDiscount?: number; // Optional max discount cap for percentage-based coupons
  minPurchaseAmount?: number; // Minimum order value required to use the coupon
  expiryDate: Date;
  isActive: boolean;
  usageLimit: number;
  usageCount: number;
  applicableProducts?: Types.ObjectId[];  // Reference to Product IDs
  applicableCategories?: Types.ObjectId[]; 
}

export { ICoupon };
