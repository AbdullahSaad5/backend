import mongoose, { Schema } from "mongoose";
import { IFeaturedSale } from "@/contracts/featured-sale.contract";

const FeaturedSaleSchema: Schema = new Schema({
  saleTitle: { type: String, required: true },
  saleSubtitle: { type: String, required: true },
  imageUrl: { type: String, required: true },
  status: { type: String, enum: ["active", "inactive"], default: "active" },
  buttonText: { type: String, required: true },
  buttonLink: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date },
});

export default mongoose.model<IFeaturedSale>(
  "FeaturedSale",
  FeaturedSaleSchema
);
