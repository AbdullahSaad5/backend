import { Router } from "express";
import { EbayChatSandboxController } from "@/controllers/ebay-chat-sandbox.controller";
import { authGuard } from "@/guards/auth.guard";
import { EbayChatModel, EbayConversationModel } from "@/models/ebay-chat.model";

export const ebayChatSandbox = (router: Router) => {
    // Sandbox-specific routes (no auth required for testing)

    // Test endpoint
    router.get("/test", (req, res) => {
        res.json({ success: true, message: "Sandbox API is working!" });
    });

    // Database test endpoint
    router.get("/test-db", async (req, res) => {
        try {
            console.log('=== TESTING DATABASE CONNECTION ===');

            // Test database connection by trying to count documents
            const conversationCount = await EbayConversationModel.countDocuments();
            console.log('Conversation count:', conversationCount);

            const messageCount = await EbayChatModel.countDocuments();
            console.log('Message count:', messageCount);

            res.json({
                success: true,
                message: "Database connection working!",
                data: {
                    conversations: conversationCount,
                    messages: messageCount
                }
            });
        } catch (error: any) {
            console.error("=== DATABASE TEST ERROR ===");
            console.error("Error:", error);
            console.error("Error message:", error.message);
            console.error("Error stack:", error.stack);

            res.status(500).json({
                success: false,
                message: "Database connection failed",
                error: error.message,
                details: error.stack
            });
        }
    });

    // Initialize sandbox with sample data (no auth for testing)
    router.post("/initialize", EbayChatSandboxController.initializeSandbox!);

    // Clear sandbox data (no auth for testing)
    router.delete("/clear", EbayChatSandboxController.clearSandboxData!);

    // Sandbox messaging endpoints (no auth for testing)
    router.post("/send", EbayChatSandboxController.sendMessage);
    router.get("/messages/:ebayItemId/:buyerUsername", EbayChatSandboxController.getMessages);
    router.get("/conversations", EbayChatSandboxController.getConversations);
    router.get("/conversations/:sellerUsername", EbayChatSandboxController.getConversations);
    router.patch("/messages/:messageId/read", EbayChatSandboxController.markAsRead);
    router.patch("/conversations/:ebayItemId/:buyerUsername/read", EbayChatSandboxController.markConversationAsRead!);
    router.post("/sync", EbayChatSandboxController.syncMessages);
    router.get("/search", EbayChatSandboxController.searchMessages);
    router.get("/search/:sellerUsername", EbayChatSandboxController.searchMessages);
}; 