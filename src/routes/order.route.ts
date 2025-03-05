import { orderController } from "@/controllers"; // Assuming you have an order controller
import { orderValidation } from "@/validations/order.validation"; // Importing the validation
import { authGuard } from "@/guards"; // Assuming you have an authentication guard
import { Router } from "express";

export const orderRoutes = (router: Router) => {
  // Uncomment this line if authentication is required for all routes
  // router.use(authGuard.isAuth);

  // Route to create a new order with validation
  router.post("/", orderValidation.createOrder, orderController.addOrder);

  // Route to get all orders (authentication might be required, add validation if needed)
  router.get("/", orderController.getAllOrders);

  // Route to get a specific order by ID with validation
  router.get(
    "/:id",
    orderValidation.validateOrderId,
    orderController.getOrderById
  );

  // Route to update an order by ID with validation
  router.patch(
    "/:id",
    orderValidation.validateOrderId,
    orderValidation.updateOrder,
    orderController.updateOrderById
  );

  // Route to delete an order by ID with validation
  router.delete(
    "/:id",
    orderValidation.validateOrderId,
    orderController.deleteOrderById
  );
};
