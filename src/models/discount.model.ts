import { IDiscount } from "@/contracts/discount.contract";
import mongoose, { Schema } from "mongoose";

const DiscountSchema = new Schema<IDiscount>(
  {
    fixedDiscountValue: { type: Number, required: true, default: 0 },
    percentageDiscountValue: { type: Number, required: true, default: 0 },
    applicableCategory: {
      type: Schema.Types.ObjectId,
      ref: "ProductCategory",

    },
  },
  { timestamps: true }
);

export const Discount = mongoose.model<IDiscount>("Discount", DiscountSchema);
