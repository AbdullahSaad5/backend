import { Router } from "express";
import { RealTimeEmailSyncService } from "@/services/real-time-email-sync.service";
import { EmailAccountModel } from "@/models/email-account.model";
import { logger } from "@/utils/logger.util";
import { StatusCodes } from "http-status-codes";

export const outlookWebhook = (router: Router) => {
  // Outlook webhook endpoint for real-time notifications
  router.post("/:accountId", async (req, res) => {
    try {
      const { accountId } = req.params;
      const { value } = req.body;

      logger.info(`📧 [Outlook] Webhook received for account: ${accountId}`);

      if (!value || !Array.isArray(value)) {
        logger.warn(`⚠️ [Outlook] Invalid webhook payload for account: ${accountId}`);
        return res.status(StatusCodes.BAD_REQUEST).json({
          success: false,
          message: "Invalid webhook payload",
        });
      }

      // Find the account
      const account = await EmailAccountModel.findById(accountId);
      if (!account) {
        logger.error(`❌ [Outlook] Account not found: ${accountId}`);
        return res.status(StatusCodes.NOT_FOUND).json({
          success: false,
          message: "Account not found",
        });
      }

      if (!account.isActive) {
        logger.warn(`⚠️ [Outlook] Account is not active: ${account.emailAddress}`);
        return res.status(StatusCodes.OK).json({
          success: true,
          message: "Account not active, ignoring webhook",
        });
      }

      logger.info(`📧 [Outlook] Processing ${value.length} notifications for: ${account.emailAddress}`);

      // Process each notification
      for (const notification of value) {
        try {
          if (notification.changeType === "created" && notification.resource) {
            // New email received
            logger.info(`📧 [Outlook] New email notification for: ${account.emailAddress}`);
            
            // Trigger immediate sync for this account
            await RealTimeEmailSyncService.syncOutlookEmails(account);
            
          } else if (notification.changeType === "updated" && notification.resource) {
            // Email updated (read status, etc.)
            logger.info(`📧 [Outlook] Email update notification for: ${account.emailAddress}`);
            
            // For updates, we might want to sync specific email or just do a quick sync
            await RealTimeEmailSyncService.syncOutlookEmails(account);
          }
        } catch (notificationError: any) {
          logger.error(`❌ [Outlook] Failed to process notification for ${account.emailAddress}:`, notificationError);
        }
      }

      logger.info(`✅ [Outlook] Webhook processed successfully for: ${account.emailAddress}`);

      res.status(StatusCodes.OK).json({
        success: true,
        message: "Webhook processed successfully",
        notificationsProcessed: value.length,
      });

    } catch (error: any) {
      logger.error("❌ [Outlook] Webhook processing failed:", error);
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: "Webhook processing failed",
        error: error.message,
      });
    }
  });

  // Health check endpoint for Outlook webhook
  router.get("/health", (req, res) => {
    res.status(StatusCodes.OK).json({
      success: true,
      message: "Outlook webhook endpoint is healthy",
      timestamp: new Date().toISOString(),
    });
  });
};
