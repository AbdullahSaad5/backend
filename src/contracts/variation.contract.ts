import mongoose, { Document } from "mongoose";

export interface IVariation extends Document {
  productId: mongoose.Types.ObjectId;
  stock: number;
  price: number;
  cpu: string;
  ram: string;
  sku: string;
  variationQuantity: number;
  variationPrice: string;
  storage: string;
  graphics: string;
  height: string;
  length: string;
  width: string;
  platform: "amazon" | "ebay" | "website"; // Discriminator key
}
