import { Request, Response } from "express";
import { EmailAccountModel, IEmailAccount } from "@/models/email-account.model";
import { EmailOAuthService } from "@/services/emailOAuth.service";
import { EmailProviderService } from "@/config/emailProviders";
import { EmailAccountConfigService } from "@/services/email-account-config.service";
import { logger } from "@/utils/logger.util";
import { jwtVerify } from "@/utils/jwt.util";
import { authService } from "@/services/user-auth.service";

export class EmailAccountController {
  // Get all email providers
  static async getProviders(req: Request, res: Response) {
    try {
      const providers = EmailProviderService.getAllProviders();
      res.json({
        success: true,
        data: providers,
      });
    } catch (error: any) {
      logger.error("Error getting email providers:", error);
      res.status(500).json({
        success: false,
        message: "Failed to get email providers",
        error: error.message,
      });
    }
  }

  // Get OAuth providers only
  static async getOAuthProviders(req: Request, res: Response) {
    try {
      const providers = EmailProviderService.getOAuthProviders();
      res.json({
        success: true,
        data: providers,
      });
    } catch (error: any) {
      logger.error("Error getting OAuth providers:", error);
      res.status(500).json({
        success: false,
        message: "Failed to get OAuth providers",
        error: error.message,
      });
    }
  }

  // Detect provider configuration from email address
  static async detectProvider(req: Request, res: Response) {
    try {
      const { emailAddress } = req.body;

      if (!emailAddress) {
        return res.status(400).json({
          success: false,
          message: "Email address is required",
        });
      }

      const defaultConfig = EmailProviderService.getDefaultConfigForEmail(emailAddress);
      const detectedProvider = EmailProviderService.detectProviderFromEmail(emailAddress);

      res.json({
        success: true,
        data: {
          emailAddress,
          detectedProvider: detectedProvider
            ? {
                name: detectedProvider.name,
                type: detectedProvider.type,
                note: detectedProvider.note,
              }
            : null,
          defaultConfig,
          isOAuthSupported: detectedProvider?.type === "oauth",
        },
      });
    } catch (error: any) {
      logger.error("Error detecting provider:", error);
      res.status(500).json({
        success: false,
        message: "Failed to detect provider",
        error: error.message,
      });
    }
  }

  // Initiate Google OAuth
  static async initiateGoogleOAuth(req: Request, res: Response) {
    try {
      const { emailAddress, accountName, isPrimary = false } = req.body;
      let userId = (req as any).user?.id || req.body.userId;

      // Fallback: extract from JWT if not present
      if (!userId && req.headers.authorization) {
        const token = req.headers.authorization.replace(/^Bearer /, "");
        const decoded = jwtVerify(token); // Use your JWT verify util
        userId = decoded.id?.toString();
      }

      if (!userId) {
        return res.status(400).json({
          success: false,
          message: "User ID is required",
        });
      }

      const oauthUrl = EmailOAuthService.generateGoogleOAuthUrl(userId, emailAddress, accountName, isPrimary);

      res.json({
        success: true,
        data: {
          oauthUrl,
        },
      });
    } catch (error: any) {
      logger.error("Error initiating Google OAuth:", error);
      res.status(500).json({
        success: false,
        message: "Failed to initiate Google OAuth",
        error: error.message,
      });
    }
  }

  // Handle Google OAuth callback
  static async handleGoogleCallback(req: Request, res: Response) {
    try {
      const { code, state } = req.query;

      if (!code || !state) {
        return res.status(400).json({
          success: false,
          message: "Authorization code and state are required",
        });
      }

      const result = await EmailOAuthService.handleGoogleCallback(code as string, state as string);

      if (!result.success) {
        return res.status(400).json({
          success: false,
          message: result.error,
        });
      }

      // Return JSON response for frontend to handle
      res.json({
        success: true,
        data: result.account,
        message: "Email account connected successfully",
      });
    } catch (error: any) {
      logger.error("Error handling Google OAuth callback:", error);
      res.status(500).json({
        success: false,
        message: error.message || "Failed to complete OAuth flow",
      });
    }
  }

  // Initiate Outlook OAuth
  static async initiateOutlookOAuth(req: Request, res: Response) {
    try {
      const { emailAddress, accountName, isPrimary = false } = req.body;
      let userId = (req as any).user?.id || req.body.userId;

      // Fallback: extract from JWT if not present
      if (!userId && req.headers.authorization) {
        const token = req.headers.authorization.replace(/^Bearer /, "");
        const decoded = jwtVerify(token); // Use your JWT verify util
        userId = decoded.id?.toString();
      }

      if (!userId) {
        return res.status(400).json({
          success: false,
          message: "User ID is required",
        });
      }

      const oauthUrl = EmailOAuthService.generateOutlookOAuthUrl(userId, emailAddress, accountName, isPrimary);

      res.json({
        success: true,
        data: {
          oauthUrl,
        },
      });
    } catch (error: any) {
      logger.error("Error initiating Outlook OAuth:", error);
      res.status(500).json({
        success: false,
        message: "Failed to initiate Outlook OAuth",
        error: error.message,
      });
    }
  }

  // Handle Outlook OAuth callback
  static async handleOutlookCallback(req: Request, res: Response) {
    try {
      const { code, state } = req.query;

      if (!code || !state) {
        return res.status(400).json({
          success: false,
          message: "Authorization code and state are required",
        });
      }

      const result = await EmailOAuthService.handleOutlookCallback(code as string, state as string);

      if (!result.success) {
        return res.status(400).json({
          success: false,
          message: result.error,
        });
      }

      // Return JSON response for frontend to handle
      res.json({
        success: true,
        data: result.account,
        message: "Email account connected successfully",
      });
    } catch (error: any) {
      logger.error("Error handling Outlook OAuth callback:", error);
      res.status(500).json({
        success: false,
        message: error.message || "Failed to complete OAuth flow",
      });
    }
  }

  // Create manual email account
  static async createManualAccount(req: Request, res: Response) {
    try {
      const accountData = req.body;
      const token = req.headers.authorization?.replace("Bearer ", "");

      if (!token) {
        return res.status(401).json({
          success: false,
          message: "Authorization token required",
        });
      }

      const decoded = jwtVerify(token);
      const userId = decoded.id.toString();
      const user = await authService.findUserById(userId);

      // Auto-detect provider configuration if not provided
      if (accountData.emailAddress && (!accountData.incomingServer?.host || !accountData.outgoingServer?.host)) {
        const defaultConfig = EmailProviderService.getDefaultConfigForEmail(accountData.emailAddress);

        // Merge user data with defaults
        accountData.accountType = accountData.accountType || defaultConfig.accountType;
        accountData.incomingServer = {
          ...defaultConfig.incomingServer,
          ...accountData.incomingServer,
          username: accountData.emailAddress, // Use email as username
        };
        accountData.outgoingServer = {
          ...defaultConfig.outgoingServer,
          ...accountData.outgoingServer,
          username: accountData.emailAddress, // Use email as username
        };
        accountData.settings = {
          ...defaultConfig.settings,
          ...accountData.settings,
        };
      }

      // Validate account data
      const validation = EmailAccountConfigService.validateEmailAccount(accountData);
      if (!validation.isValid) {
        return res.status(400).json({
          success: false,
          message: "Invalid account data",
          errors: validation.errors,
        });
      }

      // Encrypt passwords
      const encryptedAccountData = {
        ...accountData,
        userId,
        incomingServer: {
          ...accountData.incomingServer,
          password: EmailAccountConfigService.encryptPassword(accountData.incomingServer.password),
        },
        outgoingServer: {
          ...accountData.outgoingServer,
          password: EmailAccountConfigService.encryptPassword(accountData.outgoingServer.password),
        },
      };

      const account = await EmailAccountModel.create(encryptedAccountData);

      res.status(201).json({
        success: true,
        data: account,
      });
    } catch (error: any) {
      logger.error("Error creating manual email account:", error);
      res.status(500).json({
        success: false,
        message: "Failed to create email account",
        error: error.message,
      });
    }
  }

  // Get user's email accounts
  static async getUserAccounts(req: Request, res: Response) {
    try {
      const token = req.headers.authorization?.replace("Bearer ", "");

      if (!token) {
        return res.status(401).json({
          success: false,
          message: "Authorization token required",
        });
      }

      const decoded = jwtVerify(token);
      const userId = decoded.id.toString();
      const user = await authService.findUserById(userId);

      const accounts = await EmailAccountModel.find({ userId }).sort({ createdAt: -1 });

      res.json({
        success: true,
        data: accounts,
      });
    } catch (error: any) {
      logger.error("Error getting user email accounts:", error);
      res.status(500).json({
        success: false,
        message: "Failed to get email accounts",
        error: error.message,
      });
    }
  }

  // Test email account connection
  static async testConnection(req: Request, res: Response) {
    try {
      const { accountId } = req.params;
      const token = req.headers.authorization?.replace("Bearer ", "");

      if (!token) {
        return res.status(401).json({
          success: false,
          message: "Authorization token required",
        });
      }

      const decoded = jwtVerify(token);
      const userId = decoded.id.toString();
      const user = await authService.findUserById(userId);

      const account = await EmailAccountModel.findOne({ _id: accountId, userId });
      if (!account) {
        return res.status(404).json({
          success: false,
          message: "Email account not found",
        });
      }

      const result = await EmailAccountConfigService.testConnections(account);

      res.json({
        success: true,
        data: result,
      });
    } catch (error: any) {
      logger.error("Error testing email account connection:", error);
      res.status(500).json({
        success: false,
        message: "Failed to test connection",
        error: error.message,
      });
    }
  }

  // Update email account
  static async updateAccount(req: Request, res: Response) {
    try {
      const { accountId } = req.params;
      const updateData = req.body;
      const token = req.headers.authorization?.replace("Bearer ", "");

      if (!token) {
        return res.status(401).json({
          success: false,
          message: "Authorization token required",
        });
      }

      const decoded = jwtVerify(token);
      const userId = decoded.id.toString();
      const user = await authService.findUserById(userId);

      const account = await EmailAccountModel.findOne({ _id: accountId, userId });
      if (!account) {
        return res.status(404).json({
          success: false,
          message: "Email account not found",
        });
      }

      // Encrypt passwords if provided
      if (updateData.incomingServer?.password) {
        updateData.incomingServer.password = EmailAccountConfigService.encryptPassword(
          updateData.incomingServer.password
        );
      }
      if (updateData.outgoingServer?.password) {
        updateData.outgoingServer.password = EmailAccountConfigService.encryptPassword(
          updateData.outgoingServer.password
        );
      }

      const updatedAccount = await EmailAccountModel.findByIdAndUpdate(accountId, updateData, { new: true });

      res.json({
        success: true,
        data: updatedAccount,
      });
    } catch (error: any) {
      logger.error("Error updating email account:", error);
      res.status(500).json({
        success: false,
        message: "Failed to update email account",
        error: error.message,
      });
    }
  }

  // Delete email account
  static async deleteAccount(req: Request, res: Response) {
    try {
      const { accountId } = req.params;
      const token = req.headers.authorization?.replace("Bearer ", "");

      if (!token) {
        return res.status(401).json({
          success: false,
          message: "Authorization token required",
        });
      }

      const decoded = jwtVerify(token);
      const userId = decoded.id.toString();
      const user = await authService.findUserById(userId);

      const account = await EmailAccountModel.findOne({ _id: accountId, userId });
      if (!account) {
        return res.status(404).json({
          success: false,
          message: "Email account not found",
        });
      }

      await EmailAccountModel.findByIdAndDelete(accountId);

      res.json({
        success: true,
        message: "Email account deleted successfully",
      });
    } catch (error: any) {
      logger.error("Error deleting email account:", error);
      res.status(500).json({
        success: false,
        message: "Failed to delete email account",
        error: error.message,
      });
    }
  }

  // Refresh OAuth tokens
  static async refreshTokens(req: Request, res: Response) {
    try {
      const { accountId } = req.params;
      const token = req.headers.authorization?.replace("Bearer ", "");

      if (!token) {
        return res.status(401).json({
          success: false,
          message: "Authorization token required",
        });
      }

      const decoded = jwtVerify(token);
      const userId = decoded.id.toString();
      const user = await authService.findUserById(userId);

      const account = await EmailAccountModel.findOne({ _id: accountId, userId });
      if (!account) {
        return res.status(404).json({
          success: false,
          message: "Email account not found",
        });
      }

      if (!account.oauth) {
        return res.status(400).json({
          success: false,
          message: "Account does not use OAuth",
        });
      }

      const result = await EmailOAuthService.refreshTokens(account);

      if (!result.success) {
        return res.status(400).json({
          success: false,
          message: result.error,
        });
      }

      res.json({
        success: true,
        message: "Tokens refreshed successfully",
      });
    } catch (error: any) {
      logger.error("Error refreshing OAuth tokens:", error);
      res.status(500).json({
        success: false,
        message: "Failed to refresh tokens",
        error: error.message,
      });
    }
  }

  // Fetch emails from specific account
  static async fetchAccountEmails(req: Request, res: Response) {
    try {
      const { accountId } = req.params;
      const { folder = "INBOX", limit = 50, since, markAsRead = false, includeBody = true } = req.query;
      const token = req.headers.authorization?.replace("Bearer ", "");

      if (!token) {
        return res.status(401).json({
          success: false,
          message: "Authorization token required",
        });
      }

      const decoded = jwtVerify(token);
      const userId = decoded.id.toString();

      const account = await EmailAccountModel.findOne({ _id: accountId, userId });
      if (!account) {
        return res.status(404).json({
          success: false,
          message: "Email account not found",
        });
      }

      const { EmailFetchingService } = await import("@/services/email-fetching.service");

      const options = {
        folder: folder as string,
        limit: parseInt(limit as string),
        since: since ? new Date(since as string) : undefined,
        markAsRead: markAsRead === "true",
        includeBody: includeBody === "true",
      };

      const result = await EmailFetchingService.fetchEmailsFromAccount(account, options);

      res.json({
        success: result.success,
        data: {
          emails: result.emails,
          totalCount: result.totalCount,
          newCount: result.newCount,
          account: {
            id: account._id,
            emailAddress: account.emailAddress,
            accountName: account.accountName,
          },
        },
        error: result.error,
      });
    } catch (error: any) {
      logger.error("Error fetching account emails:", error);
      res.status(500).json({
        success: false,
        message: "Failed to fetch emails",
        error: error.message,
      });
    }
  }

  // Get stored emails for account with thread grouping
  static async getAccountEmailsWithThreads(req: Request, res: Response) {
    try {
      const { accountId } = req.params;
      const { folder = "INBOX", limit = 50, offset = 0, threadView = true, unreadOnly = false } = req.query;
      const token = req.headers.authorization?.replace("Bearer ", "");

      if (!token) {
        return res.status(401).json({
          success: false,
          message: "Authorization token required",
        });
      }

      const decoded = jwtVerify(token);
      const userId = decoded.id.toString();

      const account = await EmailAccountModel.findOne({ _id: accountId, userId });
      if (!account) {
        return res.status(404).json({
          success: false,
          message: "Email account not found",
        });
      }

      // Build email filter
      const emailFilter: any = { accountId: account._id };

      if (unreadOnly === "true") {
        emailFilter.isRead = false;
      }

      if (threadView === "true") {
        // Get threads with email counts
        const { EmailThreadModel } = await import("@/models/email-thread.model");
        const { EmailModel } = await import("@/models/email.model");

        const threads = await EmailThreadModel.aggregate([
          {
            $lookup: {
              from: "emails",
              localField: "threadId",
              foreignField: "threadId",
              as: "emails",
              pipeline: [
                { $match: emailFilter },
                { $sort: { receivedAt: -1 } },
                { $limit: 10 }, // Limit emails per thread for performance
              ],
            },
          },
          {
            $match: {
              "emails.0": { $exists: true }, // Only threads with matching emails
            },
          },
          {
            $addFields: {
              unreadCount: {
                $size: {
                  $filter: {
                    input: "$emails",
                    cond: { $eq: ["$$this.isRead", false] },
                  },
                },
              },
              latestEmail: { $arrayElemAt: ["$emails", 0] },
            },
          },
          { $sort: { lastMessageAt: -1 } },
          { $skip: parseInt(offset as string) },
          { $limit: parseInt(limit as string) },
        ]);

        res.json({
          success: true,
          data: {
            threads,
            account: {
              id: account._id,
              emailAddress: account.emailAddress,
              accountName: account.accountName,
            },
            viewMode: "threads",
          },
        });
      } else {
        // Get individual emails
        const { EmailModel } = await import("@/models/email.model");

        const emails = await EmailModel.find(emailFilter)
          .sort({ receivedAt: -1 })
          .skip(parseInt(offset as string))
          .limit(parseInt(limit as string))
          .populate("accountId", "emailAddress accountName");

        const totalCount = await EmailModel.countDocuments(emailFilter);

        res.json({
          success: true,
          data: {
            emails,
            totalCount,
            account: {
              id: account._id,
              emailAddress: account.emailAddress,
              accountName: account.accountName,
            },
            viewMode: "emails",
          },
        });
      }
    } catch (error: any) {
      logger.error("Error getting account emails with threads:", error);
      res.status(500).json({
        success: false,
        message: "Failed to get emails",
        error: error.message,
      });
    }
  }

  // Get specific thread details
  static async getThreadDetails(req: Request, res: Response) {
    try {
      const { accountId, threadId } = req.params;
      const token = req.headers.authorization?.replace("Bearer ", "");

      if (!token) {
        return res.status(401).json({
          success: false,
          message: "Authorization token required",
        });
      }

      const decoded = jwtVerify(token);
      const userId = decoded.id.toString();

      const account = await EmailAccountModel.findOne({ _id: accountId, userId });
      if (!account) {
        return res.status(404).json({
          success: false,
          message: "Email account not found",
        });
      }

      const { EmailThreadModel } = await import("@/models/email-thread.model");
      const { EmailModel } = await import("@/models/email.model");

      // Get thread info
      const thread = await EmailThreadModel.findOne({ threadId });
      if (!thread) {
        return res.status(404).json({
          success: false,
          message: "Thread not found",
        });
      }

      // Get all emails in thread for this account
      const emails = await EmailModel.find({
        threadId,
        accountId: account._id,
      }).sort({ receivedAt: 1 }); // Chronological order for thread view

      res.json({
        success: true,
        data: {
          thread,
          emails,
          account: {
            id: account._id,
            emailAddress: account.emailAddress,
            accountName: account.accountName,
          },
        },
      });
    } catch (error: any) {
      logger.error("Error getting thread details:", error);
      res.status(500).json({
        success: false,
        message: "Failed to get thread details",
        error: error.message,
      });
    }
  }

  // Sync account emails (fetch new emails)
  static async syncAccountEmails(req: Request, res: Response) {
    try {
      const { accountId } = req.params;
      const token = req.headers.authorization?.replace("Bearer ", "");

      if (!token) {
        return res.status(401).json({
          success: false,
          message: "Authorization token required",
        });
      }

      const decoded = jwtVerify(token);
      const userId = decoded.id.toString();

      const account = await EmailAccountModel.findOne({ _id: accountId, userId });
      if (!account) {
        return res.status(404).json({
          success: false,
          message: "Email account not found",
        });
      }

      // Update status to syncing
      account.status = "syncing";
      await account.save();

      const { EmailFetchingService } = await import("@/services/email-fetching.service");

      // Fetch emails since last sync
      const options = {
        since: account.stats.lastSyncAt || new Date(Date.now() - 24 * 60 * 60 * 1000), // Last 24 hours if no previous sync
        includeBody: true,
      };

      const result = await EmailFetchingService.fetchEmailsFromAccount(account, options);

      res.json({
        success: result.success,
        data: {
          newEmailsCount: result.newCount,
          totalProcessed: result.emails.length,
          account: {
            id: account._id,
            emailAddress: account.emailAddress,
            accountName: account.accountName,
            lastSyncAt: account.stats.lastSyncAt,
          },
        },
        message: result.success ? `Successfully synced ${result.newCount} new emails` : "Sync failed",
        error: result.error,
      });
    } catch (error: any) {
      logger.error("Error syncing account emails:", error);
      res.status(500).json({
        success: false,
        message: "Failed to sync emails",
        error: error.message,
      });
    }
  }
}
