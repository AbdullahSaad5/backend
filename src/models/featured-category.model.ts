import mongoose, { Schema } from "mongoose";
import { IFeaturedCategory } from "@/contracts/featured-category.contract";

const FeaturedCategorySchema: Schema = new Schema({
  categoryTitle: { type: String, required: true },
  categorySubtitle: { type: String, required: true },
  imageUrl: { type: String, required: true },
  status: { type: String, enum: ["active", "inactive"], default: "active" },
  buttonText: { type: String, required: true },
  buttonLink: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date },
});

export default mongoose.model<IFeaturedCategory>("FeaturedCategory", FeaturedCategorySchema);
