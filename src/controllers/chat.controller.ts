import { Request, Response } from "express";
import { conversationService } from "@/services";
import { messageService } from "@/services";

export const chatController = {
  getConversations: async (req: Request, res: Response) => {
    try {
        console.log("req ki id : " , req.body.user.id)
      const conversations = await conversationService.getConversationsForUser(req.body.user.id);
      res.json(conversations);
    } catch (error) {
      res.status(500).json({ message: "Error fetching conversations" });
    }
  },

  getMessages: async (req: Request, res: Response) => {
    try {
      const messages = await messageService.getMessagesForConversation(req.params.conversationId);
      res.json(messages);
    } catch (error) {
      res.status(500).json({ message: "Error fetching messages" });
    }
  }
};