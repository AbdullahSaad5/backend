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

  /**
   * Check which accounts are missing webhooks
   */
  static async checkMissingWebhooks(req: Request, res: Response) {
    try {
      logger.info("🔍 Checking for accounts missing webhooks");

      const accountsWithoutWebhooks = await EmailAccountModel.find({
        isActive: true,
        accountType: { $in: ["gmail", "outlook"] },
        "oauth.accessToken": { $exists: true, $ne: null },
        $or: [
          { "syncState.gmailTopic": { $exists: false } },
          { "syncState.webhookId": { $exists: false } },
          { "syncState.isWatching": { $ne: true } },
        ],
      });

      const accountsWithWebhooks = await EmailAccountModel.find({
        isActive: true,
        accountType: { $in: ["gmail", "outlook"] },
        "oauth.accessToken": { $exists: true, $ne: null },
        $and: [{ "syncState.gmailTopic": { $exists: true } }, { "syncState.isWatching": true }],
      });

      res.status(StatusCodes.OK).json({
        success: true,
        data: {
          totalAccounts: accountsWithoutWebhooks.length + accountsWithWebhooks.length,
          accountsWithWebhooks: accountsWithWebhooks.length,
          accountsWithoutWebhooks: accountsWithoutWebhooks.length,
          missingWebhooks: accountsWithoutWebhooks.map((acc) => ({
            accountId: acc._id,
            emailAddress: acc.emailAddress,
            accountType: acc.accountType,
            syncState: acc.syncState,
          })),
          webhookStatus: {
            gmail: {
              total:
                accountsWithoutWebhooks.filter((acc) => acc.accountType === "gmail").length +
                accountsWithWebhooks.filter((acc) => acc.accountType === "gmail").length,
              withWebhooks: accountsWithWebhooks.filter((acc) => acc.accountType === "gmail").length,
              withoutWebhooks: accountsWithoutWebhooks.filter((acc) => acc.accountType === "gmail").length,
            },
            outlook: {
              total:
                accountsWithoutWebhooks.filter((acc) => acc.accountType === "outlook").length +
                accountsWithWebhooks.filter((acc) => acc.accountType === "outlook").length,
              withWebhooks: accountsWithWebhooks.filter((acc) => acc.accountType === "outlook").length,
              withoutWebhooks: accountsWithoutWebhooks.filter((acc) => acc.accountType === "outlook").length,
            },
          },
        },
      });
    } catch (error: any) {
      logger.error("Error checking missing webhooks:", error);
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: "Failed to check missing webhooks",
        error: error.message,
      });
    }
  }

  /**
   * Setup webhooks for all accounts that don't have them
   */
  static async setupMissingWebhooks(req: Request, res: Response) {
    try {
      logger.info("🔄 Setting up missing webhooks for all accounts");

      const accountsWithoutWebhooks = await EmailAccountModel.find({
        isActive: true,
        accountType: { $in: ["gmail", "outlook"] },
        "oauth.accessToken": { $exists: true, $ne: null },
        $or: [
          { "syncState.gmailTopic": { $exists: false } },
          { "syncState.webhookId": { $exists: false } },
          { "syncState.isWatching": { $ne: true } },
        ],
      });

      logger.info(`📧 Found ${accountsWithoutWebhooks.length} accounts without webhooks`);

      const results = [];
      for (const account of accountsWithoutWebhooks) {
        try {
          logger.info(`🔄 Setting up webhook for: ${account.emailAddress} (${account.accountType})`);

          let result;
          if (account.accountType === "gmail") {
            result = await RealTimeEmailSyncService.setupGmailRealTimeSync(account);
          } else if (account.accountType === "outlook") {
            result = await RealTimeEmailSyncService.setupOutlookRealTimeSync(account);
          }

          results.push({
            accountId: account._id,
            emailAddress: account.emailAddress,
            accountType: account.accountType,
            success: result?.success || false,
            message: result?.message || "Setup failed",
            error: result?.error,
          });

          // Add delay between accounts to avoid rate limiting
          await new Promise((resolve) => setTimeout(resolve, 1000));
        } catch (error: any) {
          logger.error(`❌ Failed to setup webhook for ${account.emailAddress}:`, error);
          results.push({
            accountId: account._id,
            emailAddress: account.emailAddress,
            accountType: account.accountType,
            success: false,
            message: "Setup failed",
            error: error.message,
          });
        }
      }

      const successful = results.filter((r) => r.success).length;
      const failed = results.filter((r) => !r.success).length;

      res.status(StatusCodes.OK).json({
        success: true,
        message: `Webhook setup completed. ${successful} successful, ${failed} failed.`,
        data: {
          total: results.length,
          successful,
          failed,
          results,
        },
      });
    } catch (error: any) {
      logger.error("Error setting up missing webhooks:", error);
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: "Failed to setup missing webhooks",
        error: error.message,
      });
    }
  }

  /**
   * Get Gmail topic information for an account
   */
  static async getGmailTopicInfo(req: Request, res: Response) {
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

      if (account.accountType !== "gmail") {
        return res.status(StatusCodes.BAD_REQUEST).json({
          success: false,
          message: "Account is not a Gmail account",
        });
      }

      const topicInfo = await RealTimeEmailSyncService.getGmailTopicInfo(account);

      res.status(StatusCodes.OK).json({
        success: true,
        data: {
          accountId: account._id,
          emailAddress: account.emailAddress,
          topicInfo,
        },
      });
    } catch (error: any) {
      logger.error("Error getting Gmail topic info:", error);
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: "Failed to get Gmail topic info",
        error: error.message,
      });
    }
  }

  /**
   * Clean up Gmail topic for an account
   */
  static async cleanupGmailTopic(req: Request, res: Response) {
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

      if (account.accountType !== "gmail") {
        return res.status(StatusCodes.BAD_REQUEST).json({
          success: false,
          message: "Account is not a Gmail account",
        });
      }

      await RealTimeEmailSyncService.cleanupGmailTopic(account);

      res.status(StatusCodes.OK).json({
        success: true,
        message: "Gmail topic cleanup completed",
        data: {
          accountId: account._id,
          emailAddress: account.emailAddress,
        },
      });
    } catch (error: any) {
      logger.error("Error cleaning up Gmail topic:", error);
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: "Failed to cleanup Gmail topic",
        error: error.message,
      });
    }
  }
}
