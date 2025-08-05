
import { IForumTopic, ForumTopicModel } from '@/contracts/forum-topic.contract';
import mongoose, { Document, Schema, model } from 'mongoose';


const ForumTopicSchema = new Schema<IForumTopic, ForumTopicModel>({
  topic: {
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
}, {
  timestamps: true,
});

export const ForumTopic = model("ForumTopic", ForumTopicSchema);