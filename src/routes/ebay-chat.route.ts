import { Router } from "express";
import { EbayChatController } from "@/controllers/ebay-chat.controller";
import { authGuard } from "@/guards/auth.guard";

export const ebayChat = (router: Router) => {
    // Test endpoint (no auth required)
    router.get("/test", (req, res) => {
        res.json({
            success: true,
            message: "eBay chat API is working!",
            timestamp: new Date().toISOString()
        });
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


}; 