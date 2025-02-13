import { IDiscount } from "@/contracts/discount.contract";
import mongoose, { Schema } from "mongoose";

const DiscountSchema = new Schema<IDiscount>(
  {
    discountName: { type: String },
    discountType: {
      type: String,
      enum: ["percentage", "fixed"],
      required: true,
    },
    discountValue: { type: Number, required: true, default: 0 },
    // maxDiscount: { type: Number },
    // minPurchaseAmount: { type: Number, default: 0 },
    // applicableProducts: [{ type: Schema.Types.ObjectId, ref: "Product" }],
    applicableCategories: [
      { type: Schema.Types.ObjectId, ref: "ProductCategory" },
    ], // Store category IDs
  },
  { timestamps: true }
);

export const Discount = mongoose.model<IDiscount>("Discount", DiscountSchema);
