import { Router } from "express";
import { RealTimeEmailSyncService } from "@/services/real-time-email-sync.service";
import { EmailAccountModel } from "@/models/email-account.model";
import { logger } from "@/utils/logger.util";
import { StatusCodes } from "http-status-codes";

export const outlookWebhook = (router: Router) => {
  // Logging middleware for all webhook requests
  router.use((req, res, next) => {
    logger.info(`🔍 [Outlook] Webhook request received: ${req.method} ${req.url}`, {
      method: req.method,
      url: req.url,
      path: req.path,
      params: req.params,
      query: req.query,
      headers: req.headers,
      ip: req.ip || req.connection.remoteAddress,
      userAgent: req.get("User-Agent"),
      timestamp: new Date().toISOString(),
    });
    next();
  });

  // Base route for webhook validation (when Microsoft sends validation to root URL)
  router.get("/", async (req, res) => {
    try {
      const { validationToken } = req.query;

      logger.info(`🔍 [Outlook] Base validation request received`, {
        method: req.method,
        url: req.url,
        headers: req.headers,
        query: req.query,
        ip: req.ip || req.connection.remoteAddress,
        userAgent: req.get("User-Agent"),
      });

      if (validationToken) {
        // Microsoft is validating the webhook endpoint
        logger.info(`✅ [Outlook] Base route: Responding to validation request with token: ${validationToken}`);

        // Set proper headers for validation response
        res.setHeader("Content-Type", "text/plain");
        res.setHeader("Cache-Control", "no-cache");

        // Send the validation token exactly as received
        return res.status(StatusCodes.OK).send(validationToken);
      }

      // Regular GET request to base URL
      logger.info(`📧 [Outlook] Base route GET request received`);
      res.status(StatusCodes.OK).json({
        success: true,
        message: "Outlook webhook base endpoint is accessible",
        timestamp: new Date().toISOString(),
        note: "This endpoint handles validation requests from Microsoft Graph",
      });
    } catch (error: any) {
      logger.error("❌ [Outlook] Base validation endpoint failed:", error);
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: "Base validation failed",
        error: error.message,
      });
    }
  });

  // Microsoft Graph webhook validation endpoint (required for subscription creation)
  router.get("/:accountId", async (req, res) => {
    try {
      const { accountId } = req.params;
      const { validationToken } = req.query;

      logger.info(`🔍 [Outlook] Account-specific request received for account: ${accountId}`, {
        method: req.method,
        url: req.url,
        path: req.path,
        params: req.params,
        query: req.query,
        headers: req.headers,
        ip: req.ip || req.connection.remoteAddress,
        userAgent: req.get("User-Agent"),
        timestamp: new Date().toISOString(),
      });

      if (validationToken) {
        // Microsoft is validating the webhook endpoint
        logger.info(`✅ [Outlook] Account-specific validation response with token: ${validationToken}`);

        // Set proper headers for validation response
        res.setHeader("Content-Type", "text/plain");
        res.setHeader("Cache-Control", "no-cache");

        // Send the validation token exactly as received
        return res.status(StatusCodes.OK).send(validationToken);
      }

      // Regular GET request (not validation)
      logger.info(`📧 [Outlook] Account-specific GET request received for account: ${accountId}`);
      res.status(StatusCodes.OK).json({
        success: true,
        message: "Outlook webhook endpoint is accessible",
        accountId,
        timestamp: new Date().toISOString(),
      });
    } catch (error: any) {
      logger.error("❌ [Outlook] Account-specific endpoint failed:", error);
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: "Account-specific endpoint failed",
        error: error.message,
      });
    }
  });

  // Outlook webhook endpoint for real-time notifications
  router.post("/:accountId", async (req, res) => {
    try {
      const { accountId } = req.params;
      const { value } = req.body;

      logger.info(`📧 [Outlook] Webhook received for account: ${accountId}`, {
        method: req.method,
        url: req.url,
        headers: req.headers,
        body: req.body,
        ip: req.ip || req.connection.remoteAddress,
        userAgent: req.get("User-Agent"),
      });

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

  // Test endpoint for webhook validation
  router.get("/test-account", (req, res) => {
    const { validationToken } = req.query;

    logger.info(`🧪 [Outlook] Test endpoint called with validationToken: ${validationToken}`);

    if (validationToken) {
      // Simulate Microsoft's validation request
      logger.info(`✅ [Outlook] Test validation response with token: ${validationToken}`);
      res.setHeader("Content-Type", "text/plain");
      res.setHeader("Cache-Control", "no-cache");
      return res.status(StatusCodes.OK).send(validationToken);
    }

    res.status(StatusCodes.OK).json({
      success: true,
      message: "Outlook webhook test endpoint is working",
      timestamp: new Date().toISOString(),
      note: "Add ?validationToken=your_token to test validation response",
    });
  });

  // Catch-all route for any other webhook requests
  router.all("*", (req, res) => {
    logger.warn(`⚠️ [Outlook] Unhandled webhook request: ${req.method} ${req.url}`, {
      method: req.method,
      url: req.url,
      headers: req.headers,
      body: req.body,
      ip: req.ip || req.connection.remoteAddress,
      userAgent: req.get("User-Agent"),
    });

    res.status(StatusCodes.NOT_FOUND).json({
      success: false,
      message: "Webhook endpoint not found",
      method: req.method,
      url: req.url,
    });
  });
};
