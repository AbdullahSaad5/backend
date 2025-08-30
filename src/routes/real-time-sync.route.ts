import { Router } from "express";
import { RealTimeSyncController } from "@/controllers/real-time-sync.controller";
import { authGuard } from "@/guards";

export const realTimeSync = (router: Router) => {
  // Apply authentication to all real-time sync routes
  router.use(authGuard.isAuth);

  // Account-specific real-time sync setup
  router.post("/setup/:accountId", RealTimeSyncController.setupAccountSync);

  // Setup real-time sync for all accounts
  router.post("/setup-all", RealTimeSyncController.setupAllAccountsSync);

  // Check which accounts are missing webhooks
  router.get("/check-missing-webhooks", RealTimeSyncController.checkMissingWebhooks);

  // Setup missing webhooks for all accounts
  router.post("/setup-missing-webhooks", RealTimeSyncController.setupMissingWebhooks);

  // Get sync status for all accounts
  router.get("/status", RealTimeSyncController.getSyncStatus);

  // Renew all subscriptions
  router.post("/renew-subscriptions", RealTimeSyncController.renewAllSubscriptions);

  // Manual sync for specific account
  router.post("/manual-sync/:accountId", RealTimeSyncController.manualSyncAccount);

  // Cron job management
  router.get("/cron/status", RealTimeSyncController.getCronStatus);
  router.post("/cron/start", RealTimeSyncController.startCronJobs);
  router.post("/cron/stop", RealTimeSyncController.stopCronJobs);

  // Gmail topic management
  router.get("/gmail/:accountId/topic", RealTimeSyncController.getGmailTopicInfo);
  router.delete("/gmail/:accountId/topic", RealTimeSyncController.cleanupGmailTopic);
};
