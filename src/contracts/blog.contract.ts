import { Document, Model } from "mongoose";

export interface IBlog extends Document {
    title: String, 
    content: String, 
    category: String, 
    date: Date
}

export type BlogModel = Model<IBlog>