import { BlogModel, IBlog } from "@/contracts/blog.contract";
import mongoose, { Schema, model } from "mongoose";

const Blog = new Schema<IBlog, BlogModel>({
  title: { type: String, required: true },
  content: { type: String },
  category: { type: String, required: true },
  date: { type: Date, default: Date.now },
  altText: { type: String, trim: true },
  seoTitle: { type: String, trim: true },
  authorName: { type: String, trim: true },
  coverImage: { type: String },
  focusKeyword: { type: [String], default: [] },
});

export const Iblog = model("blog", Blog);
