import mongoose, { Document } from "mongoose";
// Interface for the Variation document
export interface IVariation extends Document {
  inventoryId: mongoose.Types.ObjectId;
  variations: Record<string, any>[];
  createdAt: Date;
  updatedAt: Date;
}
