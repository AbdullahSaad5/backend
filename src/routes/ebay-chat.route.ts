import { Router } from "express";
import { EbayChatController } from "@/controllers/ebay-chat.controller";
import { authGuard } from "@/guards/auth.guard";
import { EbayChatService } from "@/services/ebay-chat.service";

export const ebayChat = (router: Router) => {
    // Test endpoint (no auth required)
    router.get("/test", (req, res) => {
        res.json({
            success: true,
            message: "eBay chat API is working!",
            timestamp: new Date().toISOString()
        });
    });

    // Test REST API endpoints (no auth required for testing)
    router.get("/test-rest-api", async (req, res) => {
        try {
            const conversations = await EbayChatService.getEbayConversationsFromAPI();
            res.json({
                success: true,
                message: "eBay REST API test successful",
                data: {
                    conversationsCount: conversations.length,
                    conversations: conversations.slice(0, 3) // Return first 3 for testing
                },
                timestamp: new Date().toISOString()
            });
        } catch (error: any) {
            res.status(500).json({
                success: false,
                message: "eBay REST API test failed",
                error: error.message,
                timestamp: new Date().toISOString()
            });
        }
    });

    // Send a message to a buyer
    router.post("/send", authGuard.isAuth as any, EbayChatController.sendMessage);

    // Get messages for a specific conversation
    router.get("/messages/:ebayItemId/:buyerUsername", authGuard.isAuth as any, EbayChatController.getMessages);

    // Get all conversations for a seller
    router.get("/conversations", authGuard.isAuth as any, EbayChatController.getConversations);
    router.get("/conversations/:sellerUsername", authGuard.isAuth as any, EbayChatController.getConversations);

    // Mark a message as read
    router.patch("/messages/:messageId/read", authGuard.isAuth as any, EbayChatController.markAsRead);

    // Mark a conversation as read
    router.patch("/conversations/:ebayItemId/:buyerUsername/read", authGuard.isAuth as any, EbayChatController.markConversationAsRead);

    // Sync messages from eBay
    router.post("/sync", authGuard.isAuth as any, EbayChatController.syncMessages);

    // Search messages
    router.get("/search", authGuard.isAuth as any, EbayChatController.searchMessages);
    router.get("/search/:sellerUsername", authGuard.isAuth as any, EbayChatController.searchMessages);

    // Get order list from local database
    router.get("/orders", authGuard.isAuth as any, EbayChatController.getOrderList);
    router.get("/orders/:sellerUsername", authGuard.isAuth as any, EbayChatController.getOrderList);

    // Get eBay orders directly from API
    router.get("/ebay-orders", authGuard.isAuth as any, EbayChatController.getEbayOrders);
    router.get("/ebay-orders/:sellerUsername", authGuard.isAuth as any, EbayChatController.getEbayOrders);

    // Get orders using existing eBay listing service (for comparison/testing)
    router.get("/orders-listing-service", authGuard.isAuth as any, async (req, res) => {
      try {
        console.log("=== ORDERS LISTING SERVICE DEBUG ===");
        console.log("Request headers:", req.headers);
        console.log("Request query:", req.query);
        console.log("Request params:", req.params);
        
        const { ebayListingService } = await import("@/services");
        console.log("eBay listing service imported successfully");
        
        await ebayListingService.getOrders(req, res);
        console.log("eBay listing service getOrders completed");
      } catch (error: any) {
        console.error("Error getting orders:", error);
        console.error("Error stack:", error.stack);
        res.status(500).json({
          success: false,
          message: "Failed to retrieve orders",
          error: error.message,
          stack: error.stack
        });
      }
    });

    // Get orders using existing eBay listing service without auth (for testing)
    router.get("/orders-listing-service-test", async (req, res) => {
      try {
        console.log("=== ORDERS LISTING SERVICE TEST (NO AUTH) ===");
        const { ebayListingService } = await import("@/services");
        await ebayListingService.getOrders(req, res);
      } catch (error: any) {
        console.error("Error getting orders (no auth):", error);
        res.status(500).json({
          success: false,
          message: "Failed to retrieve orders",
          error: error.message
        });
      }
    });

    // Get orders without auth for testing
    router.get("/orders-test", async (req, res) => {
      try {
        const { ebayListingService } = await import("@/services");
        await ebayListingService.getOrders(req, res);
      } catch (error: any) {
        console.error("Error getting orders:", error);
        res.status(500).json({
          success: false,
          message: "Failed to retrieve orders",
          error: error.message
        });
      }
    });
}; 