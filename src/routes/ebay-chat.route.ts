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

  // Get all conversations (frontend expects this)
  router.get("/conversations", ebayChatService.getOrderChats);

  // Get chat messages for a specific item and buyer (frontend expects this)
  router.get("/messages/:itemId/:buyerUsername", ebayChatService.getOrderChatMessages);

  // Send message to buyer (frontend expects this)
  router.post("/send", ebayChatService.sendOrderMessage);

  // Mark conversation as read (frontend expects this)
  router.patch("/conversations/:itemId/:buyerUsername/read", ebayChatService.markOrderChatAsRead);

  // Sync messages (frontend expects this)
  router.post("/sync", async (req, res) => {
    try {
      // For now, just return success - this can be implemented later
      res.status(200).json({
        status: 200,
        message: "Messages synced successfully",
        data: { synced: true }
      });
    } catch (error: any) {
      res.status(500).json({
        status: 500,
        message: "Failed to sync messages",
        error: error.message
      });
    }
  });

  // Legacy routes (keeping for backward compatibility)
  router.get("/order-chats", ebayChatService.getOrderChats);
  router.get("/order-chats/:orderId/:itemId/:buyerUsername", ebayChatService.getOrderChatMessages);
  router.post("/order-chats/send", ebayChatService.sendOrderMessage);
  router.patch("/order-chats/:orderId/:itemId/:buyerUsername/read", ebayChatService.markOrderChatAsRead);
  router.get("/unread-count", ebayChatService.getUnreadCount);
};
