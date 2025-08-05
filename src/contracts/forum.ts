import { Document, Model, Types } from "mongoose";


export interface IForum extends Document {
  title: string;
  category: string;
  content: string;
  focusKeywords: string[];
}

export type ForumModel = Model<IForum>;