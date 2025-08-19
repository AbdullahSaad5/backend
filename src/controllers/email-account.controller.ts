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
        // Redirect to frontend with error
        const frontendUrl = process.env.FRONTEND_URL || "http://localhost:3000";
        return res.redirect(
          `${frontendUrl}/marketing-and-comms-management/Email/oauth/google/callback?error=missing_params&message=Authorization code and state are required`
        );
      }

      const result = await EmailOAuthService.handleGoogleCallback(code as string, state as string);

      if (!result.success) {
        // Redirect to frontend with error
        const frontendUrl = process.env.FRONTEND_URL || "http://localhost:3000";
        return res.redirect(
          `${frontendUrl}/marketing-and-comms-management/Email/oauth/google/callback?error=oauth_failed&message=${encodeURIComponent(result.error || "Failed to complete OAuth flow")}`
        );
      }

      // Redirect to frontend with success
      const frontendUrl = process.env.FRONTEND_URL || "http://localhost:3000";
      res.redirect(
        `${frontendUrl}/marketing-and-comms-management/Email/oauth/google/callback?success=true&message=Email account connected successfully`
      );
    } catch (error: any) {
      logger.error("Error handling Google OAuth callback:", error);
      // Redirect to frontend with error
      const frontendUrl = process.env.FRONTEND_URL || "http://localhost:3000";
      res.redirect(
        `${frontendUrl}/marketing-and-comms-management/Email/oauth/google/callback?error=server_error&message=${encodeURIComponent(error.message || "Failed to complete OAuth flow")}`
      );
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
        // Redirect to frontend with error
        const frontendUrl = process.env.FRONTEND_URL || "http://localhost:3000";
        return res.redirect(
          `${frontendUrl}/marketing-and-comms-management/Email/oauth/outlook/callback?error=missing_params&message=Authorization code and state are required`
        );
      }

      const result = await EmailOAuthService.handleOutlookCallback(code as string, state as string);

      if (!result.success) {
        // Redirect to frontend with error
        const frontendUrl = process.env.FRONTEND_URL || "http://localhost:3000";
        return res.redirect(
          `${frontendUrl}/marketing-and-comms-management/Email/oauth/outlook/callback?error=oauth_failed&message=${encodeURIComponent(result.error || "Failed to complete OAuth flow")}`
        );
      }

      // Redirect to frontend with success
      const frontendUrl = process.env.FRONTEND_URL || "http://localhost:3000";
      res.redirect(
        `${frontendUrl}/marketing-and-comms-management/Email/oauth/outlook/callback?success=true&message=Email account connected successfully`
      );
    } catch (error: any) {
      logger.error("Error handling Outlook OAuth callback:", error);
      // Redirect to frontend with error
      const frontendUrl = process.env.FRONTEND_URL || "http://localhost:3000";
      res.redirect(
        `${frontendUrl}/marketing-and-comms-management/Email/oauth/outlook/callback?error=server_error&message=${encodeURIComponent(error.message || "Failed to complete OAuth flow")}`
      );
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
      const {
        folder = "INBOX",
        limit = 50,
        since,
        markAsRead = false,
        includeBody = true,
        fetchAll = "false",
        page,
        pageSize,
      } = req.query;
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
        since: fetchAll === "true" ? undefined : since ? new Date(since as string) : undefined,
        markAsRead: markAsRead === "true",
        includeBody: includeBody === "true",
        fetchAll: fetchAll === "true",
        page: page ? parseInt(page as string) : undefined,
        pageSize: pageSize ? parseInt(pageSize as string) : undefined,
      };

      const result = await EmailFetchingService.fetchEmailsFromAccount(account, options);

      res.json({
        success: result.success,
        data: {
          emails: result.emails,
          totalCount: result.totalCount,
          newCount: result.newCount,
          pagination: result.pagination,
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
      const { folder = "INBOX", limit = 100, offset = 0, threadView = true, unreadOnly = false } = req.query;
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

      if (threadView === "true") {
        // Get threads with email counts - for threads, we need to include BOTH sent and received emails
        const { EmailThreadModel } = await import("@/models/email-thread.model");
        const { EmailModel } = await import("@/models/email.model");

        // For thread view, we need a different filter that includes both sent and received emails
        // but still respects the account and folder constraints
        let threadEmailFilter: any = {
          accountId: account._id,
        };

        // Apply folder-specific filtering for thread emails
        switch (folder) {
          case "INBOX":
            // For inbox threads, include emails received by this account
            // to.email is an array of objects, so we need to check if any email in the array matches
            threadEmailFilter["to.email"] = account.emailAddress;
            threadEmailFilter.isArchived = { $ne: true };
            threadEmailFilter.isSpam = { $ne: true };
            break;
          case "SENT":
            // For sent threads, include emails sent from this account
            threadEmailFilter["from.email"] = account.emailAddress;
            break;
          case "DRAFTS":
            threadEmailFilter.status = "processing";
            break;
          case "ARCHIVE":
            threadEmailFilter.isArchived = true;
            break;
          case "SPAM":
            threadEmailFilter.isSpam = true;
            break;
          default:
            // Default to inbox behavior - show ALL emails for this account
            // Don't filter by to/from - just show all emails for the account
            threadEmailFilter.isArchived = { $ne: true };
            threadEmailFilter.isSpam = { $ne: true };
        }

        if (unreadOnly === "true") {
          threadEmailFilter.isRead = false;
        }

        console.log(`🧵 Thread email filter for account ${account.emailAddress}, folder ${folder}:`, threadEmailFilter);

        let threads;
        try {
          threads = await EmailThreadModel.aggregate([
            {
              $lookup: {
                from: "emails",
                localField: "threadId",
                foreignField: "threadId",
                as: "emails",
                pipeline: [
                  { $match: threadEmailFilter },
                  { $sort: { receivedAt: -1 } },
                  { $limit: 20 }, // Increase limit to show more emails per thread
                ],
              },
            },
            {
              $match: {
                "emails.0": { $exists: true }, // Only threads with matching emails
                accountId: account._id, // Ensure thread belongs to this account
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
                // Add thread metadata for better display
                threadDirection: { $arrayElemAt: ["$emails.direction", 0] },
                threadSubject: { $arrayElemAt: ["$emails.subject", 0] },
                // Add email count for this thread
                emailCount: { $size: "$emails" },
                // Add participants from all emails in thread (simplified to avoid $concatArrays issues)
                participants: {
                  $map: {
                    input: { $slice: ["$emails", 5] }, // Limit to first 5 emails to avoid complexity
                    as: "email",
                    in: {
                      from: "$$email.from",
                      to: "$$email.to",
                      emailId: "$$email._id",
                    },
                  },
                },
              },
            },
            { $sort: { lastMessageAt: -1 } },
            { $skip: parseInt(offset as string) },
            { $limit: parseInt(limit as string) },
          ]);

          console.log(`🧵 Found ${threads.length} threads for account ${account.emailAddress}`);

          res.json({
            success: true,
            data: {
              threads,
              totalCount: threads.length, // Add totalCount for pagination
              account: {
                id: account._id,
                emailAddress: account.emailAddress,
                accountName: account.accountName,
              },
              viewMode: "threads",
            },
          });
        } catch (aggregationError: any) {
          logger.error("Error in email thread aggregation:", aggregationError);
          // Fallback to individual emails if aggregation fails
          console.log("🔄 Falling back to individual emails due to aggregation error");

          const { EmailModel } = await import("@/models/email.model");

          // Simple fallback query
          const fallbackFilter = {
            accountId: account._id,
            ...threadEmailFilter,
          };

          const fallbackEmails = await EmailModel.find(fallbackFilter)
            .sort({ receivedAt: -1 })
            .skip(parseInt(offset as string))
            .limit(parseInt(limit as string));

          const totalCount = await EmailModel.countDocuments(fallbackFilter);

          res.json({
            success: true,
            data: {
              emails: fallbackEmails,
              totalCount,
              account: {
                id: account._id,
                emailAddress: account.emailAddress,
                accountName: account.accountName,
              },
              viewMode: "emails", // Fallback to individual emails
            },
          });
        }
      } else {
        // Get individual emails - use the original direction-based filtering
        const { EmailModel } = await import("@/models/email.model");

        // Build email filter with proper account-based filtering for individual emails
        const emailFilter: any = {
          accountId: account._id,
        };

        // Additional filtering based on folder
        switch (folder) {
          case "INBOX":
            // For inbox, show emails received by this account
            emailFilter["to.email"] = account.emailAddress;
            emailFilter.isArchived = { $ne: true };
            emailFilter.isSpam = { $ne: true };
            break;
          case "SENT":
            // For sent folder, show emails sent from this account
            emailFilter["from.email"] = account.emailAddress;
            // Don't filter by archived/spam for sent emails - they should all show
            break;
          case "DRAFTS":
            // For drafts, show emails with processing status
            emailFilter.status = "processing";
            break;
          case "ARCHIVE":
            // For archive, show archived emails
            emailFilter.isArchived = true;
            break;
          case "SPAM":
            // For spam, show spam emails
            emailFilter.isSpam = true;
            break;
          default:
            // Default to inbox behavior - show ALL emails for this account
            // Don't filter by to/from - just show all emails for the account
            emailFilter.isArchived = { $ne: true };
            emailFilter.isSpam = { $ne: true };
        }

        if (unreadOnly === "true") {
          emailFilter.isRead = false;
        }

        console.log(`📧 Individual email filter for account ${account.emailAddress}, folder ${folder}:`, emailFilter);

        const emails = await EmailModel.find(emailFilter)
          .sort({ receivedAt: -1 })
          .skip(parseInt(offset as string))
          .limit(parseInt(limit as string))
          .populate("accountId", "emailAddress accountName");

        const totalCount = await EmailModel.countDocuments(emailFilter);

        console.log(`📧 Found ${emails.length} individual emails for account ${account.emailAddress}`);

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

  // Debug endpoint to check account email count
  static async getAccountEmailCount(req: Request, res: Response) {
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

      const { EmailModel } = await import("@/models/email.model");
      const { EmailThreadModel } = await import("@/models/email-thread.model");

      const emailCount = await EmailModel.countDocuments({ accountId: account._id });
      const threadCount = await EmailThreadModel.countDocuments();

      // Get sample emails
      const sampleEmails = await EmailModel.find({ accountId: account._id })
        .limit(5)
        .select("subject from threadId receivedAt")
        .sort({ receivedAt: -1 });

      res.json({
        success: true,
        data: {
          account: {
            id: account._id,
            emailAddress: account.emailAddress,
            accountName: account.accountName,
            accountType: account.accountType,
            connectionStatus: account.connectionStatus,
            stats: account.stats,
          },
          emailCount,
          threadCount,
          sampleEmails,
          hasOAuth: !!account.oauth,
          oauthProvider: account.oauth?.provider,
        },
      });
    } catch (error: any) {
      logger.error("Error getting account email count:", error);
      res.status(500).json({
        success: false,
        message: "Failed to get email count",
        error: error.message,
      });
    }
  }

  // Sync account emails (fetch new emails)
  // Supports fetchAll parameter to fetch all emails instead of just recent ones
  static async syncAccountEmails(req: Request, res: Response) {
    try {
      console.log("🔄 SYNC EMAILS REQUEST");
      const { accountId } = req.params;
      const { fetchAll = "false" } = req.query; // New parameter to fetch all emails
      const token = req.headers.authorization?.replace("Bearer ", "");

      console.log("Request details:", {
        accountId,
        hasToken: !!token,
        tokenLength: token?.length,
        headers: Object.keys(req.headers),
        fetchAll: fetchAll,
      });

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

      // Fetch emails based on fetchAll parameter
      const options = {
        since: fetchAll === "true" ? undefined : account.stats.lastSyncAt || new Date(Date.now() - 24 * 60 * 60 * 1000), // Skip since filter if fetchAll is true
        includeBody: true,
        fetchAll: fetchAll === "true",
        useHistoryAPI: account.accountType === "gmail" && account.oauth, // Use History API for Gmail OAuth accounts
        limit: fetchAll === "true" ? 1000 : 50, // Higher limit for fetchAll
      };
      console.log("📧 Fetch options:", options);

      // Use multi-folder sync if account has multiple folders configured
      const syncFolders = account.settings?.syncFolders || ["INBOX"];
      const useMultiFolderSync = syncFolders.length > 1;

      console.log("📁 Sync configuration:", {
        useMultiFolderSync,
        syncFolders,
        folderCount: syncFolders.length,
      });

      let result;
      if (useMultiFolderSync) {
        console.log("🔄 Using multi-folder sync");
        result = await EmailFetchingService.syncMultipleFolders(account, options);
      } else {
        console.log("📧 Using single folder sync (INBOX)");
        result = await EmailFetchingService.fetchEmailsFromAccount(account, options);
      }

      console.log("📤 Sending response:", {
        success: result.success,
        newEmails: result.newCount,
        totalEmails: result.emails?.length || 0,
        hasError: !!result.error,
      });

      res.json({
        success: result.success,
        data: {
          newEmailsCount: result.newCount,
          totalProcessed: result.emails?.length || 0,
          account: {
            id: account._id,
            emailAddress: account.emailAddress,
            accountName: account.accountName,
            lastSyncAt: account.stats.lastSyncAt,
          },
        },
        message: result.success
          ? fetchAll === "true"
            ? `Successfully synced ${result.emails?.length || 0} emails (all emails)`
            : `Successfully synced ${result.newCount} new emails`
          : "Sync failed",
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

  // Setup real-time Gmail watch for an account
  static async setupGmailWatch(req: Request, res: Response) {
    try {
      console.log("🔄 GMAIL WATCH SETUP REQUEST");
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

      // Verify this is a Gmail OAuth account
      if (account.accountType !== "gmail" || !account.oauth) {
        return res.status(400).json({
          success: false,
          message: "Only Gmail OAuth accounts support real-time watch",
        });
      }

      const { EmailFetchingService } = await import("@/services/email-fetching.service");

      // Setup watch notifications
      await EmailFetchingService.setupGmailWatch(account);

      res.status(200).json({
        success: true,
        message: "Gmail real-time watch setup completed successfully",
        data: {
          accountId: account._id,
          emailAddress: account.emailAddress,
          watchExpiration: account.syncState?.watchExpiration,
          isWatching: account.syncState?.isWatching,
        },
      });
    } catch (error: any) {
      console.error("Gmail watch setup error:", error);
      res.status(500).json({
        success: false,
        message: "Failed to setup Gmail watch",
        error: error.message,
      });
    }
  }

  // Enhanced Gmail sync using History API
  static async syncGmailWithHistoryAPI(req: Request, res: Response) {
    try {
      console.log("🔄 GMAIL HISTORY API SYNC REQUEST");
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

      // Verify this is a Gmail OAuth account
      if (account.accountType !== "gmail" || !account.oauth) {
        return res.status(400).json({
          success: false,
          message: "This endpoint is only for Gmail OAuth accounts",
        });
      }

      // Update status to syncing
      account.status = "syncing";
      await account.save();

      const { EmailFetchingService } = await import("@/services/email-fetching.service");

      console.log("🔄 Starting Gmail History API sync for:", account.emailAddress);

      const result = await EmailFetchingService.syncGmailWithHistoryAPI(account, {
        useHistoryAPI: true,
        includeBody: true,
        fetchAll: true, // Force fetch ALL emails
      });

      console.log("📤 Gmail History API sync response:", {
        success: result.success,
        historyId: result.historyId,
        totalCount: result.totalCount,
        newCount: result.newCount,
        hasError: !!result.error,
      });

      res.json({
        success: result.success,
        data: {
          historyId: result.historyId,
          totalProcessed: result.totalCount,
          newEmailsCount: result.newCount,
          syncStatus: account.syncState?.syncStatus,
          account: {
            id: account._id,
            emailAddress: account.emailAddress,
            accountName: account.accountName,
            lastSyncAt: account.stats.lastSyncAt,
          },
        },
        message: result.success
          ? `Gmail History API sync completed. Status: ${account.syncState?.syncStatus}`
          : "Gmail History API sync failed",
        error: result.error,
      });
    } catch (error: any) {
      logger.error("Error in Gmail History API sync:", error);
      res.status(500).json({
        success: false,
        message: "Failed to sync Gmail with History API",
        error: error.message,
      });
    }
  }

  static async refreshAccountToken(req: Request, res: Response) {
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

      // Find the account
      const account = await EmailAccountModel.findOne({ _id: accountId, userId });
      if (!account) {
        return res.status(404).json({
          success: false,
          message: "Email account not found",
        });
      }

      // Check if account has OAuth
      if (!account.oauth) {
        return res.status(400).json({
          success: false,
          message: "Account does not use OAuth authentication",
        });
      }

      // Import and use the token refresh method
      const { EmailFetchingService } = await import("../services/email-fetching.service");

      // Attempt to refresh token using the EmailOAuthService
      const { EmailOAuthService } = await import("@/services/emailOAuth.service");

      const refreshResult = await EmailOAuthService.refreshTokens(account);

      if (!refreshResult.success) {
        throw new Error(refreshResult.error || "Failed to refresh token");
      }
      // Get the updated account
      const updatedAccount = await EmailAccountModel.findById(account._id);

      if (!updatedAccount) {
        throw new Error("Failed to retrieve updated account");
      }

      logger.info(`Successfully refreshed token for account: ${account.emailAddress}`);

      return res.json({
        success: true,
        message: "Token refreshed successfully",
        data: {
          accountId: updatedAccount._id,
          connectionStatus: updatedAccount.connectionStatus,
          lastError: updatedAccount.stats?.lastError,
        },
      });
    } catch (error: any) {
      console.log("❌ TOKEN REFRESH ERROR:", {
        message: error.message,
        code: error.code,
        status: error.status,
        cause: error.cause,
      });

      logger.error("Error refreshing account token:", error);

      // Update account with error status
      const { accountId } = req.params;

      let errorMessage = "Token refresh failed";
      let userMessage = "Failed to refresh token";

      // Handle specific OAuth errors
      if (error.message?.includes("invalid_grant") || error.code === 400) {
        errorMessage = "Refresh token expired or revoked. Please re-authenticate this account.";
        userMessage = "Your Gmail refresh token has expired or been revoked. Please re-authenticate your account.";
      } else if (error.message?.includes("invalid_client")) {
        errorMessage = "OAuth client configuration error.";
        userMessage = "There's a configuration issue with the OAuth client.";
      }

      await EmailAccountModel.findByIdAndUpdate(accountId, {
        $set: {
          connectionStatus: "error",
          "stats.lastError": errorMessage,
        },
      });

      return res.status(400).json({
        success: false,
        message: userMessage,
        error: errorMessage,
        requiresReAuth: error.message?.includes("invalid_grant") || error.code === 400,
      });
    }
  }

  // Update account sync folders
  static async updateSyncFolders(req: Request, res: Response) {
    try {
      const { accountId } = req.params;
      const { syncFolders } = req.body;
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

      // Validate sync folders
      if (!Array.isArray(syncFolders) || syncFolders.length === 0) {
        return res.status(400).json({
          success: false,
          message: "syncFolders must be a non-empty array",
        });
      }

      // Update account with new sync folders
      account.settings = {
        ...account.settings,
        syncFolders: syncFolders,
      };

      await account.save();

      console.log("📁 Updated sync folders for account:", {
        accountId: account._id,
        emailAddress: account.emailAddress,
        syncFolders: syncFolders,
      });

      res.json({
        success: true,
        message: "Sync folders updated successfully",
        data: {
          accountId: account._id,
          syncFolders: syncFolders,
        },
      });
    } catch (error: any) {
      logger.error("Error updating sync folders:", error);
      res.status(500).json({
        success: false,
        message: "Failed to update sync folders",
        error: error.message,
      });
    }
  }

  // Re-authenticate existing account with expired tokens
  static async reAuthenticateExistingAccount(req: Request, res: Response) {
    try {
      const { accountId } = req.params;
      const { provider } = req.body;
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

      if (!account.oauth) {
        return res.status(400).json({
          success: false,
          message: "This account is not an OAuth account",
        });
      }

      // Generate OAuth URL for re-authentication
      const { EmailOAuthService } = await import("@/services/emailOAuth.service");

      let authUrl: string;
      if (account.oauth.provider === "gmail") {
        authUrl = EmailOAuthService.generateGoogleOAuthUrl(
          userId,
          account.emailAddress,
          account.accountName,
          account.isPrimary
        );
      } else if (account.oauth.provider === "outlook") {
        authUrl = EmailOAuthService.generateOutlookOAuthUrl(
          userId,
          account.emailAddress,
          account.accountName,
          account.isPrimary
        );
      } else {
        return res.status(400).json({
          success: false,
          message: "Unsupported OAuth provider",
        });
      }

      res.json({
        success: true,
        message: "Re-authentication URL generated",
        data: {
          authUrl,
          accountId: account._id,
          emailAddress: account.emailAddress,
          provider: account.oauth.provider,
        },
      });
    } catch (error: any) {
      logger.error("Error generating re-authentication URL:", error);
      res.status(500).json({
        success: false,
        message: "Failed to generate re-authentication URL",
        error: error.message,
      });
    }
  }

  // Manual sync endpoints
  static async startManualSync(req: Request, res: Response) {
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

      // Verify account belongs to user
      const account = await EmailAccountModel.findOne({ _id: accountId, userId });
      if (!account) {
        return res.status(404).json({
          success: false,
          message: "Email account not found",
        });
      }

      const { ManualEmailSyncService } = await import("@/services/manual-email-sync.service");
      const result = await ManualEmailSyncService.startManualSync(accountId);

      if (result.success) {
        res.json({
          success: true,
          message: result.message,
          data: result.data,
        });
      } else {
        res.status(400).json({
          success: false,
          message: result.message,
          error: result.error,
        });
      }
    } catch (error: any) {
      logger.error("Error starting manual sync:", error);
      res.status(500).json({
        success: false,
        message: "Failed to start manual sync",
        error: error.message,
      });
    }
  }

  static async continueManualSync(req: Request, res: Response) {
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

      // Verify account belongs to user
      const account = await EmailAccountModel.findOne({ _id: accountId, userId });
      if (!account) {
        return res.status(404).json({
          success: false,
          message: "Email account not found",
        });
      }

      const { ManualEmailSyncService } = await import("@/services/manual-email-sync.service");
      const result = await ManualEmailSyncService.continueManualSync(accountId);

      if (result.success) {
        res.json({
          success: true,
          message: result.message,
          data: result.data,
        });
      } else {
        res.status(400).json({
          success: false,
          message: result.message,
          error: result.error,
        });
      }
    } catch (error: any) {
      logger.error("Error continuing manual sync:", error);
      res.status(500).json({
        success: false,
        message: "Failed to continue manual sync",
        error: error.message,
      });
    }
  }

  static async stopManualSync(req: Request, res: Response) {
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

      // Verify account belongs to user
      const account = await EmailAccountModel.findOne({ _id: accountId, userId });
      if (!account) {
        return res.status(404).json({
          success: false,
          message: "Email account not found",
        });
      }

      const { ManualEmailSyncService } = await import("@/services/manual-email-sync.service");
      const result = await ManualEmailSyncService.stopManualSync(accountId);

      if (result.success) {
        res.json({
          success: true,
          message: result.message,
        });
      } else {
        res.status(400).json({
          success: false,
          message: result.message,
          error: result.error,
        });
      }
    } catch (error: any) {
      logger.error("Error stopping manual sync:", error);
      res.status(500).json({
        success: false,
        message: "Failed to stop manual sync",
        error: error.message,
      });
    }
  }

  static async getManualSyncProgress(req: Request, res: Response) {
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

      // Verify account belongs to user
      const account = await EmailAccountModel.findOne({ _id: accountId, userId });
      if (!account) {
        return res.status(404).json({
          success: false,
          message: "Email account not found",
        });
      }

      const { ManualEmailSyncService } = await import("@/services/manual-email-sync.service");
      const progress = await ManualEmailSyncService.getManualSyncProgress(accountId);

      if (progress) {
        res.json({
          success: true,
          data: progress,
        });
      } else {
        res.status(404).json({
          success: false,
          message: "No manual sync progress found",
        });
      }
    } catch (error: any) {
      logger.error("Error getting manual sync progress:", error);
      res.status(500).json({
        success: false,
        message: "Failed to get manual sync progress",
        error: error.message,
      });
    }
  }
}
