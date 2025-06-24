import mongoose, { Schema, model } from "mongoose";
import { IMessage, MessageDocument } from "@/contracts/chat.contract";

const messageSchema = new Schema<IMessage>({
  sender: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  content: { type: String, required: true },
  conversation: { 
    type: Schema.Types.ObjectId, 
    ref: 'Conversation', 
    required: true,
    index: true 
  },
  readBy: [{ type: Schema.Types.ObjectId, ref: 'User' }],
  type: { 
    type: String, 
    enum: ['text', 'image', 'video', 'file'], 
    default: 'text' 
  },
  status: {
    type: String,
    enum: ['sent', 'delivered', 'read'],
    default: 'sent'
  },
  metadata: { type: Schema.Types.Mixed }
}, { 
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Index for faster querying
messageSchema.index({ conversation: 1, createdAt: -1 });

export const Message = model<IMessage>('Message', messageSchema);