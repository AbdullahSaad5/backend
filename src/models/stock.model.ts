import { IStock } from "@/contracts/stock.contract";
import mongoose, { Schema } from "mongoose";

const StockSchema = new Schema<IStock>(
  {
    productId: {
      type: Schema.Types.ObjectId,
      ref: "Product",
      required: true,
    },
    stockSupplier: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    quantity: { type: Number, required: true, min: 0 },
    purchasePricePerUnit: { type: Number, required: true, min: 0 },
    costPricePerUnit: { type: Number, required: true, min: 0 },
    retailPricePerUnit: { type: Number, required: true, min: 0 },
    discount: { type: Number, required: true, min: 0 },
    batchNumber: { type: Number, required: true, min: 0 },
    tax: { type: Number, required: true, min: 0 },
    expiryDate: { type: Date },
    receivedDate: { type: Date, required: true, default: Date.now },
    lastUpdated: { type: Date, default: Date.now },
    stockThreshold: { type: Number, default: 10 },
  },
  { timestamps: true }
);

export const Stock = mongoose.model<IStock>("Stock", StockSchema);
