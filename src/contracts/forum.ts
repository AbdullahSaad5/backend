import { Document, Model, Types } from "mongoose";


export interface IForum extends Document {
  title: string;
  category: Types.ObjectId;
  content: string;
  focusKeywords: string[];
}

export type ForumModel = Model<IForum>;