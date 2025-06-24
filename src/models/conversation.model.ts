import mongoose, { Schema, model } from "mongoose";
import { IConversation, ConversationDocument } from "@/contracts/chat.contract";

const conversationSchema = new Schema<IConversation>({
  participants: [{ 
    type: Schema.Types.ObjectId, 
    ref: 'User', 
    required: true 
  }],
  isGroup: { type: Boolean, default: false },
  groupName: { type: String },
  groupAdmin: { type: Schema.Types.ObjectId, ref: 'User' },
  groupImage: { type: String },
  messages: [{ type: Schema.Types.ObjectId, ref: 'Message' }],
  lastMessage: { type: Schema.Types.ObjectId, ref: 'Message' }
}, { 
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for performance
conversationSchema.index({ participants: 1 });
conversationSchema.index({ isGroup: 1 });
conversationSchema.index({ updatedAt: -1 });

// Virtual for unread message count
conversationSchema.virtual('unreadCount', {
  ref: 'Message',
  localField: '_id',
  foreignField: 'conversation',
  count: true,
  match: { 
    readBy: { $ne: ['$$userId'] } 
  }
});

export const Conversation = model<IConversation>('Conversation', conversationSchema);