import { Router } from "express";
import { chatController } from "@/controllers";
import { authMiddleware } from "@/middlewares";

export const chat = (router: Router) => {
  // Conversation routes
  router.post("/conversations", chatController.createConversation);
  router.get("/conversations", chatController.getConversations);
  router.get("/conversations/:id", authMiddleware, chatController.getConversation);
  router.put("/conversations/:id", authMiddleware, chatController.updateConversation);
  router.delete("/conversations/:id", authMiddleware, chatController.deleteConversation);
  
  // Group management routes
  router.post("/conversations/:id/participants", authMiddleware, chatController.addParticipant);
  router.delete("/conversations/:id/participants", authMiddleware, chatController.removeParticipant);
  
  // Message routes
  router.get("/conversations/:conversationId/messages", authMiddleware, chatController.getMessages);
  router.post("/conversations/:conversationId/messages", authMiddleware, chatController.sendMessage);
  router.put("/messages/:messageId/read", authMiddleware, chatController.markAsRead);
  router.put("/conversations/:conversationId/messages/read-all", authMiddleware, chatController.markAllAsRead);
  router.put("/messages/:messageId", authMiddleware, chatController.updateMessage);
  router.delete("/messages/:messageId", authMiddleware, chatController.deleteMessage);
};