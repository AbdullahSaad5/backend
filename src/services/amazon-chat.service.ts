import { AmazonChatModel, IAmazonChat } from "@/models/amazon-chat.model";
import { getStoredAmazonAccessToken } from "@/utils/amazon-helpers.util";
import fetch from "node-fetch";
// import your token and signature helpers here

export const AmazonChatService = {
    sendMessage: async (messageData: Partial<IAmazonChat>): Promise<IAmazonChat> => {
        // Validate required fields
        if (!messageData.orderId) {
            throw new Error("Order ID is required for Amazon messaging");
        }

        if (!messageData.content || messageData.content.trim().length === 0) {
            throw new Error("Message content is required");
        }

        // Validate order ID format (Amazon order IDs typically have a specific format)
        const orderIdPattern = /^\d{3}-\d{7}-\d{7}$/; // Example: 123-1234567-1234567
        if (!orderIdPattern.test(messageData.orderId)) {
            throw new Error("Invalid Amazon order ID format. Expected format: XXX-XXXXXXX-XXXXXXX");
        }

        // Save outgoing message to DB first
        const message = new AmazonChatModel({
            ...messageData,
            status: 'sent',
            sentAt: new Date()
        });
        await message.save();

        // Call Amazon SP-API Messaging API (real implementation)
        try {
            const accessToken = await getStoredAmazonAccessToken();
            if (!accessToken) {
                throw new Error("Missing or invalid Amazon access token");
            }

            // Use the correct Amazon SP-API endpoint for messaging
            const endpoint = `https://sellingpartnerapi-na.amazon.com/messaging/v1/orders/${messageData.orderId}/messages`;

            // Amazon SP-API Messaging payload format
            const payload = {
                messageType: "contactBuyer", // Standard message type for order-related communication
                text: messageData.content,
                subject: messageData.subject || "Message from seller"
            };

            console.log("🔍 Amazon Messaging API - Order ID:", messageData.orderId);
            console.log("🔍 Amazon Messaging API - Payload:", JSON.stringify(payload, null, 2));

            const response = await fetch(endpoint, {
                method: "POST",
                headers: {
                    "x-amz-access-token": accessToken,
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${accessToken}`
                },
                body: JSON.stringify(payload)
            });

            // Parse response as text, then try/catch JSON.parse (like listing service)
            const rawResponse = await response.text();
            let result: any = {};
            try {
                result = JSON.parse(rawResponse);
            } catch (err) {
                console.error("Error parsing Amazon Messaging API response as JSON", err);
                result = { error: "Failed to parse Amazon Messaging API response" };
            }

            // Log for debugging
            console.log("Amazon Messaging API response:", rawResponse);

            if (response.ok) {
                message.status = 'delivered';
                message.amazonMessageId = result.messageId || result.messageID || result.id || 'no-id';
                await message.save();
                console.log("✅ Message sent successfully to Amazon");
            } else {
                message.status = 'failed';
                await message.save();

                // Handle specific Amazon errors
                if (result.errors && result.errors.length > 0) {
                    const error = result.errors[0];
                    if (error.code === 'InvalidInput') {
                        throw new Error(`Invalid order ID or message format: ${error.message}`);
                    } else if (error.code === 'Unauthorized') {
                        throw new Error(`Not authorized to send messages for this order: ${error.message}`);
                    } else {
                        throw new Error(`Amazon API error: ${error.message}`);
                    }
                } else {
                    throw new Error(result.message || result.error || "Amazon SP-API error");
                }
            }
        } catch (error) {
            message.status = 'failed';
            await message.save();
            throw error;
        }
        return message;
    },

    getMessages: async (orderId: string): Promise<IAmazonChat[]> => {
        if (!orderId) {
            throw new Error("Order ID is required");
        }
        return AmazonChatModel.find({ orderId }).sort({ createdAt: 1 }).exec();
    },

    // Get message statistics for an order
    getMessageStats: async (orderId: string) => {
        if (!orderId) {
            throw new Error("Order ID is required");
        }

        const messages = await AmazonChatModel.find({ orderId });
        const stats = {
            totalMessages: messages.length,
            sentCount: messages.filter(m => m.status === 'sent').length,
            deliveredCount: messages.filter(m => m.status === 'delivered').length,
            failedCount: messages.filter(m => m.status === 'failed').length,
            lastMessageAt: messages.length > 0 ? messages[messages.length - 1].sentAt : null
        };

        return stats;
    },

    // Helper method to validate if an order exists (optional)
    validateOrderExists: async (orderId: string): Promise<boolean> => {
        try {
            const accessToken = await getStoredAmazonAccessToken();
            if (!accessToken) {
                return false;
            }

            // You could add a call to Amazon's Orders API here to validate the order exists
            // For now, we'll just validate the format
            const orderIdPattern = /^\d{3}-\d{7}-\d{7}$/;
            return orderIdPattern.test(orderId);
        } catch (error) {
            console.error("Error validating order:", error);
            return false;
        }
    }
}; 