import mongoose, { Document } from "mongoose";

interface IStock extends Document {
  inventoryId: mongoose.Types.ObjectId;
  selectedVariations?: {
    variationId: mongoose.Types.ObjectId;
    costPricePerUnit: number;
    purchasePricePerUnit: number;
    totalUnits: number;
    usableUnits: number;
  }[];

  totalUnits?: number;
  usableUnits?: number;
  costPricePerUnit?: number;
  purchasePricePerUnit?: number;

  receivedDate: Date;
  receivedBy: mongoose.Types.ObjectId; // ✅ Fixed type
  purchaseDate: Date;
  markAsStock: Boolean;

  batchNumber: number;
}

export { IStock };
