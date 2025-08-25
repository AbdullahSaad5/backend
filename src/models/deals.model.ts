import { Schema, model } from "mongoose";
import { IDeal } from "@/contracts/deals.contract";

const DealSchema = new Schema<IDeal>(
  {
    dealType: {
      type: String,
      enum: ["percentage", "fixed"],
      required: true,
    },
    discountValue: {
      type: Number,
      required: true,
      min: 0,
    },
    products: [
      {
        type: Schema.Types.ObjectId,
        ref: "Listing",
      },
    ],
    categories: [
      {
        type: Schema.Types.ObjectId,
        ref: "ProductCategory",
      },
    ],
    startDate: {
      type: Date,
      required: true,
    },
    endDate: {
      type: Date,
      required: true,
    },
    minPurchaseAmount: {
      type: Number,
      required: true,
      min: 0,
    },
    minQuantity: {
      type: Number,
      required: true,
      min: 1,
    },
    isActive: {
      type: Boolean,
      default: false,
    },
    selectionType: {
      type: String,
      enum: ["products", "categories"],
      required: true,
    },
    image: {
      type: String,
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

DealSchema.index({ startDate: 1, endDate: 1 });
DealSchema.index({ isActive: 1 });

export default model<IDeal>("Deal", DealSchema);
