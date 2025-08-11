import { orderController } from "@/controllers";
import { orderValidation } from "@/validations/order.validation";
import { authGuard } from "@/guards";
import { Router } from "express";

export const orderRoutes = (router: Router) => {
  // Apply authentication guard to all order routes
  router.use(authGuard.isAuth);

  // Basic CRUD operations
  router.post("/", orderValidation.createOrder, orderController.createOrder);
  router.get("/", orderController.getAllOrders);
  router.get("/:id", orderValidation.validateOrderId, orderController.getOrderById);
  router.get("/orderId/:orderId", orderController.getOrderByOrderId);
  router.patch("/:id", orderValidation.validateOrderId, orderValidation.updateOrder, orderController.updateOrderById);
  router.delete("/:id", orderValidation.validateOrderId, orderController.deleteOrderById);

  // Order status management
  router.patch(
    "/:id/status",
    orderValidation.validateOrderId,
    orderValidation.validateOrderStatus,
    orderController.updateOrderStatus
  );

  // Customer-specific routes
  router.get("/customer/:customerId", orderController.getOrdersByCustomerId);

  // Status-based filtering
  router.get("/status/:status", orderController.getOrdersByStatus);

  // Platform-based filtering
  router.get("/platform/:platform", orderController.getOrdersByPlatform);

  // Search functionality
  router.get("/search", orderController.searchOrders);

  // Statistics
  router.get("/statistics", orderController.getOrderStatistics);

  // Refund and replacement operations
  router.post(
    "/:originalOrderId/refund",
    orderValidation.validateOrderId,
    orderValidation.validateRefundOrder,
    orderController.createRefundOrder
  );
  router.post(
    "/:originalOrderId/replacement",
    orderValidation.validateOrderId,
    orderValidation.validateReplacementOrder,
    orderController.createReplacementOrder
  );
};
