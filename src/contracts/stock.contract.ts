import mongoose, { Document } from "mongoose";

interface IStock extends Document {
  productId: mongoose.Types.ObjectId;
  stockSupplier: mongoose.Types.ObjectId;
  quantity: number;
  purchasePricePerUnit: number;
  costPricePerUnit: number;
  retailPricePerUnit: number;
  discount: number;
  tax: number;
  expiryDate?: Date;
  receivedDate: Date;
  purchaseDate: Date;

  stockThreshold: number;
  batchNumber: number;
}

export { IStock };
