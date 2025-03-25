import mongoose, { Document } from "mongoose";

interface IStock extends Document {
  inventoryId: mongoose.Types.ObjectId;
  isVariation: boolean; // ✅ New flag to determine if inventory has variations

  // ✅ For inventories that have variations
  selectedVariations?: {
    variationId: mongoose.Types.ObjectId;
    costPricePerUnit: number;
    purchasePricePerUnit: number;
    totalUnits: number;
    usableUnits: number;
  }[];

  // ✅ For inventories that do not have variations
  costPricePerUnit?: number;
  purchasePricePerUnit?: number;
  totalUnits?: number;
  usableUnits?: number;

  receivedDate: Date;
  receivedBy: mongoose.Types.ObjectId; // ✅ Fixed type
  purchaseDate: Date;
  markAsStock: Boolean;

  batchNumber: number;
}

export { IStock };
