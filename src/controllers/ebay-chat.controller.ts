import { Request, Response } from "express";
import { StatusCodes, ReasonPhrases } from "http-status-codes";
import { EbayChatService } from "@/services/ebay-chat.service";
import { IEbayChatController, EbayMessageType } from "@/contracts/ebay-chat.contract";

export const EbayChatController: IEbayChatController = {
    sendMessage: async (req: Request, res: Response): Promise<void> => {
        try {
            const { ebayItemId, buyerUsername, content, subject } = req.body;
            const sellerUsername = req.context?.user?.email || req.body.sellerUsername;

            if (!ebayItemId || !buyerUsername || !content || !sellerUsername) {
                res.status(StatusCodes.BAD_REQUEST).json({
                    success: false,
                    message: "Missing required fields: ebayItemId, buyerUsername, content, sellerUsername"
                });
                return;
            }

            const messageData = {
                ebayItemId,
                buyerUsername,
                sellerUsername,
                content,
                subject,
                messageType: EbayMessageType.SELLER_TO_BUYER
            };

            const message = await EbayChatService.sendMessage(messageData);

            res.status(StatusCodes.CREATED).json({
                success: true,
                message: "Message sent successfully",
                data: message
            });
        } catch (error: any) {
            console.error("Error sending eBay message:", error);
            res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
                success: false,
                message: "Failed to send message",
                error: error.message
            });
        }
    },

    getMessages: async (req: Request, res: Response): Promise<void> => {
        try {
            const { ebayItemId, buyerUsername } = req.params;
            const { page = 1, limit = 50 } = req.query;

            if (!ebayItemId || !buyerUsername) {
                res.status(StatusCodes.BAD_REQUEST).json({
                    success: false,
                    message: "Missing required parameters: ebayItemId, buyerUsername"
                });
                return;
            }

            const messages = await EbayChatService.getMessages(
                ebayItemId,
                buyerUsername,
                Number(page),
                Number(limit)
            );

            res.status(StatusCodes.OK).json({
                success: true,
                message: "Messages retrieved successfully",
                data: messages
            });
        } catch (error: any) {
            console.error("Error getting eBay messages:", error);
            res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
                success: false,
                message: "Failed to retrieve messages",
                error: error.message
            });
        }
    },

    getConversations: async (req: Request, res: Response): Promise<void> => {
        try {
            console.log("=== GET CONVERSATIONS DEBUG ===");
            console.log("req.context:", req.context);
            console.log("req.context?.user:", req.context?.user);
            console.log("req.context?.user?.email:", req.context?.user?.email);
            console.log("req.params.sellerUsername:", req.params.sellerUsername);

            // For testing, use a fallback email if no user is authenticated
            const sellerUsername = req.context?.user?.email || req.params.sellerUsername || "test@example.com";

            console.log("Final sellerUsername:", sellerUsername);

            if (!sellerUsername) {
                console.log("❌ No seller username found");
                res.status(StatusCodes.BAD_REQUEST).json({
                    success: false,
                    message: "Missing seller username"
                });
                return;
            }

            const conversations = await EbayChatService.getConversations(sellerUsername);
            const unreadCount = await EbayChatService.getUnreadCount(sellerUsername);

            res.status(StatusCodes.OK).json({
                success: true,
                message: "Conversations retrieved successfully",
                data: {
                    conversations,
                    unreadCount
                }
            });
        } catch (error: any) {
            console.error("Error getting eBay conversations:", error);
            res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
                success: false,
                message: "Failed to retrieve conversations",
                error: error.message
            });
        }
    },

    markAsRead: async (req: Request, res: Response): Promise<void> => {
        try {
            const { messageId } = req.params;

            if (!messageId) {
                res.status(StatusCodes.BAD_REQUEST).json({
                    success: false,
                    message: "Missing message ID"
                });
                return;
            }

            const message = await EbayChatService.markAsRead(messageId);

            if (!message) {
                res.status(StatusCodes.NOT_FOUND).json({
                    success: false,
                    message: "Message not found"
                });
                return;
            }

            res.status(StatusCodes.OK).json({
                success: true,
                message: "Message marked as read",
                data: message
            });
        } catch (error: any) {
            console.error("Error marking message as read:", error);
            res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
                success: false,
                message: "Failed to mark message as read",
                error: error.message
            });
        }
    },

    syncMessages: async (req: Request, res: Response): Promise<void> => {
        try {
            const sellerUsername = req.context?.user?.email || req.body.sellerUsername;

            if (!sellerUsername) {
                res.status(StatusCodes.BAD_REQUEST).json({
                    success: false,
                    message: "Missing seller username"
                });
                return;
            }

            await EbayChatService.syncEbayMessages(sellerUsername);

            res.status(StatusCodes.OK).json({
                success: true,
                message: "eBay messages synced successfully"
            });
        } catch (error: any) {
            console.error("Error syncing eBay messages:", error);
            res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
                success: false,
                message: "Failed to sync eBay messages",
                error: error.message
            });
        }
    },

    searchMessages: async (req: Request, res: Response): Promise<void> => {
        try {
            const { query } = req.query;
            const sellerUsername = req.context?.user?.email || req.params.sellerUsername;

            if (!query || !sellerUsername) {
                res.status(StatusCodes.BAD_REQUEST).json({
                    success: false,
                    message: "Missing required parameters: query, sellerUsername"
                });
                return;
            }

            const messages = await EbayChatService.searchMessages(
                query as string,
                sellerUsername
            );

            res.status(StatusCodes.OK).json({
                success: true,
                message: "Search completed successfully",
                data: messages
            });
        } catch (error: any) {
            console.error("Error searching eBay messages:", error);
            res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
                success: false,
                message: "Failed to search messages",
                error: error.message
            });
        }
    },

    markConversationAsRead: async (req: Request, res: Response): Promise<void> => {
        try {
            const { ebayItemId, buyerUsername } = req.params;
            const sellerUsername = req.context?.user?.email || req.body.sellerUsername;

            if (!ebayItemId || !buyerUsername) {
                res.status(StatusCodes.BAD_REQUEST).json({
                    success: false,
                    message: "Missing required parameters: ebayItemId, buyerUsername"
                });
                return;
            }

            await EbayChatService.markConversationAsRead(ebayItemId, buyerUsername);

            res.status(StatusCodes.OK).json({
                success: true,
                message: "Conversation marked as read"
            });
        } catch (error: any) {
            console.error("Error marking conversation as read:", error);
            res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
                success: false,
                message: "Failed to mark conversation as read",
                error: error.message
            });
        }
    },

    getOrderList: async (req: Request, res: Response): Promise<void> => {
        try {
            console.log("=== GET ORDER LIST DEBUG ===");
            const sellerUsername = req.context?.user?.email || req.params.sellerUsername || "test@example.com";
            
            console.log("Seller username:", sellerUsername);

            if (!sellerUsername) {
                res.status(StatusCodes.BAD_REQUEST).json({
                    success: false,
                    message: "Missing seller username"
                });
                return;
            }

            const orders = await EbayChatService.getOrderList(sellerUsername);

            res.status(StatusCodes.OK).json({
                success: true,
                message: "Order list retrieved successfully",
                data: {
                    orders,
                    totalOrders: orders.length
                }
            });
        } catch (error: any) {
            console.error("Error getting order list:", error);
            res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
                success: false,
                message: "Failed to retrieve order list",
                error: error.message
            });
        }
    },

    getEbayOrders: async (req: Request, res: Response): Promise<void> => {
        try {
            console.log("=== GET EBAY ORDERS DEBUG ===");
            const sellerUsername = req.context?.user?.email || req.params.sellerUsername || "test@example.com";
            
            console.log("Seller username:", sellerUsername);
            console.log("Request params:", req.params);
            console.log("Request query:", req.query);

            if (!sellerUsername) {
                res.status(StatusCodes.BAD_REQUEST).json({
                    success: false,
                    message: "Missing seller username"
                });
                return;
            }

            console.log("Calling EbayChatService.getEbayOrdersFromAPI...");
            const orders = await EbayChatService.getEbayOrdersFromAPI(sellerUsername);
            console.log("Orders received:", orders?.length || 0);

            res.status(StatusCodes.OK).json({
                success: true,
                message: "eBay orders retrieved successfully",
                data: {
                    orders,
                    totalOrders: orders.length
                }
            });
        } catch (error: any) {
            console.error("Error getting eBay orders:", error);
            res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
                success: false,
                message: "Failed to retrieve eBay orders",
                error: error.message,
                stack: error.stack
            });
        }
    },


}; 