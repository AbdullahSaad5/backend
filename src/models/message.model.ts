import mongoose, { Schema, model } from "mongoose";
import { IMessage, MessageDocument } from "@/contracts/chat.contract";

const messageSchema = new Schema<IMessage>({
  sender: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  content: { type: String, required: true },
  conversation: { type: Schema.Types.ObjectId, ref: 'Conversation', required: true },
  readBy: [{ type: Schema.Types.ObjectId, ref: 'User' }]
}, { timestamps: true });

export const Message = model<IMessage>('Message', messageSchema);