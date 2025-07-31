import { Document } from "mongoose";

export interface IFeaturedCategory extends Document {
  categoryTitle: string;
  categorySubtitle: string;
  imageUrl: string;
  status: "active" | "inactive";
  buttonText: string;
  buttonLink: string;
  createdAt?: Date;
  updatedAt?: Date;
}
