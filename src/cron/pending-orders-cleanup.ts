import { pendingOrderService } from "@/services/pending-order.service";

/**
 * Cron job to clean up expired pending orders
 * This should be run periodically (e.g., every hour)
 */
export const cleanupExpiredPendingOrders = async (): Promise<void> => {
  try {
    console.log("Starting cleanup of expired pending orders...");

    const result = await pendingOrderService.cleanupExpiredOrders();

    console.log(`Cleanup completed. Deleted ${result.deletedCount} expired orders.`);
  } catch (error) {
    console.error("Error during pending orders cleanup:", error);
    throw error;
  }
};

/**
 * Get statistics about pending orders for monitoring
 */
export const getPendingOrdersStats = async (): Promise<void> => {
  try {
    const stats = await pendingOrderService.getOrderStatistics();
    const expiredOrders = await pendingOrderService.getExpiredOrders();

    console.log("Pending Orders Statistics:", {
      ...stats,
      expiredCount: expiredOrders.length,
    });
  } catch (error) {
    console.error("Error getting pending orders statistics:", error);
  }
};
