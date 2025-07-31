import mongoose, { Schema, Document } from "mongoose";

export interface IHeroSliderMedia extends Document {
  url: string;
  type: "image" | "video";
  originalName: string;
  createdAt: Date;
}

const HeroSliderMediaSchema: Schema = new Schema({
  url: { type: String, required: true },
  type: { type: String, enum: ["image", "video"], required: true },
  originalName: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
});

export default mongoose.model<IHeroSliderMedia>("HeroSliderMedia", HeroSliderMediaSchema);
