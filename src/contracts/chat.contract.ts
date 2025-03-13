import { Document, Types } from "mongoose";

export interface IMessage {
  sender: Types.ObjectId;
  content: string;
  conversation: Types.ObjectId;
  readBy: Types.ObjectId[];
}

export interface IConversation {
  participants: Types.ObjectId[];
  isGroup: boolean;
  groupName?: string;
  groupAdmin?: Types.ObjectId;
  messages: Types.ObjectId[];
}

export interface MessageDocument extends IMessage, Document {}
export interface ConversationDocument extends IConversation, Document {}