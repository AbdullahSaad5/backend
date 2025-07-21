import mongoose, { Document } from "mongoose";

const mediaSchema = {
  id: { type: String },
  originalname: { type: String },
  encoding: { type: String },
  mimetype: { type: String },
  size: { type: Number },
  url: { type: String },
  type: { type: String },
  filename: { type: String },
};

interface IStock extends Document {
  inventoryId: mongoose.Types.ObjectId;
  productSupplier: mongoose.Types.ObjectId;
  selectedVariations?: {
    variationId: mongoose.Types.ObjectId;
    costPricePerUnit: number;
    purchasePricePerUnit: number;
    totalUnits: number;
    usableUnits: number;
  }[];
  priceBreakdown: {
    name: string;
    value: any;
    comment?: string;
  }[];
  stockInvoice: typeof mediaSchema;
  totalUnits?: number;
  usableUnits?: number;
  costPricePerUnit?: number;
  purchasePricePerUnit?: number;

  receivedDate: Date;
  receivedBy: mongoose.Types.ObjectId; // ✅ Fixed type
  purchaseDate: Date;
  markAsStock: Boolean;

  images?: typeof mediaSchema[];
  videos?: typeof mediaSchema[];

  batchNumber: number;
}

export { IStock };
