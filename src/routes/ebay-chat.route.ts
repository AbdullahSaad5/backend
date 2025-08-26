import { Router } from "express";
import { EbayChatService } from "@/services/ebay-chat.service";

export const ebayChat = (router: Router) => {
  // Send a message to a buyer
  router.post("/send", EbayChatService.sendMessage);

  // Get messages for a specific item and buyer
  router.get("/messages/:ebayItemId/:buyerUsername", EbayChatService.getMessages);

  // Get all conversations for a seller
  router.get("/conversations", EbayChatService.getConversations);
  router.get("/conversations/:sellerUsername", EbayChatService.getConversations);

  // Mark a specific message as read
  router.patch("/messages/:messageId/read", EbayChatService.markAsRead);

  // Mark all messages in a conversation as read
  router.patch("/conversations/:ebayItemId/:buyerUsername/read", EbayChatService.markConversationAsRead);

  // Sync messages from eBay API
  router.post("/sync", EbayChatService.syncEbayMessages);
  router.post("/sync/:sellerUsername", EbayChatService.syncEbayMessages);

  // Search messages
  router.get("/search", EbayChatService.searchMessages);
  router.get("/search/:sellerUsername", EbayChatService.searchMessages);

  // Get unread count for a seller
  router.get("/unread-count", EbayChatService.getUnreadCount);
  router.get("/unread-count/:sellerUsername", EbayChatService.getUnreadCount);
};
