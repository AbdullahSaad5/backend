import { Router } from "express";
import { GmailWebhookController } from "@/controllers/gmail-webhook.controller";

export const gmailWebhook = (router: Router) => {
  // Gmail webhook endpoint for real-time push notifications (no auth required)
  router.post("/webhook", GmailWebhookController.handleGmailNotification);

  // Health check endpoint
  router.get("/webhook/health", GmailWebhookController.healthCheck);

  // Test endpoint for manual notification processing (protected)
  router.post("/webhook/test", GmailWebhookController.testNotification);

  // Test endpoint for manual Gmail sync (protected)
  router.post("/webhook/test-sync", GmailWebhookController.testGmailSync);

  // Additional webhook management endpoints
  router.get("/status", GmailWebhookController.getWebhookStatus);
  router.post("/validate", GmailWebhookController.validateWebhookSetup);
  router.get("/debug/subscription-hashes", GmailWebhookController.debugSubscriptionHashes);
  router.post("/cleanup/orphaned-subscriptions", GmailWebhookController.cleanupOrphanedSubscriptions);
};
