import { BlogModel, IBlog } from "@/contracts/blog.contract";
import mongoose, {Schema, model } from "mongoose";

const Blog = new Schema<IBlog, BlogModel>({
    title : {type : String, required: true}, 
    content: {type : String }, 
    category: {type: String , required: true }, 
    coverImage: {type: String , required: true }, 
    altText: {type: String , required: true }, 
    seoTitle: {type: String , required: true }, 
    authorName: {type: String , required: true }, 
    focusKewword: [], 
    date: {type : Date ,  default: Date.now }
})

export const Iblog = model("blog" , Blog)