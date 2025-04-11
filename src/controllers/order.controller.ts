import { orderService } from "@/services"; // Assuming you have an order service
import { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";

export const orderController = {
  // Add a new order
  addOrder: async (req: Request, res: Response) => {
    try {
      const orderData = req.body; // Destructure order details from the request body
      const newOrder = await orderService.addOrder(orderData); // Call the service to add the order
      return res.status(StatusCodes.CREATED).json({
        success: true,
        message: "Order created successfully",
        data: newOrder,
      });
    } catch (error) {
      console.error("Error creating order:", error);
      return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: "Error creating order",
      });
    }
  },

  // Get all orders
  getAllOrders: async (req: Request, res: Response) => {
    try {
      const orders = await orderService.getAllOrders(); // Call service to get all orders
      return res.status(StatusCodes.OK).json({
        success: true,
        orders,
      });
    } catch (error) {
      console.error("Error fetching all orders:", error);
      return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: "Error fetching all orders",
      });
    }
  },

  // Get an order by ID
  getOrderById: async (req: Request, res: Response) => {
    try {
      const orderId = req.params.id; // Get the order ID from the request params
      const order = await orderService.getOrderById(orderId); // Call service to fetch order by ID
      if (!order) {
        return res
          .status(StatusCodes.NOT_FOUND)
          .json({ message: "Order not found" });
      }
      return res.status(StatusCodes.OK).json({
        success: true,
        order,
      });
    } catch (error) {
      console.error("Error fetching order:", error);
      return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: "Error fetching order",
      });
    }
  },

  // Update an order by ID
  updateOrderById: async (req: Request, res: Response) => {
    try {
      const orderId = req.params.id; // Get the order ID from the request params
      const data = req.body; // Get updated data from the request body
      const updatedOrder = await orderService.updateOrderById(orderId, data); // Call service to update the order
      if (!updatedOrder) {
        return res
          .status(StatusCodes.NOT_FOUND)
          .json({ message: "Order not found" });
      }
      return res.status(StatusCodes.OK).json({
        success: true,
        message: "Order updated successfully",
        order: updatedOrder,
      });
    } catch (error) {
      console.error("Error updating order:", error);
      return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: "Error updating order",
      });
    }
  },

  // Delete an order by ID
  deleteOrderById: async (req: Request, res: Response) => {
    try {
      const orderId = req.params.id; // Get the order ID from the request params
      const deletedOrder = await orderService.deleteOrderById(orderId); // Call service to delete the order
      if (!deletedOrder) {
        return res
          .status(StatusCodes.NOT_FOUND)
          .json({ message: "Order not found" });
      }
      return res.status(StatusCodes.OK).json({
        success: true,
        message: "Order deleted successfully",
      });
    } catch (error) {
      console.error("Error deleting order:", error);
      return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: "Error deleting order",
      });
    }
  },
};
