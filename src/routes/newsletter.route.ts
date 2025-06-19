// src/routes/newsletter.route.ts
import { Router } from "express";
import { NewsletterController } from "@/controllers/newsletter.controller";

export const newsletter = (router: Router) => {
  router.post("/subscriptions", NewsletterController.subscribe);
  router.get("/subscriptions", NewsletterController.getAllSubscriptions);
  router.get("/subscriptions/:id", NewsletterController.getSubscription);
  router.patch("/subscriptions/:id", NewsletterController.updateSubscription);
  router.patch("/block/:id", NewsletterController.updateSubscription);
  router.delete("/subscriptions/:id", NewsletterController.unsubscribe);
};