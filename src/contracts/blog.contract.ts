import { Document, Model } from "mongoose";

export interface IBlog extends Document {
    title: string;
  content: string;
  category: string;
  coverImage: string;
  altText: string;
  seoTitle: string;
  authorName: string;
  focusKewword: string[];
  date: Date;
}

export type BlogModel = Model<IBlog>