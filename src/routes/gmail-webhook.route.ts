import { Router } from "express";
import { GmailWebhookController } from "@/controllers/gmail-webhook.controller";

export const gmailWebhook = (router: Router) => {
  // Gmail webhook endpoint for real-time push notifications (no auth required)
  router.post("/", GmailWebhookController.handleGmailNotification);

  // Health check endpoint
  router.get("/health", GmailWebhookController.healthCheck);

  // Test endpoint for manual notification processing (protected)
  router.post("/test", GmailWebhookController.testNotification);
};
