import { stockController } from "@/controllers"; // Assuming you have a stock controller
import { authGuard } from "@/guards";
import { Router } from "express";
import { auth } from "firebase-admin";

export const stock = (router: Router) => {
  // router.use(authGuard.isAuth);
  // Route to create a new stock
  router.post("/", stockController.addStock); // Add stock purchase
  router.get("/get/:inventoryId", stockController.getStockByInventoryId); // Get stock purchase history
  router.get("/inventory-with-stocks", stockController.getInventoryWithStock); //get all those inventory items whose stock is added
  router.get("/inventory-with-stocks-and-draft-stocks", stockController.getInventoryWithStockWithDraft); //get all those inventory items whose stock is added
  router.get("/:stockId", stockController.getStockByStockId); // get stock using stockId
  router.get("/summary/:inventoryId", stockController.getStockSummary); // Get stock summary
  router.delete("/delete/:stockId", stockController.deleteStock);
  router.patch("/update/:stockId", stockController.updateStock);
  router.patch("/bulk-update-cost", stockController.bulkUpdateStockCost);
};
