import { Router } from "express";
import { ebayChatService } from "@/services/ebay-chat.service";

export const ebayChat = (router: Router) => {
  // Test route to verify the endpoint is working
  router.get("/test", (req, res) => {
    res.json({
      status: 200,
      message: "eBay Chat route is working!",
      timestamp: new Date().toISOString()
    });
  });

  // Get all orders with chat conversations
  router.get("/order-chats", ebayChatService.getOrderChats);

  // Get chat messages for a specific order and buyer
  router.get("/order-chats/:orderId/:itemId/:buyerUsername", ebayChatService.getOrderChatMessages);

  // Send message to buyer for a specific order
  router.post("/order-chats/send", ebayChatService.sendOrderMessage);

  // Mark order chat as read
  router.patch("/order-chats/:orderId/:itemId/:buyerUsername/read", ebayChatService.markOrderChatAsRead);

  // Get unread count for all orders
  router.get("/unread-count", ebayChatService.getUnreadCount);
};
