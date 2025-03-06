import { Router } from "express";
import { returnPolicyController } from "@/controllers";

export const returnPolicy = (router: Router) => {
  router.post("/", returnPolicyController.createReturnPolicy);

  router.get("/", returnPolicyController.getAllReturnPolicies);

  router.get("/:id", returnPolicyController.getSpecificPolicy);

  router.patch("/:id", returnPolicyController.editPolicy);

  router.delete("/:id", returnPolicyController.deletePolicy);

  router.patch("/block/:id", returnPolicyController.toggleBlock);
};
