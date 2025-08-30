import { Request, Response } from "express";
import { RealTimeEmailSyncService } from "@/services/real-time-email-sync.service";
import { RealTimeEmailSyncCron } from "@/cron/real-time-email-sync.cron";
import { EmailAccountModel } from "@/models/email-account.model";
import { logger } from "@/utils/logger.util";
import { StatusCodes } from "http-status-codes";

export class RealTimeSyncController {
  /**
   * Setup real-time sync for a specific account
   */
  static async setupAccountSync(req: Request, res: Response) {
    try {
      const { accountId } = req.params;

      if (!accountId) {
        return res.status(StatusCodes.BAD_REQUEST).json({
          success: false,
          message: "Account ID is required",
        });
      }

      const account = await EmailAccountModel.findById(accountId);
      if (!account) {
        return res.status(StatusCodes.NOT_FOUND).json({
          success: false,
          message: "Email account not found",
        });
      }

      if (!account.isActive) {
        return res.status(StatusCodes.BAD_REQUEST).json({
          success: false,
          message: "Account is not active",
        });
      }

      if (!account.oauth?.accessToken) {
        return res.status(StatusCodes.BAD_REQUEST).json({
          success: false,
          message: "Account does not have OAuth access token",
        });
      }

      logger.info(`🔄 Setting up real-time sync for account: ${account.emailAddress}`);

      let result;
      if (account.accountType === "gmail") {
        result = await RealTimeEmailSyncService.setupGmailRealTimeSync(account);
      } else if (account.accountType === "outlook") {
        result = await RealTimeEmailSyncService.setupOutlookRealTimeSync(account);
      } else {
        return res.status(StatusCodes.BAD_REQUEST).json({
          success: false,
          message: `Unsupported account type: ${account.accountType}`,
        });
      }

      if (result.success) {
        res.status(StatusCodes.OK).json({
          success: true,
          message: result.message,
          data: {
            accountId: account._id,
            emailAddress: account.emailAddress,
            accountType: account.accountType,
            syncStatus: result.message,
          },
        });
      } else {
        res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
          success: false,
          message: "Failed to setup real-time sync",
          error: result.error,
        });
      }

    } catch (error: any) {
      logger.error("Error setting up account sync:", error);
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: "Failed to setup real-time sync",
        error: error.message,
      });
    }
  }

  /**
   * Setup real-time sync for all accounts
   */
  static async setupAllAccountsSync(req: Request, res: Response) {
    try {
      logger.info("🔄 Setting up real-time sync for all accounts");

      await RealTimeEmailSyncCron.setupRealTimeSyncForAllAccounts();

      res.status(StatusCodes.OK).json({
        success: true,
        message: "Real-time sync setup initiated for all accounts",
      });

    } catch (error: any) {
      logger.error("Error setting up all accounts sync:", error);
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: "Failed to setup real-time sync for all accounts",
        error: error.message,
      });
    }
  }

  /**
   * Get sync status for all accounts
   */
  static async getSyncStatus(req: Request, res: Response) {
    try {
      const status = await RealTimeEmailSyncCron.getSyncStatus();

      res.status(StatusCodes.OK).json({
        success: true,
        data: status,
      });

    } catch (error: any) {
      logger.error("Error getting sync status:", error);
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: "Failed to get sync status",
        error: error.message,
      });
    }
  }

  /**
   * Renew subscriptions for all accounts
   */
  static async renewAllSubscriptions(req: Request, res: Response) {
    try {
      logger.info("🔄 Renewing all real-time sync subscriptions");

      await RealTimeEmailSyncCron.renewAllSubscriptions();

      res.status(StatusCodes.OK).json({
        success: true,
        message: "All subscriptions renewed successfully",
      });

    } catch (error: any) {
      logger.error("Error renewing subscriptions:", error);
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: "Failed to renew subscriptions",
        error: error.message,
      });
    }
  }

  /**
   * Manual sync for a specific account
   */
  static async manualSyncAccount(req: Request, res: Response) {
    try {
      const { accountId } = req.params;

      if (!accountId) {
        return res.status(StatusCodes.BAD_REQUEST).json({
          success: false,
          message: "Account ID is required",
        });
      }

      const account = await EmailAccountModel.findById(accountId);
      if (!account) {
        return res.status(StatusCodes.NOT_FOUND).json({
          success: false,
          message: "Email account not found",
        });
      }

      logger.info(`🔄 Manual sync for account: ${account.emailAddress}`);

      let result;
      if (account.accountType === "gmail") {
        result = await RealTimeEmailSyncService.syncGmailEmails(account);
      } else if (account.accountType === "outlook") {
        result = await RealTimeEmailSyncService.syncOutlookEmails(account);
      } else {
        return res.status(StatusCodes.BAD_REQUEST).json({
          success: false,
          message: `Unsupported account type: ${account.accountType}`,
        });
      }

      if (result.success) {
        res.status(StatusCodes.OK).json({
          success: true,
          message: result.message,
          data: {
            accountId: account._id,
            emailAddress: account.emailAddress,
            accountType: account.accountType,
            emailsProcessed: result.emailsProcessed,
          },
        });
      } else {
        res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
          success: false,
          message: "Manual sync failed",
          error: result.error,
        });
      }

    } catch (error: any) {
      logger.error("Error during manual sync:", error);
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: "Failed to perform manual sync",
        error: error.message,
      });
    }
  }

  /**
   * Get cron job status
   */
  static async getCronStatus(req: Request, res: Response) {
    try {
      const status = RealTimeEmailSyncCron.getStatus();

      res.status(StatusCodes.OK).json({
        success: true,
        data: status,
      });

    } catch (error: any) {
      logger.error("Error getting cron status:", error);
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: "Failed to get cron status",
        error: error.message,
      });
    }
  }

  /**
   * Start real-time sync cron jobs
   */
  static async startCronJobs(req: Request, res: Response) {
    try {
      logger.info("🔄 Starting real-time sync cron jobs");

      RealTimeEmailSyncCron.start();

      res.status(StatusCodes.OK).json({
        success: true,
        message: "Real-time sync cron jobs started successfully",
      });

    } catch (error: any) {
      logger.error("Error starting cron jobs:", error);
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: "Failed to start cron jobs",
        error: error.message,
      });
    }
  }

  /**
   * Stop real-time sync cron jobs
   */
  static async stopCronJobs(req: Request, res: Response) {
    try {
      logger.info("🛑 Stopping real-time sync cron jobs");

      RealTimeEmailSyncCron.stop();

      res.status(StatusCodes.OK).json({
        success: true,
        message: "Real-time sync cron jobs stopped successfully",
      });

    } catch (error: any) {
      logger.error("Error stopping cron jobs:", error);
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: "Failed to stop cron jobs",
        error: error.message,
      });
    }
  }
}
