import { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import { orderService } from "@/services";
import { OrderStatus, SourcePlatform, PaymentStatus } from "@/contracts/order.contract";
import { ENUMS } from "@/constants/enum";

export const orderController = {
  // Create a new order
  createOrder: async (req: Request, res: Response) => {
    try {
      const orderData = req.body;

      // Validate required fields
      if (!orderData.customerId || !orderData.email || !orderData.shippingAddress) {
        return res.status(StatusCodes.BAD_REQUEST).json({
          success: false,
          message: "Missing required fields: customerId, email, and shippingAddress are required",
        });
      }

      const newOrder = await orderService.createOrder(orderData);

      return res.status(StatusCodes.CREATED).json({
        success: true,
        message: "Order created successfully",
        data: newOrder,
      });
    } catch (error: any) {
      console.error("Error creating order:", error);
      return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: error.message || "Error creating order",
      });
    }
  },

  // Get all orders with filtering and pagination
  getAllOrders: async (req: Request, res: Response) => {
    try {
      const {
        status,
        sourcePlatform,
        paymentStatus,
        customerId,
        startDate,
        endDate,
        page = 1,
        limit = 10,
        sortBy = "createdAt",
        sortOrder = "desc",
      } = req.query;

      // Validate status if provided
      if (status && !ENUMS.ORDER_STATUSES.includes(status as any)) {
        return res.status(StatusCodes.BAD_REQUEST).json({
          success: false,
          message: "Invalid status value",
        });
      }

      // Validate sourcePlatform if provided
      if (sourcePlatform && !ENUMS.SOURCE_PLATFORMS.includes(sourcePlatform as any)) {
        return res.status(StatusCodes.BAD_REQUEST).json({
          success: false,
          message: "Invalid sourcePlatform value",
        });
      }

      // Validate paymentStatus if provided
      if (paymentStatus && !ENUMS.PAYMENT_STATUSES.includes(paymentStatus as any)) {
        return res.status(StatusCodes.BAD_REQUEST).json({
          success: false,
          message: "Invalid paymentStatus value",
        });
      }

      const filters = {
        status: status as OrderStatus,
        sourcePlatform: sourcePlatform as SourcePlatform,
        paymentStatus: paymentStatus as PaymentStatus,
        customerId: customerId as string,
        startDate: startDate ? new Date(startDate as string) : undefined,
        endDate: endDate ? new Date(endDate as string) : undefined,
        page: parseInt(page as string),
        limit: parseInt(limit as string),
        sortBy: sortBy as string,
        sortOrder: sortOrder as "asc" | "desc",
      };

      const result = await orderService.getAllOrders(filters);

      return res.status(StatusCodes.OK).json({
        success: true,
        message: "Orders retrieved successfully",
        data: result.orders,
        pagination: result.pagination,
      });
    } catch (error: any) {
      console.error("Error fetching orders:", error);
      return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: error.message || "Error fetching orders",
      });
    }
  },

  // Get order by ID
  getOrderById: async (req: Request, res: Response) => {
    try {
      const { id } = req.params;

      if (!id) {
        return res.status(StatusCodes.BAD_REQUEST).json({
          success: false,
          message: "Order ID is required",
        });
      }

      const order = await orderService.getOrderById(id);

      return res.status(StatusCodes.OK).json({
        success: true,
        message: "Order retrieved successfully",
        data: order,
      });
    } catch (error: any) {
      console.error("Error fetching order:", error);

      if (error.message === "Order not found") {
        return res.status(StatusCodes.NOT_FOUND).json({
          success: false,
          message: "Order not found",
        });
      }

      return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: error.message || "Error fetching order",
      });
    }
  },

  // Get order by custom orderId
  getOrderByOrderId: async (req: Request, res: Response) => {
    try {
      const { orderId } = req.params;

      if (!orderId) {
        return res.status(StatusCodes.BAD_REQUEST).json({
          success: false,
          message: "Order ID is required",
        });
      }

      const order = await orderService.getOrderByOrderId(orderId);

      return res.status(StatusCodes.OK).json({
        success: true,
        message: "Order retrieved successfully",
        data: order,
      });
    } catch (error: any) {
      console.error("Error fetching order by orderId:", error);

      if (error.message === "Order not found") {
        return res.status(StatusCodes.NOT_FOUND).json({
          success: false,
          message: "Order not found",
        });
      }

      return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: error.message || "Error fetching order",
      });
    }
  },

  // Update order by ID
  updateOrderById: async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const updateData = req.body;

      if (!id) {
        return res.status(StatusCodes.BAD_REQUEST).json({
          success: false,
          message: "Order ID is required",
        });
      }

      const updatedOrder = await orderService.updateOrderById(id, updateData);

      return res.status(StatusCodes.OK).json({
        success: true,
        message: "Order updated successfully",
        data: updatedOrder,
      });
    } catch (error: any) {
      console.error("Error updating order:", error);

      if (error.message === "Order not found") {
        return res.status(StatusCodes.NOT_FOUND).json({
          success: false,
          message: "Order not found",
        });
      }

      return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: error.message || "Error updating order",
      });
    }
  },

  // Update order status
  updateOrderStatus: async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { status, updatedBy } = req.body;

      if (!id) {
        return res.status(StatusCodes.BAD_REQUEST).json({
          success: false,
          message: "Order ID is required",
        });
      }

      if (!status) {
        return res.status(StatusCodes.BAD_REQUEST).json({
          success: false,
          message: "Status is required",
        });
      }

      // Validate status
      if (!ENUMS.ORDER_STATUSES.includes(status as any)) {
        return res.status(StatusCodes.BAD_REQUEST).json({
          success: false,
          message: "Invalid status value",
        });
      }

      const updatedOrder = await orderService.updateOrderStatus(id, status, updatedBy);

      return res.status(StatusCodes.OK).json({
        success: true,
        message: "Order status updated successfully",
        data: updatedOrder,
      });
    } catch (error: any) {
      console.error("Error updating order status:", error);

      if (error.message === "Order not found") {
        return res.status(StatusCodes.NOT_FOUND).json({
          success: false,
          message: "Order not found",
        });
      }

      return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: error.message || "Error updating order status",
      });
    }
  },

  // Delete order by ID
  deleteOrderById: async (req: Request, res: Response) => {
    try {
      const { id } = req.params;

      if (!id) {
        return res.status(StatusCodes.BAD_REQUEST).json({
          success: false,
          message: "Order ID is required",
        });
      }

      await orderService.deleteOrderById(id);

      return res.status(StatusCodes.OK).json({
        success: true,
        message: "Order deleted successfully",
      });
    } catch (error: any) {
      console.error("Error deleting order:", error);

      if (error.message === "Order not found") {
        return res.status(StatusCodes.NOT_FOUND).json({
          success: false,
          message: "Order not found",
        });
      }

      return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: error.message || "Error deleting order",
      });
    }
  },

  // Get orders by customer ID
  getOrdersByCustomerId: async (req: Request, res: Response) => {
    try {
      const { customerId } = req.params;
      const { page = 1, limit = 10 } = req.query;

      if (!customerId) {
        return res.status(StatusCodes.BAD_REQUEST).json({
          success: false,
          message: "Customer ID is required",
        });
      }

      const result = await orderService.getOrdersByCustomerId(
        customerId,
        parseInt(page as string),
        parseInt(limit as string)
      );

      return res.status(StatusCodes.OK).json({
        success: true,
        message: "Customer orders retrieved successfully",
        data: result.orders,
        pagination: result.pagination,
      });
    } catch (error: any) {
      console.error("Error fetching customer orders:", error);
      return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: error.message || "Error fetching customer orders",
      });
    }
  },

  // Get orders by status
  getOrdersByStatus: async (req: Request, res: Response) => {
    try {
      const { status } = req.params;
      const { page = 1, limit = 10 } = req.query;

      if (!status) {
        return res.status(StatusCodes.BAD_REQUEST).json({
          success: false,
          message: "Status is required",
        });
      }

      // Validate status
      if (!ENUMS.ORDER_STATUSES.includes(status as any)) {
        return res.status(StatusCodes.BAD_REQUEST).json({
          success: false,
          message: "Invalid status value",
        });
      }

      const result = await orderService.getOrdersByStatus(
        status as OrderStatus,
        parseInt(page as string),
        parseInt(limit as string)
      );

      return res.status(StatusCodes.OK).json({
        success: true,
        message: "Orders retrieved successfully",
        data: result.orders,
        pagination: result.pagination,
      });
    } catch (error: any) {
      console.error("Error fetching orders by status:", error);
      return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: error.message || "Error fetching orders by status",
      });
    }
  },

  // Get orders by platform
  getOrdersByPlatform: async (req: Request, res: Response) => {
    try {
      const { platform } = req.params;
      const { page = 1, limit = 10 } = req.query;

      if (!platform) {
        return res.status(StatusCodes.BAD_REQUEST).json({
          success: false,
          message: "Platform is required",
        });
      }

      // Validate platform
      if (!ENUMS.SOURCE_PLATFORMS.includes(platform as any)) {
        return res.status(StatusCodes.BAD_REQUEST).json({
          success: false,
          message: "Invalid platform value",
        });
      }

      const result = await orderService.getOrdersByPlatform(
        platform as SourcePlatform,
        parseInt(page as string),
        parseInt(limit as string)
      );

      return res.status(StatusCodes.OK).json({
        success: true,
        message: "Orders retrieved successfully",
        data: result.orders,
        pagination: result.pagination,
      });
    } catch (error: any) {
      console.error("Error fetching orders by platform:", error);
      return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: error.message || "Error fetching orders by platform",
      });
    }
  },

  // Search orders
  searchOrders: async (req: Request, res: Response) => {
    try {
      const { q, page = 1, limit = 10 } = req.query;

      if (!q) {
        return res.status(StatusCodes.BAD_REQUEST).json({
          success: false,
          message: "Search term is required",
        });
      }

      const result = await orderService.searchOrders(q as string, parseInt(page as string), parseInt(limit as string));

      return res.status(StatusCodes.OK).json({
        success: true,
        message: "Orders search completed successfully",
        data: result.orders,
        pagination: result.pagination,
      });
    } catch (error: any) {
      console.error("Error searching orders:", error);
      return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: error.message || "Error searching orders",
      });
    }
  },

  // Get order statistics
  getOrderStatistics: async (req: Request, res: Response) => {
    try {
      const { startDate, endDate, sourcePlatform } = req.query;

      // Validate sourcePlatform if provided
      if (sourcePlatform && !ENUMS.SOURCE_PLATFORMS.includes(sourcePlatform as any)) {
        return res.status(StatusCodes.BAD_REQUEST).json({
          success: false,
          message: "Invalid sourcePlatform value",
        });
      }

      const filters = {
        startDate: startDate ? new Date(startDate as string) : undefined,
        endDate: endDate ? new Date(endDate as string) : undefined,
        sourcePlatform: sourcePlatform as any,
      };

      const statistics = await orderService.getOrderStatistics(filters);

      return res.status(StatusCodes.OK).json({
        success: true,
        message: "Order statistics retrieved successfully",
        data: statistics,
      });
    } catch (error: any) {
      console.error("Error fetching order statistics:", error);
      return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: error.message || "Error fetching order statistics",
      });
    }
  },

  // Create refund order
  createRefundOrder: async (req: Request, res: Response) => {
    try {
      const { originalOrderId } = req.params;
      const { reason, refundAmount, itemsToRefund, createdBy } = req.body;

      if (!originalOrderId) {
        return res.status(StatusCodes.BAD_REQUEST).json({
          success: false,
          message: "Original order ID is required",
        });
      }

      if (!reason || !refundAmount) {
        return res.status(StatusCodes.BAD_REQUEST).json({
          success: false,
          message: "Reason and refund amount are required",
        });
      }

      const refundOrder = await orderService.createRefundOrder(originalOrderId, {
        reason,
        refundAmount,
        itemsToRefund,
        createdBy,
      });

      return res.status(StatusCodes.CREATED).json({
        success: true,
        message: "Refund order created successfully",
        data: refundOrder,
      });
    } catch (error: any) {
      console.error("Error creating refund order:", error);

      if (error.message === "Original order not found") {
        return res.status(StatusCodes.NOT_FOUND).json({
          success: false,
          message: "Original order not found",
        });
      }

      return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: error.message || "Error creating refund order",
      });
    }
  },

  // Create replacement order
  createReplacementOrder: async (req: Request, res: Response) => {
    try {
      const { originalOrderId } = req.params;
      const { reason, items, createdBy } = req.body;

      if (!originalOrderId) {
        return res.status(StatusCodes.BAD_REQUEST).json({
          success: false,
          message: "Original order ID is required",
        });
      }

      if (!reason || !items || !Array.isArray(items) || items.length === 0) {
        return res.status(StatusCodes.BAD_REQUEST).json({
          success: false,
          message: "Reason and items array are required",
        });
      }

      const replacementOrder = await orderService.createReplacementOrder(originalOrderId, {
        reason,
        items,
        createdBy,
      });

      return res.status(StatusCodes.CREATED).json({
        success: true,
        message: "Replacement order created successfully",
        data: replacementOrder,
      });
    } catch (error: any) {
      console.error("Error creating replacement order:", error);

      if (error.message === "Original order not found") {
        return res.status(StatusCodes.NOT_FOUND).json({
          success: false,
          message: "Original order not found",
        });
      }

      return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: error.message || "Error creating replacement order",
      });
    }
  },
};
