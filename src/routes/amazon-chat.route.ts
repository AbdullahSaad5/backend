import { Router } from "express";
import { AmazonChatController } from "@/controllers/amazon-chat.controller";

export const amazonChat = (router: Router) => {
    // Get all Amazon orders (to select which order to message)
    router.get("/amazon-orders", AmazonChatController.getOrders);

    // Send message to buyer for a specific order
    router.post("/amazon-messages/send", AmazonChatController.sendMessage);

    // Get all messages sent for a specific order
    router.get("/amazon-messages/:orderId", AmazonChatController.getMessages);

    // Get message history for a specific order (alias)
    router.get("/amazon-messages/:orderId/history", AmazonChatController.getMessageHistory);

    // Get message statistics for a specific order
    router.get("/amazon-messages/:orderId/stats", AmazonChatController.getMessageStats);
}; 