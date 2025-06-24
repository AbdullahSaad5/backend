import { Conversation, Message } from "@/models";
import { Types } from "mongoose";
import { IConversation } from "@/contracts/chat.contract";

export const conversationService = {
  // Create a new conversation
  createConversation: async (
    participants: Types.ObjectId[], 
    isGroup: boolean = false, 
    groupName?: string, 
    groupAdmin?: Types.ObjectId,
    groupImage?: string
  ) => {
    const conversation = new Conversation({
      participants,
      isGroup,
      ...(isGroup && { groupName, groupAdmin, groupImage })
    });
    return conversation.save();
  },

  // Get conversation by ID with optional population
  getConversationById: async (
    id: string, 
    populateOptions: string[] = ['participants', 'messages', 'lastMessage']
  ) => {
    let query = Conversation.findById(id);
    
    populateOptions.forEach(option => {
      query = query.populate(option);
    });
    
    return query.exec();
  },

  // Add message to conversation and update lastMessage
  addMessageToConversation: async (conversationId: string, messageId: Types.ObjectId) => {
    return Conversation.findByIdAndUpdate(
      conversationId,
      { 
        $push: { messages: messageId },
        $set: { lastMessage: messageId }
      },
      { new: true }
    ).populate('lastMessage');
  },

  // Get conversations for user with pagination
  getConversationsForUser: async (
    userId: string, 
    page: number = 1, 
    limit: number = 20
  ) => {
    const skip = (page - 1) * limit;
    
    return Conversation.find({ participants: userId })
      .populate('participants', 'name email avatar')
      .populate('lastMessage')
      .sort('-updatedAt')
      .skip(skip)
      .limit(limit)
      .exec();
  },

  // Update conversation (for group info changes)
  updateConversation: async (
    conversationId: string,
    updateData: Partial<IConversation>
  ) => {
    return Conversation.findByIdAndUpdate(
      conversationId,
      updateData,
      { new: true }
    ).populate('participants', 'name email');
  },

  // Delete conversation (soft delete)
  deleteConversation: async (conversationId: string) => {
    return Conversation.findByIdAndUpdate(
      conversationId,
      { $set: { isDeleted: true } },
      { new: true }
    );
  },

  // Add participant to group
  addParticipantToGroup: async (conversationId: string, userId: Types.ObjectId) => {
    return Conversation.findByIdAndUpdate(
      conversationId,
      { $addToSet: { participants: userId } },
      { new: true }
    ).populate('participants', 'name email');
  },

  // Remove participant from group
  removeParticipantFromGroup: async (conversationId: string, userId: Types.ObjectId) => {
    return Conversation.findByIdAndUpdate(
      conversationId,
      { $pull: { participants: userId } },
      { new: true }
    ).populate('participants', 'name email');
  },

  // Check if user is participant in conversation
  isParticipant: async (conversationId: string, userId: Types.ObjectId) => {
    const conversation = await Conversation.findOne({
      _id: conversationId,
      participants: userId
    });
    return !!conversation;
  }
};