import { Router } from "express";
import { MultiInstanceGmailController } from "@/controllers/multi-instance-gmail.controller";
import { authGuard } from "@/guards/auth.guard";

export const multiInstanceGmail = (router: Router) => {
  // Multi-instance Gmail management routes (protected)
  router.get("/current", authGuard.isAuth, MultiInstanceGmailController.getCurrentInstance);
  router.get("/instances", authGuard.isAuth, MultiInstanceGmailController.getAllInstances);
  router.get("/stats", authGuard.isAuth, MultiInstanceGmailController.getAllInstanceStats);
  router.get("/stats/:instanceId", authGuard.isAuth, MultiInstanceGmailController.getInstanceStats);
  router.post("/test/:instanceId", authGuard.isAuth, MultiInstanceGmailController.testInstanceWebhook);
  router.put("/webhook/:instanceId", authGuard.isAuth, MultiInstanceGmailController.updateInstanceWebhookUrl);
  router.post("/setup", authGuard.isAuth, MultiInstanceGmailController.setupAllInstances);
  router.get("/health", authGuard.isAuth, MultiInstanceGmailController.healthCheck);
};
