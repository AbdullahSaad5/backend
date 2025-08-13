import { Router } from "express";
import { GmailWebhookController } from "@/controllers/gmail-webhook.controller";

export const gmailWebhook = (router: Router) => {
  // Gmail webhook endpoint for real-time push notifications (no auth required)
  router.post("/gmail/webhook", GmailWebhookController.handleGmailNotification);
  
  // Health check endpoint
  router.get("/gmail/webhook/health", GmailWebhookController.healthCheck);
  
  // Test endpoint for manual notification processing (protected)
  router.post("/gmail/webhook/test", GmailWebhookController.testNotification);
};
