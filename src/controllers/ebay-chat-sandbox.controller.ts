import { Request, Response } from "express";
import { StatusCodes, ReasonPhrases } from "http-status-codes";
import { EbayChatSandboxService } from "@/services/ebay-chat-sandbox.service";
import { IEbayChatController, EbayMessageType } from "@/contracts/ebay-chat.contract";

// Extend Request type to include user property
interface AuthenticatedRequest extends Request {
    user?: {
        username: string;
        [key: string]: any;
    };
}

export const EbayChatSandboxController: IEbayChatController = {
    sendMessage: async (req: AuthenticatedRequest, res: Response): Promise<void> => {
        try {
            const { ebayItemId, buyerUsername, content, subject } = req.body;
            const sellerUsername = req.user?.username || req.body.sellerUsername || "test_seller";

            if (!ebayItemId || !buyerUsername || !content) {
                res.status(StatusCodes.BAD_REQUEST).json({
                    success: false,
                    message: "Missing required fields: ebayItemId, buyerUsername, content"
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

            const message = await EbayChatSandboxService.sendMessage(messageData);

            res.status(StatusCodes.CREATED).json({
                success: true,
                message: "Message sent successfully (SANDBOX)",
                data: message
            });
        } catch (error: any) {
            console.error("Error sending sandbox eBay message:", error);
            res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
                success: false,
                message: "Failed to send message",
                error: error.message
            });
        }
    },

    getMessages: async (req: AuthenticatedRequest, res: Response): Promise<void> => {
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

            console.log('=== SANDBOX: GETTING MESSAGES ===');
            console.log('Item ID:', ebayItemId, 'Buyer:', buyerUsername);

            const messages = await EbayChatSandboxService.getMessages(
                ebayItemId,
                buyerUsername,
                Number(page),
                Number(limit)
            );

            console.log(`Found ${messages.length} messages`);

            res.status(StatusCodes.OK).json({
                success: true,
                message: "Messages retrieved successfully (SANDBOX)",
                data: messages
            });
        } catch (error: any) {
            console.error("Error getting sandbox eBay messages:", error);
            res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
                success: false,
                message: "Failed to retrieve messages",
                error: error.message
            });
        }
    },

    getConversations: async (req: AuthenticatedRequest, res: Response): Promise<void> => {
        try {
            const sellerUsername = req.user?.username || req.params.sellerUsername || "test_seller";

            console.log('=== SANDBOX: GETTING CONVERSATIONS ===');
            console.log('Seller username:', sellerUsername);

            const conversations = await EbayChatSandboxService.getConversations(sellerUsername);
            const unreadCount = await EbayChatSandboxService.getUnreadCount(sellerUsername);

            console.log(`Found ${conversations.length} conversations, ${unreadCount} unread`);

            res.status(StatusCodes.OK).json({
                success: true,
                message: "Conversations retrieved successfully (SANDBOX)",
                data: {
                    conversations,
                    unreadCount
                }
            });
        } catch (error: any) {
            console.error("Error getting sandbox eBay conversations:", error);
            res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
                success: false,
                message: "Failed to retrieve conversations",
                error: error.message
            });
        }
    },

    markAsRead: async (req: AuthenticatedRequest, res: Response): Promise<void> => {
        try {
            const { messageId } = req.params;

            if (!messageId) {
                res.status(StatusCodes.BAD_REQUEST).json({
                    success: false,
                    message: "Missing message ID"
                });
                return;
            }

            const message = await EbayChatSandboxService.markAsRead(messageId);

            if (!message) {
                res.status(StatusCodes.NOT_FOUND).json({
                    success: false,
                    message: "Message not found"
                });
                return;
            }

            res.status(StatusCodes.OK).json({
                success: true,
                message: "Message marked as read (SANDBOX)",
                data: message
            });
        } catch (error: any) {
            console.error("Error marking sandbox message as read:", error);
            res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
                success: false,
                message: "Failed to mark message as read",
                error: error.message
            });
        }
    },

    markConversationAsRead: async (req: AuthenticatedRequest, res: Response): Promise<void> => {
        try {
            const { ebayItemId, buyerUsername } = req.params;
            const sellerUsername = req.user?.username || req.body.sellerUsername || "test_seller";

            if (!ebayItemId || !buyerUsername) {
                res.status(StatusCodes.BAD_REQUEST).json({
                    success: false,
                    message: "Missing required parameters: ebayItemId, buyerUsername"
                });
                return;
            }

            console.log('=== SANDBOX: MARKING CONVERSATION AS READ ===');
            console.log('Item ID:', ebayItemId, 'Buyer:', buyerUsername, 'Seller:', sellerUsername);

            await EbayChatSandboxService.markConversationAsRead(ebayItemId, buyerUsername);

            res.status(StatusCodes.OK).json({
                success: true,
                message: "Conversation marked as read (SANDBOX)"
            });
        } catch (error: any) {
            console.error("Error marking sandbox conversation as read:", error);
            res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
                success: false,
                message: "Failed to mark conversation as read",
                error: error.message
            });
        }
    },

    syncMessages: async (req: AuthenticatedRequest, res: Response): Promise<void> => {
        try {
            const sellerUsername = req.user?.username || req.body.sellerUsername || "test_seller";

            await EbayChatSandboxService.syncEbayMessages(sellerUsername);

            res.status(StatusCodes.OK).json({
                success: true,
                message: "eBay messages synced successfully (SANDBOX)"
            });
        } catch (error: any) {
            console.error("Error syncing sandbox eBay messages:", error);
            res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
                success: false,
                message: "Failed to sync eBay messages",
                error: error.message
            });
        }
    },

    searchMessages: async (req: AuthenticatedRequest, res: Response): Promise<void> => {
        try {
            const { query } = req.query;
            const sellerUsername = req.user?.username || req.params.sellerUsername || "test_seller";

            if (!query) {
                res.status(StatusCodes.BAD_REQUEST).json({
                    success: false,
                    message: "Missing required parameter: query"
                });
                return;
            }

            const messages = await EbayChatSandboxService.searchMessages(
                query as string,
                sellerUsername
            );

            res.status(StatusCodes.OK).json({
                success: true,
                message: "Search completed successfully (SANDBOX)",
                data: messages
            });
        } catch (error: any) {
            console.error("Error searching sandbox eBay messages:", error);
            res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
                success: false,
                message: "Failed to search messages",
                error: error.message
            });
        }
    },

    // Sandbox-specific endpoints
    initializeSandbox: async (req: AuthenticatedRequest, res: Response): Promise<void> => {
        try {
            console.log('=== CONTROLLER: INITIALIZING SANDBOX ===');
            const sellerUsername = req.user?.username || req.body.sellerUsername || "test_seller";
            console.log('Using seller username:', sellerUsername);

            await EbayChatSandboxService.initializeSandboxData!(sellerUsername);

            res.status(StatusCodes.OK).json({
                success: true,
                message: "Sandbox data initialized successfully",
                data: {
                    sellerUsername,
                    message: "Sample conversations and messages created for testing"
                }
            });
        } catch (error: any) {
            console.error("=== CONTROLLER: ERROR INITIALIZING SANDBOX ===");
            console.error("Error:", error);
            console.error("Error message:", error.message);
            console.error("Error stack:", error.stack);

            res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
                success: false,
                message: "Failed to initialize sandbox",
                error: error.message,
                details: error.stack
            });
        }
    },

    clearSandboxData: async (req: AuthenticatedRequest, res: Response): Promise<void> => {
        try {
            const sellerUsername = req.user?.username || req.body.sellerUsername || "test_seller";

            // Clear all sandbox data for this seller
            await EbayChatSandboxService.clearSandboxData!(sellerUsername);

            res.status(StatusCodes.OK).json({
                success: true,
                message: "Sandbox data cleared successfully",
                data: {
                    sellerUsername,
                    message: "All test conversations and messages removed"
                }
            });
        } catch (error: any) {
            console.error("Error clearing sandbox data:", error);
            res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
                success: false,
                message: "Failed to clear sandbox data",
                error: error.message
            });
        }
    }
}; 