import { Router } from "express";
import { ebayChatController } from "@/controllers/ebay-chat.controller";
import { authGuard } from "@/guards";

export const ebayChat = (router: Router) => {
  // Send a message to a buyer
  router.post("/send", authGuard.isAuth, ebayChatController.sendMessage);

  // Get messages for a specific item and buyer
  router.get("/messages/:ebayItemId/:buyerUsername", authGuard.isAuth, ebayChatController.getMessages);

  // Get all conversations for a seller
  router.get("/conversations", authGuard.isAuth, ebayChatController.getConversations);
  router.get("/conversations/:sellerUsername", authGuard.isAuth, ebayChatController.getConversations);

  // Mark a specific message as read
  router.patch("/messages/:messageId/read", authGuard.isAuth, ebayChatController.markAsRead);

  // Mark all messages in a conversation as read
  router.patch("/conversations/:ebayItemId/:buyerUsername/read", authGuard.isAuth, ebayChatController.markConversationAsRead);

  // Sync messages from eBay API
  router.post("/sync", authGuard.isAuth, ebayChatController.syncMessages);

  // Search messages
  router.get("/search", authGuard.isAuth, ebayChatController.searchMessages);
  router.get("/search/:sellerUsername", authGuard.isAuth, ebayChatController.searchMessages);

  // Get unread count for a seller
  router.get("/unread-count", authGuard.isAuth, ebayChatController.getUnreadCount);
  router.get("/unread-count/:sellerUsername", authGuard.isAuth, ebayChatController.getUnreadCount);
};
