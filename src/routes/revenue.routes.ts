import { Router } from "express";
import { RevenueController } from "@/controllers/revenue.controller";

export const revenue = (router: Router) => {
  router.post("/", RevenueController.createRevenue);

  router.patch("/:id", RevenueController.updateRevenue);

  router.delete("/:id", RevenueController.deleteRevenue);

  router.get("/", RevenueController.getAllRevenues);

  // Search revenues with pagination and filters
  router.get("/search", RevenueController.searchRevenues);

  router.get("/:id", RevenueController.getRevenueById);

 router.patch("/block/:id", RevenueController.updateRevenue); 
};
