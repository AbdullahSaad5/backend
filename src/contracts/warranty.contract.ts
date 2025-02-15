import mongoose, { Document } from "mongoose";

interface IWarranty extends Document {
  productId: mongoose.Types.ObjectId;
  warrantySupplier: mongoose.Types.ObjectId;
  warrantyDuration: number;
  warrantyCoverage: string;
  warrantyDocument: File;
  expiryDate?: Date;
  receivedDate: Date;
  purchaseDate: Date;
  alertBeforeExpiry: number;
}
export { IWarranty };
