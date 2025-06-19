import { Document, Model, Types } from "mongoose";

export interface IGuide extends Document {
  title: string;
  description: string;
  category: Types.ObjectId;
  content: string;
  isBlocked: boolean;
}

export type IGuideModel = Model<IGuide>;