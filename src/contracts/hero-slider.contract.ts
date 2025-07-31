import { Document } from "mongoose";

export interface IHeroSlider extends Document {
  slideTitle: string;
  slideSubtitle: string;
  imageUrl: string;
  status: "active" | "inactive";
  buttonText: string;
  buttonLink: string;
  createdAt?: Date;
  updatedAt?: Date;
}
