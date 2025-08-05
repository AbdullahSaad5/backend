import { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import { LambdaEmailIntegrationService } from "@/services/lambda-email-integration.service";
import { MailboxController } from "@/controllers/mailbox.controller";
import { logger } from "@/utils/logger.util";
import crypto from "crypto";

export const LambdaMailboxController = {
  /**
   * Webhook endpoint for Lambda to notify your backend (if needed)
   * This is optional - Lambda can directly write to MongoDB
   */
  handleLambdaNotification: async (req: Request, res: Response) => {
    const requestId = crypto.randomUUID();
    
    try {
      const { messageId, emailId, processed, error } = req.body;
      
      logger.info(`[${requestId}] Lambda notification received`, {
        messageId,
        emailId,
        processed,
        hasError: !!error,
      });

      if (error) {
        logger.error(`[${requestId}] Lambda processing error`, { error });
      }

      // Trigger immediate sync for this specific email if needed
      if (processed && emailId) {
        try {
          await LambdaEmailIntegrationService.syncProcessedEmails();
        } catch (syncError: any) {
          logger.error(`[${requestId}] Sync error`, { error: syncError.message });
        }
      }

      res.status(StatusCodes.OK).json({
        success: true,
        message: "Lambda notification processed",
        requestId,
      });

    } catch (error: any) {
      logger.error(`[${requestId}] Lambda notification handling failed`, { error: error.message });
      
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: "Failed to process Lambda notification",
        error: error.message,
      });
    }
  },

  /**
   * Manual sync endpoint to process Lambda-created emails
   */
  syncLambdaEmails: async (req: Request, res: Response) => {
    const requestId = crypto.randomUUID();
    
    try {
      logger.info(`[${requestId}] Manual Lambda email sync requested`);
      
      const result = await LambdaEmailIntegrationService.syncProcessedEmails();
      
      logger.info(`[${requestId}] Manual sync completed`, {
        processed: result.processed,
        errors: result.errors.length,
      });

      res.status(StatusCodes.OK).json({
        success: result.success,
        message: `Sync completed: ${result.processed} emails processed`,
        data: {
          processed: result.processed,
          errors: result.errors,
        },
        requestId,
      });

    } catch (error: any) {
      logger.error(`[${requestId}] Manual sync failed`, { error: error.message });
      
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: "Manual sync failed",
        error: error.message,
      });
    }
  },

  /**
   * Health check endpoint to monitor Lambda integration
   */
  getLambdaIntegrationStatus: async (req: Request, res: Response) => {
    try {
      const health = await LambdaEmailIntegrationService.healthCheck();
      
      res.status(StatusCodes.OK).json({
        success: true,
        data: health,
      });

    } catch (error: any) {
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: "Health check failed",
        error: error.message,
      });
    }
  },

  /**
   * Fallback endpoint - process emails using your existing logic
   * This can be used as backup if Lambda fails
   */
  processEmailFallback: async (req: Request, res: Response) => {
    const requestId = crypto.randomUUID();
    
    try {
      logger.info(`[${requestId}] Processing email via fallback method`);
      
      // Use your existing email processing logic
      await MailboxController.processEmail(req, res);
      
    } catch (error: any) {
      logger.error(`[${requestId}] Fallback processing failed`, { error: error.message });
      
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: "Fallback email processing failed",
        error: error.message,
      });
    }
  },

  /**
   * Get Lambda processing statistics
   */
  getLambdaStats: async (req: Request, res: Response) => {
    try {
      const { timeframe = '24h' } = req.query;
      
      let timeFilter: Date;
      const now = new Date();
      
      switch (timeframe) {
        case '1h':
          timeFilter = new Date(now.getTime() - 60 * 60 * 1000);
          break;
        case '24h':
          timeFilter = new Date(now.getTime() - 24 * 60 * 60 * 1000);
          break;
        case '7d':
          timeFilter = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        default:
          timeFilter = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      }

      // Import EmailModel here to avoid circular dependencies
      const { EmailModel } = await import("@/models/email.model");
      const { EmailDirection, EmailStatus } = await import("@/contracts/mailbox.contract");

      const stats = {
        totalProcessed: await EmailModel.countDocuments({
          direction: EmailDirection.INBOUND,
          createdAt: { $gte: timeFilter },
        }),
        
        successfullyProcessed: await EmailModel.countDocuments({
          direction: EmailDirection.INBOUND,
          status: EmailStatus.PROCESSED,
          createdAt: { $gte: timeFilter },
        }),
        
        pendingProcessing: await EmailModel.countDocuments({
          direction: EmailDirection.INBOUND,
          status: EmailStatus.RECEIVED,
          processedAt: { $exists: false },
          createdAt: { $gte: timeFilter },
        }),
        
        failed: await EmailModel.countDocuments({
          direction: EmailDirection.INBOUND,
          status: EmailStatus.FAILED,
          createdAt: { $gte: timeFilter },
        }),
        
        spam: await EmailModel.countDocuments({
          direction: EmailDirection.INBOUND,
          isSpam: true,
          createdAt: { $gte: timeFilter },
        }),
      };

      res.status(StatusCodes.OK).json({
        success: true,
        data: {
          timeframe,
          period: {
            from: timeFilter,
            to: now,
          },
          stats,
        },
      });

    } catch (error: any) {
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: "Failed to get Lambda stats",
        error: error.message,
      });
    }
  },

  // All your existing mailbox endpoints remain the same
  ...MailboxController,
};
