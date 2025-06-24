import { Request, Response } from "express";
import { conversationService } from "@/services";
import { messageService } from "@/services";
import { Types } from "mongoose";

export const chatController = {
  // Conversation endpoints
  createConversation: async (req: Request, res: Response) => {
    try {
      const { participants, isGroup, groupName, groupImage } = req.body;
      const userId = new Types.ObjectId(req.body.user.id);
      
      // Ensure participants array includes the creator
      const allParticipants = [...new Set([...participants, userId.toString()])]
        .map(id => new Types.ObjectId(id));

      const conversation = await conversationService.createConversation(
        allParticipants,
        isGroup,
        groupName,
        isGroup ? userId : undefined,
        groupImage
      );
      
      res.status(201).json(conversation);
    } catch (error) {
      res.status(500).json({ message: "Error creating conversation", error });
    }
  },

getConversations: async (req: Request, res: Response) => {
    try {
      console.log("Fetching conversations for user:", req.body.user.id); // Add this
      const conversations = await conversationService.getConversationsForUser(req.body.user.id);
      console.log("Found conversations:", conversations.length); // Add this
      res.json(conversations);
    } catch (error) {
      console.error("FULL ERROR:", error); // Critical - log the complete error
      
    }
  },

  getConversation: async (req: Request, res: Response) => {
    try {
      const conversation = await conversationService.getConversationById(req.params.id);
      if (!conversation) {
        return res.status(404).json({ message: "Conversation not found" });
      }
      
      // Check if user is participant
      const isParticipant = await conversationService.isParticipant(
        req.params.id,
        new Types.ObjectId(req.body.user.id)
      );
      
      if (!isParticipant) {
        return res.status(403).json({ message: "Not authorized" });
      }
      
      res.json(conversation);
    } catch (error) {
      res.status(500).json({ message: "Error fetching conversation" });
    }
  },

  updateConversation: async (req: Request, res: Response) => {
    try {
      const { groupName, groupImage } = req.body;
      const conversation = await conversationService.updateConversation(
        req.params.id,
        { groupName, groupImage }
      );
      
      if (!conversation) {
        return res.status(404).json({ message: "Conversation not found" });
      }
      
      res.json(conversation);
    } catch (error) {
      res.status(500).json({ message: "Error updating conversation" });
    }
  },

  deleteConversation: async (req: Request, res: Response) => {
    try {
      const conversation = await conversationService.deleteConversation(req.params.id);
      if (!conversation) {
        return res.status(404).json({ message: "Conversation not found" });
      }
      
      res.json({ message: "Conversation deleted" });
    } catch (error) {
      res.status(500).json({ message: "Error deleting conversation" });
    }
  },

  addParticipant: async (req: Request, res: Response) => {
    try {
      const { userId } = req.body;
      const conversation = await conversationService.addParticipantToGroup(
        req.params.id,
        new Types.ObjectId(userId)
      );
      
      if (!conversation) {
        return res.status(404).json({ message: "Conversation not found" });
      }
      
      res.json(conversation);
    } catch (error) {
      res.status(500).json({ message: "Error adding participant" });
    }
  },

  removeParticipant: async (req: Request, res: Response) => {
    try {
      const { userId } = req.body;
      const conversation = await conversationService.removeParticipantFromGroup(
        req.params.id,
        new Types.ObjectId(userId)
      );
      
      if (!conversation) {
        return res.status(404).json({ message: "Conversation not found" });
      }
      
      res.json(conversation);
    } catch (error) {
      res.status(500).json({ message: "Error removing participant" });
    }
  },

  // Message endpoints
  getMessages: async (req: Request, res: Response) => {
    try {
      const { page = 1, limit = 50, before } = req.query;
      const messages = await messageService.getMessagesForConversation(
        req.params.conversationId,
        Number(page),
        Number(limit),
        before ? new Date(before as string) : undefined
      );
      
      res.json(messages);
    } catch (error) {
      res.status(500).json({ message: "Error fetching messages" });
    }
  },

  sendMessage: async (req: Request, res: Response) => {
    try {
      const { content, type = 'text', metadata } = req.body;
      const senderId = new Types.ObjectId(req.body.user.id);
      const conversationId = new Types.ObjectId(req.params.conversationId);
      
      // Check if user is participant
      const isParticipant = await conversationService.isParticipant(
        req.params.conversationId,
        senderId
      );
      
      if (!isParticipant) {
        return res.status(403).json({ message: "Not authorized" });
      }
      
      const message = await messageService.createMessage(
        senderId,
        content,
        conversationId,
        type,
        metadata
      );
      
      // Add message to conversation
      await conversationService.addMessageToConversation(
        req.params.conversationId,
        message._id
      );
      
      res.status(201).json(message);
    } catch (error) {
      res.status(500).json({ message: "Error sending message", error });
    }
  },

  markAsRead: async (req: Request, res: Response) => {
    try {
      const message = await messageService.markMessageAsRead(
        req.params.messageId,
        new Types.ObjectId(req.body.user.id)
      );
      
      if (!message) {
        return res.status(404).json({ message: "Message not found" });
      }
      
      res.json(message);
    } catch (error) {
      res.status(500).json({ message: "Error marking message as read" });
    }
  },

  markAllAsRead: async (req: Request, res: Response) => {
    try {
      const result = await messageService.markAllAsRead(
        req.params.conversationId,
        new Types.ObjectId(req.body.user.id)
      );
      
      res.json({ updatedCount: result.modifiedCount });
    } catch (error) {
      res.status(500).json({ message: "Error marking messages as read" });
    }
  },

  deleteMessage: async (req: Request, res: Response) => {
    try {
      const message = await messageService.deleteMessage(req.params.messageId);
      
      if (!message) {
        return res.status(404).json({ message: "Message not found" });
      }
      
      res.json({ message: "Message deleted" });
    } catch (error) {
      res.status(500).json({ message: "Error deleting message" });
    }
  },

  updateMessage: async (req: Request, res: Response) => {
    try {
      const { content } = req.body;
      const message = await messageService.updateMessage(
        req.params.messageId,
        content
      );
      
      if (!message) {
        return res.status(404).json({ message: "Message not found" });
      }
      
      res.json(message);
    } catch (error) {
      res.status(500).json({ message: "Error updating message" });
    }
  }
};