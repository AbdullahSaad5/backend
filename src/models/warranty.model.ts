import { IWarranty } from "@/contracts/warranty.contract";
import mongoose, { Schema, Document } from "mongoose";



const WarrantySchema = new Schema<IWarranty>(
  {
    productId: {
      type: Schema.Types.ObjectId,
      ref: "Product",
      required: true,
    },
    warrantySupplier: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    warrantyDuration: { type: Number, required: true }, // Duration in days
    warrantyCoverage: { type: String, required: true }, // Coverage description
    warrantyDocument: { type: String }, // URL or file path
    expiryDate: { type: Date, required: true },
    receivedDate: { type: Date, required: true, default: Date.now },
    purchaseDate: { type: Date, required: true, default: Date.now },
    alertBeforeExpiry: { type: Number, default: 30 }, // Notify user before expiry (e.g., 30 days)
  },
  { timestamps: true }
);

export const Warranty = mongoose.model<IWarranty>(
  "Warranty",
  WarrantySchema
);
