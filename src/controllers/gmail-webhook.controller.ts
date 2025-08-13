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
   */
  handleGmailNotification: async (req: Request, res: Response) => {
    const requestId = crypto.randomUUID();
    
    try {
      logger.info(`[${requestId}] Gmail webhook notification received`, {
        headers: Object.keys(req.headers),
        bodyKeys: Object.keys(req.body),
        method: req.method,
        url: req.url
      });

      // Verify the request is from Google Cloud Pub/Sub
      const userAgent = req.get("User-Agent") || "";
      if (!userAgent.includes("Google-Cloud-PubSub")) {
        logger.warn(`[${requestId}] Invalid User-Agent: ${userAgent}`);
        return res.status(StatusCodes.FORBIDDEN).json({
          success: false,
          message: "Invalid request source"
        });
      }

      // Handle Pub/Sub message format
      const { message } = req.body;
      if (!message) {
        logger.warn(`[${requestId}] No message in request body`);
        return res.status(StatusCodes.BAD_REQUEST).json({
          success: false,
          message: "No message in request"
        });
      }

      // Decode the base64 message data
      const messageData = Buffer.from(message.data, 'base64').toString('utf-8');
      const notification = JSON.parse(messageData);

      logger.info(`[${requestId}] Processing Gmail notification`, {
        emailAddress: notification.emailAddress,
        historyId: notification.historyId,
        messageId: message.messageId
      });

      // Find the Gmail account
      const account = await EmailAccountModel.findOne({ 
        emailAddress: notification.emailAddress,
        accountType: 'gmail',
        oauth: { $exists: true }
      });

      if (!account) {
        logger.warn(`[${requestId}] Gmail account not found: ${notification.emailAddress}`);
        return res.status(StatusCodes.NOT_FOUND).json({
          success: false,
          message: "Gmail account not found"
        });
      }

      // Process the notification using History API
      await EmailFetchingService.processGmailNotification(
        notification.emailAddress, 
        notification.historyId
      );

      // Acknowledge the message
      res.status(StatusCodes.OK).json({
        success: true,
        message: "Notification processed successfully",
        requestId
      });

    } catch (error: any) {
      logger.error(`[${requestId}] Error processing Gmail notification:`, error);
      
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: "Failed to process notification",
        error: error.message,
        requestId
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
      timestamp: new Date().toISOString()
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
          message: "emailAddress and historyId are required"
        });
      }

      await EmailFetchingService.processGmailNotification(emailAddress, historyId);

      res.status(StatusCodes.OK).json({
        success: true,
        message: "Test notification processed successfully"
      });

    } catch (error: any) {
      logger.error("Error processing test notification:", error);
      
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: "Failed to process test notification",
        error: error.message
      });
    }
  }
};
