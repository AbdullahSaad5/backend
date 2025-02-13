import { stockController } from "@/controllers"; // Assuming you have a stock controller
import { authGuard } from "@/guards";
import { Router } from "express";
import { auth } from "firebase-admin";

export const stock = (router: Router) => {
  // router.use(authGuard.isAuth);
  // Route to create a new stock
  router.post("/", stockController.createOrUpdateStock); // Add or update stock
  router.get("/", stockController.getAllStock); // Get all stock
  router.get("/:productId", stockController.getStockByProduct); // Get stock for a specific product
  router.delete("/:productId", stockController.deleteStock);
};
