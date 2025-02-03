// /routes/variation.routes.ts
import { Router } from "express";
import { variationController } from "@/controllers/variation.controller";

export const variations = (router: Router) => {
  router.post("/", variationController.createVariation);

  router.get("/:productId", variationController.getVariationsByProduct);

  router.patch("/:variationId/:platform", variationController.updateVariation);

  router.delete("/:variationId/:platform", variationController.deleteVariation);

  router.get("/parts/:platform", variationController.getPartsByPlatform);

  router.get("/", variationController.getAllVariationsByPlatform);

  router.get("/unified-parts", variationController.getUnifiedParts);
};
