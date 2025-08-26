import { Router } from "express"; // Express Router for routing
import { dealsController } from "@/controllers/deals.controller";
export const deals = (router: Router) => {
  router.get("/active", dealsController.getActiveDeals);
  router.post("/", dealsController.addDeals); // Create or update deals
  router.get("/", dealsController.getDeals); // Get all deals
  router.get("/:id", dealsController.getDealById); // Get deals by id
  router.delete("/:id", dealsController.deleteDeal);
  router.patch("/:id", dealsController.updateDeals);
};
