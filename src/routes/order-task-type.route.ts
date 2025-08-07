import { orderTaskTypeController } from "@/controllers/order-task-type.controller";
import { Router } from "express";

export const orderTaskType = (router: Router) => {
  // POST - Create new order task type
  router.post("/", orderTaskTypeController.createOrderTaskType);

  // GET - Get all order task types
  router.get("/", orderTaskTypeController.getAllOrderTaskTypes);

  // GET - Get order task type by ID
  router.get("/:id", orderTaskTypeController.getOrderTaskTypeById);

  // GET - Get order task type by taskTypeId
  router.get("/task-type/:taskTypeId", orderTaskTypeController.getOrderTaskTypeByTaskTypeId);

  // PUT - Update order task type
  router.put("/:id", orderTaskTypeController.updateOrderTaskType);

  // DELETE - Delete order task type
  router.delete("/:id", orderTaskTypeController.deleteOrderTaskType);

  // GET - Get order task types by category
  router.get("/category/:categoryId", orderTaskTypeController.getOrderTaskTypesByCategory);

  // GET - Get order task types by condition
  router.get("/condition/:condition", orderTaskTypeController.getOrderTaskTypesByCondition);

  // GET - Get order level task types
  router.get("/order-level/all", orderTaskTypeController.getOrderLevelTaskTypes);
};
