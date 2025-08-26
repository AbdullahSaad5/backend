import { Router } from "express";
import { ebayChatController } from "@/controllers/ebay-chat.controller";

export const ebayChat = (router: Router) => {
  // Get all orders for chat functionality
  router.get("/orders", ebayChatController.getOrders);
  
  // Get a specific order by ID
  router.get("/orders/:orderId", ebayChatController.getOrderById);
  
  // Send a message to buyer/seller
  router.post("/messages/send", ebayChatController.sendMessage);
  
  // Get messages for a specific order
  router.get("/orders/:orderId/messages", ebayChatController.getMessages);
};
