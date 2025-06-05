import { Router } from "express";
import { RevenueController } from "@/controllers/revenue.controller";

export const revenue = (router: Router) => {
  router.post("/", RevenueController.createRevenue);

  router.patch("/:id", RevenueController.updateRevenue);

  router.delete("/:id", RevenueController.deleteRevenue);

  router.get("/", RevenueController.getAllRevenues);

  router.get("/:id", RevenueController.getRevenueById);

  router.patch("/block/:id",RevenueController.updateRevenue);
};
