import { Message } from "@/models";
import { Types } from "mongoose";

export const messageService = {
  // Create a new message with optional type and metadata
  createMessage: async (
    senderId: Types.ObjectId, 
    content: string, 
    conversationId: Types.ObjectId,
    type: 'text' | 'image' | 'video' | 'file' = 'text',
    metadata?: any
  ) => {
    const message = new Message({
      sender: senderId,
      content,
      conversation: conversationId,
      readBy: [senderId],
      type,
      metadata,
      status: 'sent'
    });
    return message.save();
  },

  // Get messages for conversation with pagination
  getMessagesForConversation: async (
    conversationId: string,
    page: number = 1,
    limit: number = 50,
    before?: Date
  ) => {
    const skip = (page - 1) * limit;
    const query: any = { conversation: conversationId };
    
    if (before) {
      query.createdAt = { $lt: before };
    }
    
    return Message.find(query)
      .populate('sender', 'name email avatar')
      .sort('-createdAt')
      .skip(skip)
      .limit(limit)
      .exec();
  },

  // Mark message as read
  markMessageAsRead: async (messageId: string, userId: Types.ObjectId) => {
    return Message.findByIdAndUpdate(
      messageId,
      { 
        $addToSet: { readBy: userId },
        $set: { status: 'read' }
      },
      { new: true }
    ).exec();
  },

  // Mark all messages in conversation as read
  markAllAsRead: async (conversationId: string, userId: Types.ObjectId) => {
    return Message.updateMany(
      { 
        conversation: conversationId,
        readBy: { $ne: userId }
      },
      { 
        $addToSet: { readBy: userId },
        $set: { status: 'read' }
      }
    ).exec();
  },

  // Delete message (soft delete)
  deleteMessage: async (messageId: string) => {
    return Message.findByIdAndUpdate(
      messageId,
      { $set: { isDeleted: true } },
      { new: true }
    );
  },

  // Get message by ID
  getMessageById: async (messageId: string) => {
    return Message.findById(messageId)
      .populate('sender', 'name email avatar')
      .exec();
  },

  // Update message content
  updateMessage: async (messageId: string, content: string) => {
    return Message.findByIdAndUpdate(
      messageId,
      { $set: { content } },
      { new: true }
    ).exec();
  }
};