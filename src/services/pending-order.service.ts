import { PendingOrder } from "@/models/pending-order.model";
import {
  IPendingOrder,
  CreatePendingOrderPayload,
  UpdatePendingOrderPayload,
} from "@/contracts/pending-order.contract";
import { Types } from "mongoose";

export const pendingOrderService = {
  /**
   * Create a new pending order
   */
  createPendingOrder: async (payload: CreatePendingOrderPayload): Promise<IPendingOrder> => {
    const expirationMinutes = payload.expirationMinutes || 60; // Default 1 hour
    const expiresAt = new Date(Date.now() + expirationMinutes * 60 * 1000);

    const pendingOrder = new PendingOrder({
      ...payload,
      expiresAt,
    });

    return await pendingOrder.save();
  },

  /**
   * Find pending order by payment intent ID
   */
  findByPaymentIntentId: async (paymentIntentId: string): Promise<IPendingOrder | null> => {
    return await PendingOrder.findByPaymentIntentId(paymentIntentId);
  },

  /**
   * Find pending order by order ID
   */
  findByOrderId: async (orderId: string): Promise<IPendingOrder | null> => {
    return await PendingOrder.findOne({ orderId });
  },

  /**
   * Find pending orders by customer ID
   */
  findByCustomerId: async (customerId: string): Promise<IPendingOrder[]> => {
    return await PendingOrder.findByCustomerId(customerId);
  },

  /**
   * Find pending orders by Stripe customer ID
   */
  findByStripeCustomerId: async (stripeCustomerId: string): Promise<IPendingOrder[]> => {
    return await PendingOrder.find({ stripeCustomerId }).sort({ createdAt: -1 });
  },

  /**
   * Update pending order
   */
  updatePendingOrder: async (
    paymentIntentId: string,
    updates: UpdatePendingOrderPayload
  ): Promise<IPendingOrder | null> => {
    return await PendingOrder.findOneAndUpdate(
      { paymentIntentId },
      { $set: updates },
      { new: true, runValidators: true }
    );
  },

  /**
   * Mark order as completed
   */
  markAsCompleted: async (paymentIntentId: string): Promise<IPendingOrder | null> => {
    const pendingOrder = await PendingOrder.findByPaymentIntentId(paymentIntentId);
    if (!pendingOrder) return null;

    return await pendingOrder.markAsCompleted();
  },

  /**
   * Mark order as failed
   */
  markAsFailed: async (paymentIntentId: string): Promise<IPendingOrder | null> => {
    const pendingOrder = await PendingOrder.findByPaymentIntentId(paymentIntentId);
    if (!pendingOrder) return null;

    return await pendingOrder.markAsFailed();
  },

  /**
   * Mark order as cancelled
   */
  markAsCancelled: async (paymentIntentId: string): Promise<IPendingOrder | null> => {
    const pendingOrder = await PendingOrder.findByPaymentIntentId(paymentIntentId);
    if (!pendingOrder) return null;

    return await pendingOrder.markAsCancelled();
  },

  /**
   * Update payment status
   */
  updatePaymentStatus: async (
    paymentIntentId: string,
    paymentStatus: IPendingOrder["paymentStatus"]
  ): Promise<IPendingOrder | null> => {
    const pendingOrder = await PendingOrder.findByPaymentIntentId(paymentIntentId);
    if (!pendingOrder) return null;

    return await pendingOrder.updatePaymentStatus(paymentStatus);
  },

  /**
   * Extend order expiration
   */
  extendExpiration: async (paymentIntentId: string, minutes: number = 60): Promise<IPendingOrder | null> => {
    const pendingOrder = await PendingOrder.findByPaymentIntentId(paymentIntentId);
    if (!pendingOrder) return null;

    return await pendingOrder.extendExpiration(minutes);
  },

  /**
   * Get all pending orders
   */
  getAllPending: async (): Promise<IPendingOrder[]> => {
    return await PendingOrder.findPendingOrders();
  },

  /**
   * Get expired orders for cleanup
   */
  getExpiredOrders: async (): Promise<IPendingOrder[]> => {
    return await PendingOrder.findExpiredOrders();
  },

  /**
   * Clean up expired orders
   */
  cleanupExpiredOrders: async (): Promise<{ deletedCount: number }> => {
    const expiredOrders = await PendingOrder.findExpiredOrders();

    // Mark as cancelled before deletion (for audit trail)
    await Promise.all(expiredOrders.map((order: any) => order.markAsCancelled()));

    // Delete expired orders older than 24 hours
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const result = await PendingOrder.deleteMany({
      expiresAt: { $lt: oneDayAgo },
      status: "cancelled",
    });

    return { deletedCount: result.deletedCount || 0 };
  },

  /**
   * Get order statistics
   */
  getOrderStatistics: async (): Promise<{
    pending: number;
    processing: number;
    completed: number;
    failed: number;
    cancelled: number;
    total: number;
  }> => {
    const stats = await PendingOrder.aggregate([
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 },
        },
      },
    ]);

    const result = {
      pending: 0,
      processing: 0,
      completed: 0,
      failed: 0,
      cancelled: 0,
      total: 0,
    };

    stats.forEach((stat) => {
      result[stat._id as keyof typeof result] = stat.count;
      result.total += stat.count;
    });

    return result;
  },

  /**
   * Delete pending order by payment intent ID
   */
  deletePendingOrder: async (paymentIntentId: string): Promise<boolean> => {
    const result = await PendingOrder.deleteOne({ paymentIntentId });
    return result.deletedCount > 0;
  },

  /**
   * Get recent orders with pagination
   */
  getRecentOrders: async (
    page: number = 1,
    limit: number = 20,
    status?: string
  ): Promise<{
    orders: IPendingOrder[];
    total: number;
    page: number;
    totalPages: number;
  }> => {
    const skip = (page - 1) * limit;
    const filter = status ? { status } : {};

    const [orders, total] = await Promise.all([
      PendingOrder.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
      PendingOrder.countDocuments(filter),
    ]);

    return {
      orders,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  },
};
