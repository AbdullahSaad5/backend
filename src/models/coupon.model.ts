import { ICoupon } from "@/contracts/coupon.contract";
import { ref } from "@firebase/storage";
import mongoose, { Schema } from "mongoose";

const CouponSchema = new Schema<ICoupon>(
  {
    code: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
    },
    discountType: {
      type: String,
      enum: ["percentage", "fixed"],
      required: true,
    },
    discountValue: { type: Number, required: true },
    maxDiscount: { type: Number },
    minPurchaseAmount: { type: Number, default: 0 },
    expiryDate: { type: Date, required: true },
    isActive: { type: Boolean, default: true },
    usageLimit: { type: Number, required: true, min: 1 },
    usageCount: { type: Number, default: 0 },
    applicableProducts: [{ type: Schema.Types.ObjectId, ref: "Product" }],
    applicableCategories: [
      { type: Schema.Types.ObjectId, ref: "ProductCategory" },
    ], // Store category IDs
  },
  { timestamps: true }
);
CouponSchema.pre<ICoupon>("save", function (next) {
  if (this.expiryDate < new Date()) {
    this.isActive = false;
  }
  next();
});

export const Coupon = mongoose.model<ICoupon>("Coupon", CouponSchema);
