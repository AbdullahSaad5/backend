import { Request, Response } from "express";
import { EbayChatService } from "@/services/ebay-chat.service";
import { StatusCodes } from "http-status-codes";

export const ebayChatController = {
  // Get all orders for chat functionality
  getOrders: async (req: Request, res: Response) => {
    try {
      await EbayChatService.getOrders(req, res);
    } catch (error: any) {
      console.error("❌ Controller error getting orders:", error);
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        success: false,
        error: "Controller error getting orders",
        details: error.message,
      });
    }
  },

  // Get a specific order by ID
  getOrderById: async (req: Request, res: Response) => {
    try {
      await EbayChatService.getOrderById(req, res);
    } catch (error: any) {
      console.error("❌ Controller error getting order by ID:", error);
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        success: false,
        error: "Controller error getting order by ID",
        details: error.message,
      });
    }
  },

  // Send a message to buyer/seller
  sendMessage: async (req: Request, res: Response) => {
    try {
      await EbayChatService.sendMessage(req, res);
    } catch (error: any) {
      console.error("❌ Controller error sending message:", error);
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        success: false,
        error: "Controller error sending message",
        details: error.message,
      });
    }
  },

  // Get messages for a specific order
  getMessages: async (req: Request, res: Response) => {
    try {
      await EbayChatService.getMessages(req, res);
    } catch (error: any) {
      console.error("❌ Controller error getting messages:", error);
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        success: false,
        error: "Controller error getting messages",
        details: error.message,
      });
    }
  },
};
