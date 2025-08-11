import { Model, Document, Types } from "mongoose";

export interface IComment extends Document {
    forumId:Types.ObjectId;
    parentId:Types.ObjectId;
    author:String;
    avatar:String;
    content:String;
    timestamp:Date;
    likes:Number;
    createdAt?: Date;
    updatedAt?: Date;
}

export type ICommentModel = Model<IComment>;