import { stockController } from "@/controllers"; // Assuming you have a stock controller
import { authGuard } from "@/guards";
import { Router } from "express";
import { auth } from "firebase-admin";

export const stock = (router: Router) => {
  // router.use(authGuard.isAuth);
  // Route to create a new stock
  router.get("/products-with-stocks", stockController.getProductsWithStock);
  router.post("/", stockController.addStock); // Add stock purchase
  router.get("/:productId", stockController.getStockByProduct); // Get stock purchase history
  router.get("/summary/:productId", stockController.getStockSummary); // Get stock summary
  router.delete("/:stockId", stockController.deleteStock);
  router.patch("/:stockId", stockController.updateStock);
  router.patch("/bulk-update-cost", stockController.bulkUpdateStockCost);
};
