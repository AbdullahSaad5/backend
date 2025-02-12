import { Document, Types } from "mongoose";


interface IDiscount extends Document {
  discountName: string;
  discountType: "percentage" | "fixed"; // Percentage discount or fixed amount discount
  discountValue: number;
  maxDiscount?: number; // Optional max discount cap for percentage-based discounts
  minPurchaseAmount?: number; // Minimum order value required to use the discount
  applicableProducts?: Types.ObjectId[]; // Reference to Product IDs
  applicableCategories?: Types.ObjectId[];
}

export { IDiscount };
