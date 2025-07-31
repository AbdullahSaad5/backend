import mongoose, { Schema } from "mongoose";
import { IHeroSlider } from "@/contracts/hero-slider.contract";

const HeroSliderSchema: Schema = new Schema({
  slideTitle: { type: String, required: true },
  slideSubtitle: { type: String, required: true },
  imageUrl: { type: String, required: true },
  status: { type: String, enum: ["active", "inactive"], default: "active" },
  buttonText: { type: String, required: true },
  buttonLink: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date },
});

export default mongoose.model<IHeroSlider>("HeroSlider", HeroSliderSchema);
