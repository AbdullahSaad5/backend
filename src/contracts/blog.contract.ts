import { Document, Model } from "mongoose";

export interface IBlog extends Document {
    title: String, 
    content: String, 
    category: String, 
    coverImage: String, 
    altText: String, 
    seoTitle: String, 
    authorName: String, 
    focusKewword:string[]
    date: Date
}

export type BlogModel = Model<IBlog>