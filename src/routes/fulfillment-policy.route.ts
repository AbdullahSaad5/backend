import { Router } from "express";
import { fulfillmentPolicyController } from "@/controllers";

export const fulfillmentPolicy = (router: Router) => {
  router.post("/", fulfillmentPolicyController.createFulfillmentPolicy);

  router.get("/rate-tables", fulfillmentPolicyController.getRateTables);

  router.get("/", fulfillmentPolicyController.getAllFulfillmentPolicies);

  router.get("/:id", fulfillmentPolicyController.getSpecificPolicy);

  router.patch("/:id", fulfillmentPolicyController.editPolicy);

  router.delete("/:id", fulfillmentPolicyController.deletePolicy);

  router.patch("/block/:id", fulfillmentPolicyController.toggleBlock);
};
