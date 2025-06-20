import { Document, Model } from "mongoose";

export interface IGuide extends Document {
  title: string;
  description: string;
  category: string;
  content: string;
  isBlocked: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export type IGuideModel = Model<IGuide>;