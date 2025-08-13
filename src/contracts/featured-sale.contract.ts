import { Document } from "mongoose";

export interface IFeaturedSale extends Document {
  saleTitle: string;
  saleSubtitle: string;
  imageUrl: string;
  status: "active" | "inactive";
  buttonText: string;
  buttonLink: string;
  createdAt?: Date;
  updatedAt?: Date;
}
