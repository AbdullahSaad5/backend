import { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import { EbayChatService } from "@/services/ebay-chat.service";
import { IEbayChatController, EbayMessageType } from "@/contracts/ebay-chat.contract";

// Extend Request interface to include user property
interface AuthenticatedRequest extends Request {
  user?: {
    username: string;
    [key: string]: any;
  };
}

export const ebayChatController: IEbayChatController = {
  // Send a message
  sendMessage: async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { ebayItemId, orderId, buyerUsername, content, attachments } = req.body;

      // Validate required fields
      if (!ebayItemId || !buyerUsername || !content) {
        res.status(StatusCodes.BAD_REQUEST).json({
          success: false,
          message: "Missing required fields: ebayItemId, buyerUsername, content",
        });
        return;
      }

      // Get seller username from authenticated user or request
      const sellerUsername = req.user?.username || req.body.sellerUsername || "default_seller";

      const messageData = {
        ebayItemId,
        orderId,
        buyerUsername,
        sellerUsername,
        content,
        attachments,
        messageType: EbayMessageType.SELLER_TO_BUYER,
      };

      const message = await EbayChatService.sendMessage(messageData);

      res.status(StatusCodes.CREATED).json({
        success: true,
        message: "Message sent successfully",
        data: message,
      });
    } catch (error: any) {
      console.error("Error sending message:", error);
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: "Failed to send message",
        error: error.message,
      });
    }
  },

  // Get messages for a specific item and buyer
  getMessages: async (req: Request, res: Response): Promise<void> => {
    try {
      const { ebayItemId, buyerUsername } = req.params;
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 50;

      if (!ebayItemId || !buyerUsername) {
        res.status(StatusCodes.BAD_REQUEST).json({
          success: false,
          message: "Missing required parameters: ebayItemId, buyerUsername",
        });
        return;
      }

      const messages = await EbayChatService.getMessages(ebayItemId, buyerUsername, page, limit);

      res.status(StatusCodes.OK).json({
        success: true,
        message: "Messages retrieved successfully",
        data: {
          messages,
          pagination: {
            page,
            limit,
            total: messages.length,
          },
        },
      });
    } catch (error: any) {
      console.error("Error getting messages:", error);
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: "Failed to get messages",
        error: error.message,
      });
    }
  },

  // Get all conversations for a seller
  getConversations: async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const sellerUsername = req.params.sellerUsername || req.user?.username || "default_seller";

      const conversations = await EbayChatService.getConversations(sellerUsername);
      const unreadCount = await EbayChatService.getUnreadCount(sellerUsername);

      res.status(StatusCodes.OK).json({
        success: true,
        message: "Conversations retrieved successfully",
        data: {
          conversations,
          unreadCount,
          total: conversations.length,
        },
      });
    } catch (error: any) {
      console.error("Error getting conversations:", error);
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: "Failed to get conversations",
        error: error.message,
      });
    }
  },

  // Mark a specific message as read
  markAsRead: async (req: Request, res: Response): Promise<void> => {
    try {
      const { messageId } = req.params;

      if (!messageId) {
        res.status(StatusCodes.BAD_REQUEST).json({
          success: false,
          message: "Missing required parameter: messageId",
        });
        return;
      }

      const message = await EbayChatService.markAsRead(messageId);

      if (!message) {
        res.status(StatusCodes.NOT_FOUND).json({
          success: false,
          message: "Message not found",
        });
        return;
      }

      res.status(StatusCodes.OK).json({
        success: true,
        message: "Message marked as read",
        data: message,
      });
    } catch (error: any) {
      console.error("Error marking message as read:", error);
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: "Failed to mark message as read",
        error: error.message,
      });
    }
  },

  // Mark all messages in a conversation as read
  markConversationAsRead: async (req: Request, res: Response): Promise<void> => {
    try {
      const { ebayItemId, buyerUsername } = req.params;

      if (!ebayItemId || !buyerUsername) {
        res.status(StatusCodes.BAD_REQUEST).json({
          success: false,
          message: "Missing required parameters: ebayItemId, buyerUsername",
        });
        return;
      }

      await EbayChatService.markConversationAsRead(ebayItemId, buyerUsername);

      res.status(StatusCodes.OK).json({
        success: true,
        message: "Conversation marked as read",
      });
    } catch (error: any) {
      console.error("Error marking conversation as read:", error);
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: "Failed to mark conversation as read",
        error: error.message,
      });
    }
  },

  // Sync messages from eBay API
  syncMessages: async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const sellerUsername = req.body.sellerUsername || req.user?.username || "default_seller";

      // Start sync process
      await EbayChatService.syncEbayMessages(sellerUsername);

      res.status(StatusCodes.OK).json({
        success: true,
        message: "Messages synced successfully from eBay",
      });
    } catch (error: any) {
      console.error("Error syncing messages:", error);
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: "Failed to sync messages",
        error: error.message,
      });
    }
  },

  // Search messages
  searchMessages: async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { query } = req.query;
      const sellerUsername = req.params.sellerUsername || req.user?.username || "default_seller";

      if (!query || typeof query !== "string") {
        res.status(StatusCodes.BAD_REQUEST).json({
          success: false,
          message: "Missing or invalid query parameter",
        });
        return;
      }

      const messages = await EbayChatService.searchMessages(query, sellerUsername);

      res.status(StatusCodes.OK).json({
        success: true,
        message: "Search completed successfully",
        data: {
          messages,
          query,
          total: messages.length,
        },
      });
    } catch (error: any) {
      console.error("Error searching messages:", error);
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: "Failed to search messages",
        error: error.message,
      });
    }
  },

  // Get unread count for a seller
  getUnreadCount: async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const sellerUsername = req.params.sellerUsername || req.user?.username || "default_seller";

      const unreadCount = await EbayChatService.getUnreadCount(sellerUsername);

      res.status(StatusCodes.OK).json({
        success: true,
        message: "Unread count retrieved successfully",
        data: {
          unreadCount,
          sellerUsername,
        },
      });
    } catch (error: any) {
      console.error("Error getting unread count:", error);
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: "Failed to get unread count",
        error: error.message,
      });
    }
  },
};
