import { Router } from "express";
import { paymentPolicyController } from "@/controllers";

export const paymentPolicy = (router: Router) => {
  router.post("/", paymentPolicyController.createPaymentPolicy);

  router.get("/", paymentPolicyController.getAllPaymentPolicies);

  router.get("/:id", paymentPolicyController.getSpecificPolicy);

  router.patch("/:id", paymentPolicyController.editPolicy);

  router.delete("/:id", paymentPolicyController.deletePolicy);
};
