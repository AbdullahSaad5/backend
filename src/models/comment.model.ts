import { IComment, ICommentModel } from "@/contracts/comments.contract";
import { Schema, model } from "mongoose";

const CommentSchema = new Schema<IComment, ICommentModel>(
  {
    forumId: {
      type: Schema.Types.ObjectId,
      required: true,
      ref: "ForumTopic", // Link to your forum topic collection
    },
    parentId: {
      type: Schema.Types.ObjectId,
      ref: "Comment", // Reference to another comment if it's a reply
      default: null,
    },
    author: {
      type: String,
      required: true,
    },
    avatar: {
      type: String,
      default: "",
    },
    content: {
      type: String,
      required: true,
    },
    timestamp: {
      type: Date,
      default: Date.now,
    },
    likes: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true, // Adds createdAt and updatedAt
  }
);

export const CommentModel = model<IComment, ICommentModel>("Comment", CommentSchema);
