import { Document, Model, Types } from "mongoose";


export interface IForumTopic extends Document {
  topic: string;
  category: Types.ObjectId;
  content: string;
}

export type ForumTopicModel = Model<IForumTopic>;