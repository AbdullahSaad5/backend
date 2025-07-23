import { Request, Response } from "express";
import { AmazonChatService } from "@/services/amazon-chat.service";
import { amazonListingService } from "@/services/amazon-listing.service";

export const AmazonChatController = {
    // Get all Amazon orders (to select which order to message)
    getOrders: async (req: Request, res: Response) => {
        try {
            // Call the existing Amazon listing service to get orders
            await amazonListingService.getOrders(req, res);
        } catch (error: any) {
            console.error("Error getting Amazon orders:", error);
            res.status(500).json({
                success: false,
                message: "Failed to retrieve Amazon orders",
                error: error.message
            });
        }
    },

    sendMessage: async (req: Request, res: Response) => {
        try {
            const { orderId, buyerEmail, subject, content } = req.body;

            // Basic validation
            if (!orderId || !content) {
                return res.status(400).json({
                    success: false,
                    message: "Missing required fields: orderId, content"
                });
            }

            // Validate order ID format
            const orderIdPattern = /^\d{3}-\d{7}-\d{7}$/;
            if (!orderIdPattern.test(orderId)) {
                return res.status(400).json({
                    success: false,
                    message: "Invalid Amazon order ID format. Expected format: XXX-XXXXXXX-XXXXXXX",
                    example: "123-1234567-1234567"
                });
            }

            const message = await AmazonChatService.sendMessage({
                orderId,
                buyerEmail,
                subject,
                content
            });

            res.status(201).json({
                success: true,
                message: "Message sent successfully to Amazon buyer",
                data: {
                    amazonMessageId: message.amazonMessageId,
                    orderId: message.orderId,
                    status: message.status,
                    sentAt: message.sentAt
                }
            });
        } catch (error: any) {
            console.error("Error sending Amazon message:", error);

            // Handle specific Amazon API errors
            if (error.message.includes("Invalid order ID")) {
                return res.status(400).json({
                    success: false,
                    message: "Invalid Amazon order ID",
                    error: error.message
                });
            }

            if (error.message.includes("Not authorized")) {
                return res.status(403).json({
                    success: false,
                    message: "Not authorized to send messages for this order",
                    error: error.message
                });
            }

            res.status(500).json({
                success: false,
                message: "Failed to send message to Amazon buyer",
                error: error.message
            });
        }
    },

    getMessages: async (req: Request, res: Response) => {
        try {
            const { orderId } = req.params;

            if (!orderId) {
                return res.status(400).json({
                    success: false,
                    message: "Missing orderId parameter"
                });
            }

            // Validate order ID format
            const orderIdPattern = /^\d{3}-\d{7}-\d{7}$/;
            if (!orderIdPattern.test(orderId)) {
                return res.status(400).json({
                    success: false,
                    message: "Invalid Amazon order ID format. Expected format: XXX-XXXXXXX-XXXXXXX"
                });
            }

            const messages = await AmazonChatService.getMessages(orderId);

            res.status(200).json({
                success: true,
                message: "Messages retrieved successfully",
                data: {
                    orderId,
                    messageCount: messages.length,
                    messages: messages
                }
            });
        } catch (error: any) {
            console.error("Error getting Amazon messages:", error);
            res.status(500).json({
                success: false,
                message: "Failed to retrieve messages",
                error: error.message
            });
        }
    },

    // Alias for getMessages - provides message history for an order
    getMessageHistory: async (req: Request, res: Response) => {
        // This is the same as getMessages, just a different endpoint name
        return AmazonChatController.getMessages(req, res);
    },

    // Get message statistics for a specific order
    getMessageStats: async (req: Request, res: Response) => {
        try {
            const { orderId } = req.params;

            if (!orderId) {
                return res.status(400).json({
                    success: false,
                    message: "Missing orderId parameter"
                });
            }

            // Validate order ID format
            const orderIdPattern = /^\d{3}-\d{7}-\d{7}$/;
            if (!orderIdPattern.test(orderId)) {
                return res.status(400).json({
                    success: false,
                    message: "Invalid Amazon order ID format. Expected format: XXX-XXXXXXX-XXXXXXX"
                });
            }

            const stats = await AmazonChatService.getMessageStats(orderId);

            res.status(200).json({
                success: true,
                message: "Message statistics retrieved successfully",
                data: {
                    orderId,
                    stats
                }
            });
        } catch (error: any) {
            console.error("Error getting Amazon message stats:", error);
            res.status(500).json({
                success: false,
                message: "Failed to retrieve message statistics",
                error: error.message
            });
        }
    }
}; 