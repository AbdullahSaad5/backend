import { Message } from "@/models";
import { Types } from "mongoose";

export const messageService = {
  createMessage: (senderId: Types.ObjectId, content: string, conversationId: Types.ObjectId) => {
    const message = new Message({
      sender: senderId,
      content,
      conversation: conversationId,
      readBy: [senderId]
    });
    return message.save();
  },

  getMessagesForConversation: (conversationId: string) => {
    return Message.find({ conversation: conversationId })
      .populate('sender', 'name email')
      .sort('createdAt')
      .exec(); // Add exec() for better TypeScript support
  },

  markMessageAsRead: (messageId: string, userId: Types.ObjectId) => {
    return Message.findByIdAndUpdate(
      messageId,
      { $addToSet: { readBy: userId } },
      { new: true }
    ).exec();
  }
};