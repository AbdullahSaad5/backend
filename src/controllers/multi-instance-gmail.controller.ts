import { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import { MultiInstanceGmailService } from "@/services/multi-instance-gmail.service";
import { logger } from "@/utils/logger.util";

export const MultiInstanceGmailController = {
  /**
   * Get current instance configuration
   */
  getCurrentInstance: async (req: Request, res: Response): Promise<void> => {
    try {
      const currentInstance = MultiInstanceGmailService.getCurrentInstance();

      if (!currentInstance) {
        return res.status(StatusCodes.NOT_FOUND).json({
          success: false,
          message: "Current instance configuration not found",
        });
      }

      res.status(StatusCodes.OK).json({
        success: true,
        data: currentInstance,
      });
    } catch (error: any) {
      logger.error("Failed to get current instance:", error);

      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: "Failed to get current instance configuration",
        error: error.message,
      });
    }
  },

  /**
   * Get all instances
   */
  getAllInstances: async (req: Request, res: Response): Promise<void> => {
    try {
      const instances = MultiInstanceGmailService.getAllInstances();

      res.status(StatusCodes.OK).json({
        success: true,
        data: instances,
      });
    } catch (error: any) {
      logger.error("Failed to get all instances:", error);

      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: "Failed to get all instances",
        error: error.message,
      });
    }
  },

  /**
   * Get subscription statistics for all instances
   */
  getAllInstanceStats: async (req: Request, res: Response): Promise<void> => {
    try {
      const stats = await MultiInstanceGmailService.getAllInstanceStats();

      res.status(StatusCodes.OK).json({
        success: true,
        data: stats,
      });
    } catch (error: any) {
      logger.error("Failed to get all instance stats:", error);

      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: "Failed to get instance statistics",
        error: error.message,
      });
    }
  },

  /**
   * Get subscription statistics for a specific instance
   */
  getInstanceStats: async (req: Request, res: Response): Promise<void> => {
    try {
      const { instanceId } = req.params;

      if (!instanceId) {
        return res.status(StatusCodes.BAD_REQUEST).json({
          success: false,
          message: "Instance ID is required",
        });
      }

      const stats = await MultiInstanceGmailService.getInstanceStats(instanceId);

      res.status(StatusCodes.OK).json({
        success: true,
        data: stats,
      });
    } catch (error: any) {
      logger.error("Failed to get instance stats:", error);

      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: "Failed to get instance statistics",
        error: error.message,
      });
    }
  },

  /**
   * Test webhook for a specific instance
   */
  testInstanceWebhook: async (req: Request, res: Response): Promise<void> => {
    try {
      const { instanceId } = req.params;

      if (!instanceId) {
        return res.status(StatusCodes.BAD_REQUEST).json({
          success: false,
          message: "Instance ID is required",
        });
      }

      const result = await MultiInstanceGmailService.testInstanceWebhook(instanceId);

      res.status(StatusCodes.OK).json({
        success: true,
        data: result,
      });
    } catch (error: any) {
      logger.error("Failed to test instance webhook:", error);

      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: "Failed to test instance webhook",
        error: error.message,
      });
    }
  },

  /**
   * Update webhook URL for a specific instance
   */
  updateInstanceWebhookUrl: async (req: Request, res: Response): Promise<void> => {
    try {
      const { instanceId } = req.params;
      const { webhookUrl } = req.body;

      if (!instanceId || !webhookUrl) {
        return res.status(StatusCodes.BAD_REQUEST).json({
          success: false,
          message: "Instance ID and webhook URL are required",
        });
      }

      await MultiInstanceGmailService.updateInstanceWebhookUrl(instanceId, webhookUrl);

      res.status(StatusCodes.OK).json({
        success: true,
        message: "Webhook URL updated successfully",
      });
    } catch (error: any) {
      logger.error("Failed to update instance webhook URL:", error);

      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: "Failed to update webhook URL",
        error: error.message,
      });
    }
  },

  /**
   * Setup all instance subscriptions
   */
  setupAllInstances: async (req: Request, res: Response): Promise<void> => {
    try {
      await MultiInstanceGmailService.setupAllInstances();

      res.status(StatusCodes.OK).json({
        success: true,
        message: "All instance subscriptions setup completed",
      });
    } catch (error: any) {
      logger.error("Failed to setup all instances:", error);

      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: "Failed to setup all instances",
        error: error.message,
      });
    }
  },

  /**
   * Health check for multi-instance service
   */
  healthCheck: async (req: Request, res: Response): Promise<void> => {
    try {
      const currentInstance = MultiInstanceGmailService.getCurrentInstance();
      const allInstances = MultiInstanceGmailService.getAllInstances();

      res.status(StatusCodes.OK).json({
        success: true,
        message: "Multi-instance Gmail service is healthy",
        data: {
          currentInstance: currentInstance?.instanceId || "unknown",
          totalInstances: allInstances.length,
          activeInstances: allInstances.filter((i) => i.isActive).length,
          timestamp: new Date().toISOString(),
        },
      });
    } catch (error: any) {
      logger.error("Multi-instance health check failed:", error);

      res.status(StatusCodes.SERVICE_UNAVAILABLE).json({
        success: false,
        message: "Multi-instance Gmail service is unhealthy",
        error: error.message,
      });
    }
  },
};
