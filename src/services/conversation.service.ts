import { Conversation } from "@/models";
import { Types } from "mongoose";

export const conversationService = {
    
  createConversation: (participants: Types.ObjectId[], isGroup = false) => {
    const conversation = new Conversation({
      participants,
      isGroup
    });
    return conversation.save();
  },

  getConversationById: (id: string) => {
    return Conversation.findById(id)
      .populate('participants', 'name email')
      .populate('messages');
  },

  addMessageToConversation: (conversationId: string, messageId: Types.ObjectId) => {
    return Conversation.findByIdAndUpdate(
      conversationId,
      { $push: { messages: messageId } },
      { new: true }
    );
  },

  getConversationsForUser: (userId: string) => {
    return Conversation.find({ participants: userId })
      .populate('participants', 'name email')
      .sort('-updatedAt');
  }
};
