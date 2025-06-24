import { Document, Types } from "mongoose";

export interface IMessage {
  sender: Types.ObjectId;
  content: string;
  conversation: Types.ObjectId;
  readBy: Types.ObjectId[];
  type: 'text' | 'image' | 'video' | 'file';
  status: 'sent' | 'delivered' | 'read';
  metadata?: any;
}

export interface IConversation {
  participants: Types.ObjectId[];
  isGroup: boolean;
  groupName?: string;
  groupAdmin?: Types.ObjectId;
  groupImage?: string;
  messages: Types.ObjectId[];
  lastMessage?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

export interface MessageDocument extends IMessage, Document {}
export interface ConversationDocument extends IConversation, Document {}