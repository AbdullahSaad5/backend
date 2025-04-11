// /routes/variation.routes.ts
import { Router } from "express";
import { variationController } from "@/controllers/variation.controller";

export const variations = (router: Router) => {
  router.get("/:id", variationController.getVariationsByInventoryId);

  // Search, filter, and paginate variations
  router.get("/", variationController.searchAndFilterVariations);
};
