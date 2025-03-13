import { Router } from "express";
import { chatController } from "@/controllers";
import { authMiddleware } from "@/middlewares";

export const chat = (router: Router) => {
  router.get("/conversations", chatController.getConversations);
  router.get("/messages/:conversationId", chatController.getMessages);
};
    