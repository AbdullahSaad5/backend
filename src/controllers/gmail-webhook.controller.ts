import { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import { RealTimeEmailSyncService } from "@/services/real-time-email-sync.service";
import { EmailAccountModel } from "@/models/email-account.model";
import { logger } from "@/utils/logger.util";
import crypto from "crypto";

export const GmailWebhookController = {
  /**
   * Handle Gmail push notifications from Google Cloud Pub/Sub
   * This endpoint receives real-time notifications when emails change in Gmail
   */
  handleGmailNotification: async (req: Request, res: Response) => {
    const requestId = crypto.randomUUID();

    try {
      logger.info(`[${requestId}] Gmail webhook notification received`, {
        headers: Object.keys(req.headers),
        bodyKeys: Object.keys(req.body),
        method: req.method,
        url: req.url,
      });

      // Gmail sends notifications via Google Cloud Pub/Sub
      // The body contains a base64-encoded message with the actual notification
      const { message } = req.body;

      if (!message) {
        logger.warn(`[${requestId}] No message in Gmail webhook payload`);
        return res.status(StatusCodes.BAD_REQUEST).json({
          success: false,
          message: "No message in webhook payload",
          requestId,
        });
      }

      // Decode the base64 message
      let decodedMessage;
      try {
        decodedMessage = JSON.parse(Buffer.from(message.data, "base64").toString());
      } catch (decodeError) {
        logger.error(`[${requestId}] Failed to decode Gmail webhook message:`, decodeError);
        return res.status(StatusCodes.BAD_REQUEST).json({
          success: false,
          message: "Failed to decode webhook message",
          requestId,
        });
      }

      logger.info(`[${requestId}] Decoded Gmail notification:`, {
        emailAddress: decodedMessage.emailAddress,
        historyId: decodedMessage.historyId,
        type: decodedMessage.type,
      });

      // Process the Gmail notification
      const result = await processGmailNotification(decodedMessage, requestId);

      if (result.success) {
        res.status(StatusCodes.OK).json({
          success: true,
          message: "Gmail notification processed successfully",
          data: result.data,
          requestId,
        });
      } else {
        res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
          success: false,
          message: "Failed to process Gmail notification",
          error: result.error,
          requestId,
        });
      }
    } catch (error: any) {
      logger.error(`[${requestId}] Error processing Gmail webhook:`, error);

      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: "Internal server error processing Gmail webhook",
        error: error.message,
        requestId,
      });
    }
  },

  /**
   * Health check endpoint for the webhook
   */
  healthCheck: async (req: Request, res: Response) => {
    res.status(StatusCodes.OK).json({
      success: true,
      message: "Gmail webhook is healthy",
      timestamp: new Date().toISOString(),
    });
  },

  /**
   * Test endpoint for manual notification processing (protected)
   */
  testNotification: async (req: Request, res: Response) => {
    try {
      const { emailAddress, historyId } = req.body;

      if (!emailAddress || !historyId) {
        return res.status(StatusCodes.BAD_REQUEST).json({
          success: false,
          message: "emailAddress and historyId are required",
        });
      }

      const result = await processGmailNotification({ emailAddress, historyId }, crypto.randomUUID());

      if (result.success) {
        res.status(StatusCodes.OK).json({
          success: true,
          message: "Test notification processed successfully",
          data: result.data,
        });
      } else {
        res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
          success: false,
          message: "Failed to process test notification",
          error: result.error,
        });
      }
    } catch (error: any) {
      logger.error("Error processing test notification:", error);

      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: "Failed to process test notification",
        error: error.message,
      });
    }
  },

  /**
   * Get webhook status and configuration
   */
  getWebhookStatus: async (req: Request, res: Response) => {
    try {
      const status = {
        webhookEnabled: process.env.GMAIL_WEBHOOK_ENABLED === "true",
        googleCloudProject: process.env.GOOGLE_CLOUD_PROJECT || "Not set",
        pubsubTopic: process.env.GMAIL_PUBSUB_TOPIC || "gmail-sync-notifications",
        webhookEndpoint: `${req.protocol}://${req.get("host")}/api/gmail-webhook/webhook`,
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV || "development",
      };

      res.status(StatusCodes.OK).json({
        success: true,
        data: status,
      });
    } catch (error: any) {
      logger.error("Error getting webhook status:", error);
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: "Failed to get webhook status",
        error: error.message,
      });
    }
  },

  /**
   * Validate webhook setup and configuration
   */
  validateWebhookSetup: async (req: Request, res: Response) => {
    try {
      const validation = {
        googleCloudProject: {
          set: !!process.env.GOOGLE_CLOUD_PROJECT,
          value: process.env.GOOGLE_CLOUD_PROJECT || "Not set",
        },
        gmailClientId: {
          set: !!process.env.GOOGLE_CLIENT_ID,
          value: process.env.GOOGLE_CLIENT_ID ? "Set" : "Not set",
        },
        gmailClientSecret: {
          set: !!process.env.GOOGLE_CLIENT_SECRET,
          value: process.env.GOOGLE_CLIENT_SECRET ? "Set" : "Not set",
        },
        webhookEnabled: {
          set: process.env.GMAIL_WEBHOOK_ENABLED === "true",
          value: process.env.GMAIL_WEBHOOK_ENABLED || "false",
        },
        pubsubTopic: {
          set: !!process.env.GMAIL_PUBSUB_TOPIC,
          value: process.env.GMAIL_PUBSUB_TOPIC || "gmail-sync-notifications",
        },
        serviceAccountKey: {
          set: !!process.env.GMAIL_SERVICE_ACCOUNT_KEY_PATH,
          value: process.env.GMAIL_SERVICE_ACCOUNT_KEY_PATH || "Not set",
        },
        webhookEndpoint: {
          accessible: true, // Basic check
          url: `${req.protocol}://${req.get("host")}/api/gmail-webhook/webhook`,
        },
      };

      const isValid =
        validation.googleCloudProject.set && validation.gmailClientId.set && validation.gmailClientSecret.set;

      res.status(StatusCodes.OK).json({
        success: true,
        data: {
          isValid,
          validation,
          recommendations: isValid
            ? []
            : [
                "Set GOOGLE_CLOUD_PROJECT environment variable",
                "Configure Gmail OAuth credentials",
                "Enable Gmail webhook if needed",
              ],
        },
      });
    } catch (error: any) {
      logger.error("Error validating webhook setup:", error);
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: "Failed to validate webhook setup",
        error: error.message,
      });
    }
  },
};

/**
 * Process Gmail notification and trigger email sync
 */
async function processGmailNotification(
  notification: { emailAddress: string; historyId: string; type?: string },
  requestId: string
): Promise<{ success: boolean; data?: any; error?: string }> {
  try {
    const { emailAddress, historyId, type } = notification;

    logger.info(`[${requestId}] Processing Gmail notification for: ${emailAddress}, historyId: ${historyId}`);

    // Find the Gmail account
    const account = await EmailAccountModel.findOne({
      emailAddress: emailAddress,
      accountType: "gmail",
      isActive: true,
    });

    if (!account) {
      logger.warn(`[${requestId}] Gmail account not found or not active: ${emailAddress}`);
      return {
        success: false,
        error: `Gmail account not found or not active: ${emailAddress}`,
      };
    }

    if (!account.oauth?.accessToken) {
      logger.warn(`[${requestId}] Gmail account has no OAuth token: ${emailAddress}`);
      return {
        success: false,
        error: `Gmail account has no OAuth token: ${emailAddress}`,
      };
    }

    logger.info(`[${requestId}] Triggering Gmail sync for account: ${emailAddress}`);

    // Trigger immediate sync for this account using the historyId
    const syncResult = await RealTimeEmailSyncService.syncGmailEmails(account, historyId);

    if (syncResult.success) {
      logger.info(`[${requestId}] Gmail sync completed successfully for: ${emailAddress}`, {
        emailsProcessed: syncResult.emailsProcessed,
      });

      return {
        success: true,
        data: {
          accountId: account._id,
          emailAddress: account.emailAddress,
          historyId: historyId,
          emailsProcessed: syncResult.emailsProcessed,
          syncType: type || "webhook",
        },
      };
    } else {
      logger.error(`[${requestId}] Gmail sync failed for: ${emailAddress}`, {
        error: syncResult.error,
      });

      return {
        success: false,
        error: syncResult.error,
      };
    }
  } catch (error: any) {
    logger.error(`[${requestId}] Error processing Gmail notification:`, error);
    return {
      success: false,
      error: error.message,
    };
  }
}
