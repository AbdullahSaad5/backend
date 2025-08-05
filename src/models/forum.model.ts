import { IForum, ForumModel } from '@/contracts/forum';
import mongoose, { Document, Schema, model } from 'mongoose';


const ForumSchema = new Schema<IForum, ForumModel>({
  title: {
    type: String,
    required: true,
    trim: true,
    minlength: 3,
    maxlength: 100
  },
  category: {
    type: Schema.Types.ObjectId,
    ref: "ForumCategory",
    required: [true, "Forum category is required"],

  },
  content: {
    type: String,
    required: true
  },
  focusKeywords: {
    type: [String],
    default: []
  },
}, {
  timestamps: true,
});

export const Forum = model("Forum", ForumSchema);