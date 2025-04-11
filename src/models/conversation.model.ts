import mongoose, { Schema, model } from "mongoose";
import { IConversation, ConversationDocument } from "@/contracts/chat.contract";

const conversationSchema = new Schema<IConversation>({
  participants: [{ type: Schema.Types.ObjectId, ref: 'User', required: true }],
  isGroup: { type: Boolean, default: false },
  groupName: { type: String },
  groupAdmin: { type: Schema.Types.ObjectId, ref: 'User' },
  messages: [{ type: Schema.Types.ObjectId, ref: 'Message' }]
}, { timestamps: true });

export const Conversation = model<IConversation>('Conversation', conversationSchema);


