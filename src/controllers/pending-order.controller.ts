import { Router } from "express";
import { pendingOrderService } from "@/services/pending-order.service";
import { Request, Response } from "express";
import { ReasonPhrases, StatusCodes } from "http-status-codes";

export const pendingOrderController = {
  /**
   * Get pending order by payment intent ID
   */
  getByPaymentIntentId: async (req: Request, res: Response) => {
    try {
      const { paymentIntentId } = req.params;
      const pendingOrder = await pendingOrderService.findByPaymentIntentId(paymentIntentId);

      if (!pendingOrder) {
        return res.status(StatusCodes.NOT_FOUND).json({
          status: StatusCodes.NOT_FOUND,
          message: "Pending order not found",
        });
      }

      res.status(StatusCodes.OK).json({
        status: StatusCodes.OK,
        message: "Pending order retrieved successfully",
        data: pendingOrder,
      });
    } catch (error) {
      console.error("Error getting pending order:", error);
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        status: StatusCodes.INTERNAL_SERVER_ERROR,
        message: ReasonPhrases.INTERNAL_SERVER_ERROR,
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  },

  /**
   * Get pending order by order ID
   */
  getByOrderId: async (req: Request, res: Response) => {
    try {
      const { orderId } = req.params;
      const pendingOrder = await pendingOrderService.findByOrderId(orderId);

      if (!pendingOrder) {
        return res.status(StatusCodes.NOT_FOUND).json({
          status: StatusCodes.NOT_FOUND,
          message: "Order not found",
        });
      }

      res.status(StatusCodes.OK).json({
        status: StatusCodes.OK,
        message: "Order retrieved successfully",
        data: {
          orderId: pendingOrder.orderId,
          status: pendingOrder.status,
          paymentStatus: pendingOrder.paymentStatus,
          amount: pendingOrder.amount,
          currency: pendingOrder.currency,
          description: pendingOrder.description,
          createdAt: pendingOrder.createdAt,
          updatedAt: pendingOrder.updatedAt,
          expiresAt: pendingOrder.expiresAt,
        },
      });
    } catch (error) {
      console.error("Error getting order status:", error);
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        status: StatusCodes.INTERNAL_SERVER_ERROR,
        message: ReasonPhrases.INTERNAL_SERVER_ERROR,
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  },

  /**
   * Get order statistics
   */
  getStatistics: async (req: Request, res: Response) => {
    try {
      const stats = await pendingOrderService.getOrderStatistics();

      res.status(StatusCodes.OK).json({
        status: StatusCodes.OK,
        message: "Order statistics retrieved successfully",
        data: stats,
      });
    } catch (error) {
      console.error("Error getting order statistics:", error);
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        status: StatusCodes.INTERNAL_SERVER_ERROR,
        message: ReasonPhrases.INTERNAL_SERVER_ERROR,
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  },
};
