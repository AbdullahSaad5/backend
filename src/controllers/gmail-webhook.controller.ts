import { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import { EmailFetchingService } from "@/services/email-fetching.service";
import { EmailAccountModel } from "@/models/email-account.model";
import { logger } from "@/utils/logger.util";
import crypto from "crypto";

export const GmailWebhookController = {
  /**
   * Handle Gmail push notifications from Google Cloud Pub/Sub
   * This endpoint receives real-time notifications when emails change in Gmail
   * DISABLED: Auto-sync is disabled - manual sync only
   */
  handleGmailNotification: async (req: Request, res: Response) => {
    const requestId = crypto.randomUUID();

    logger.info(`[${requestId}] Gmail webhook notification received but auto-sync is disabled`, {
      headers: Object.keys(req.headers),
      bodyKeys: Object.keys(req.body),
      method: req.method,
      url: req.url,
    });

    // Return success but don't process the notification
    res.status(StatusCodes.OK).json({
      success: true,
      message: "Notification received but auto-sync is disabled - use manual sync",
      requestId,
    });
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

      await EmailFetchingService.processGmailNotification(emailAddress, historyId);

      res.status(StatusCodes.OK).json({
        success: true,
        message: "Test notification processed successfully",
      });
    } catch (error: any) {
      logger.error("Error processing test notification:", error);

      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: "Failed to process test notification",
        error: error.message,
      });
    }
  },
};
