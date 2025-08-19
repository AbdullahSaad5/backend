import { Document, Types, Model } from "mongoose";

export interface IGuide extends Document {
  title: string;
  description: string;
  type: string;
  category: Types.ObjectId; // Changed from string to ObjectId reference
  content: string;
  isBlocked: boolean;
  createdAt: Date;
  updatedAt: Date;
  guides: any;
}
export interface IGuideResponse {
  guides: IGuide[];
  totalCount: number;
}

export type IGuideModel = Model<IGuide>;
