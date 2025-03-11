import mongoose, { Document } from "mongoose";

interface IStock extends Document {
  inventoryId: mongoose.Types.ObjectId;
  // stockSupplier: mongoose.Types.ObjectId;
  totalUnits: number;
  usableUnits: number;
  purchasePricePerUnit: number;
  costPricePerUnit: number;
  // retailPricePerUnit: number;
  tax: number;
  expiryDate?: Date;
  receivedDate: Date;
  receivedBy: String;
  purchaseDate: Date;
  markAsStock: Boolean;

  // stockThreshold: number;
  batchNumber: number;
}

export { IStock };
