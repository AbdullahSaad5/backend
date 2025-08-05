import { Request, Response } from "express";
import { EmailAccountModel, IEmailAccount } from "@/models/email-account.model";
import { EmailAccountConfigService } from "@/services/email-account-config.service";
import { EmailOAuthService } from "@/services/emailOAuth.service";
import { logger } from "@/utils/logger.util";
import { jwtVerify } from "@/utils/jwt.util";
import { authService } from "@/services/user-auth.service";

export class EmailClientController {
  // Send email using a specific account
  static async sendEmail(req: Request, res: Response) {
    try {
      const { accountId } = req.params;
      const { to, subject, text, html, cc, bcc, attachments, replyTo } = req.body;
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

      // Get the email account
      const account = await EmailAccountModel.findOne({ _id: accountId, userId });
      if (!account) {
        return res.status(404).json({
          success: false,
          message: "Email account not found",
        });
      }

      // Check if account is active
      if (!account.isActive) {
        return res.status(400).json({
          success: false,
          message: "Email account is not active",
        });
      }

      // Refresh OAuth tokens if needed
      if (account.oauth && account.oauth.tokenExpiry && new Date() > account.oauth.tokenExpiry) {
        const refreshResult = await EmailOAuthService.refreshTokens(account);
        if (!refreshResult.success) {
          return res.status(400).json({
            success: false,
            message: "Failed to refresh OAuth tokens",
            error: refreshResult.error,
          });
        }
      }

      // Send email
      const result = await EmailAccountConfigService.sendEmailWithAccount(account, {
        to,
        subject,
        text,
        html,
        cc,
        bcc,
        attachments,
      });

      if (!result.success) {
        return res.status(400).json({
          success: false,
          message: "Failed to send email",
          error: result.error,
        });
      }

      res.json({
        success: true,
        message: "Email sent successfully",
        data: {
          messageId: result.data?.messageId,
          accountId: account._id,
          from: account.emailAddress,
        },
      });
    } catch (error: any) {
      logger.error("Error sending email:", error);
      res.status(500).json({
        success: false,
        message: "Failed to send email",
        error: error.message,
      });
    }
  }

  // Send email using primary account
  static async sendEmailFromPrimary(req: Request, res: Response) {
    try {
      const { to, subject, text, html, cc, bcc, attachments, replyTo } = req.body;
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

      // Get the primary email account
      const account = await EmailAccountModel.findOne({ userId, isPrimary: true, isActive: true });
      if (!account) {
        return res.status(404).json({
          success: false,
          message: "No primary email account found",
        });
      }

      // Use the sendEmail method with the primary account
      req.params.accountId = account._id.toString();
      return EmailClientController.sendEmail(req, res);
    } catch (error: any) {
      logger.error("Error sending email from primary account:", error);
      res.status(500).json({
        success: false,
        message: "Failed to send email",
        error: error.message,
      });
    }
  }

  // Get emails from a specific account
  static async getEmails(req: Request, res: Response) {
    try {
      const { accountId } = req.params;
      const { folder = "INBOX", limit = 50, offset = 0, search } = req.query;
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

      // Get the email account
      const account = await EmailAccountModel.findOne({ _id: accountId, userId });
      if (!account) {
        return res.status(404).json({
          success: false,
          message: "Email account not found",
        });
      }

      // Check if account is active
      if (!account.isActive) {
        return res.status(400).json({
          success: false,
          message: "Email account is not active",
        });
      }

      // Refresh OAuth tokens if needed
      if (account.oauth && account.oauth.tokenExpiry && new Date() > account.oauth.tokenExpiry) {
        const refreshResult = await EmailOAuthService.refreshTokens(account);
        if (!refreshResult.success) {
          return res.status(400).json({
            success: false,
            message: "Failed to refresh OAuth tokens",
            error: refreshResult.error,
          });
        }
      }

      // Sync emails from the account
      const result = await EmailAccountConfigService.syncEmails(account, folder as string, parseInt(limit as string));

      if (!result.success) {
        return res.status(400).json({
          success: false,
          message: "Failed to fetch emails",
          error: result.error,
        });
      }

      res.json({
        success: true,
        data: {
          emails: result.emails || [],
          totalCount: result.emailCount,
          accountId: account._id,
          folder,
        },
      });
    } catch (error: any) {
      logger.error("Error getting emails:", error);
      res.status(500).json({
        success: false,
        message: "Failed to get emails",
        error: error.message,
      });
    }
  }

  // Get emails from all accounts
  static async getAllEmails(req: Request, res: Response) {
    try {
      const { folder = "INBOX", limit = 50, offset = 0, search } = req.query;
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

      // Get all active email accounts
      const accounts = await EmailAccountModel.find({ userId, isActive: true });
      if (accounts.length === 0) {
        return res.status(404).json({
          success: false,
          message: "No email accounts found",
        });
      }

      // Fetch emails from all accounts
      const allEmails = [];
      const accountResults = [];

      for (const account of accounts) {
        try {
          // Refresh OAuth tokens if needed
          if (account.oauth && account.oauth.tokenExpiry && new Date() > account.oauth.tokenExpiry) {
            await EmailOAuthService.refreshTokens(account);
          }

          const result = await EmailAccountConfigService.syncEmails(
            account,
            folder as string,
            parseInt(limit as string)
          );

          if (result.success && result.emails) {
            // Add account info to each email
            const emailsWithAccount = result.emails.map((email: any) => ({
              ...email,
              accountId: account._id,
              accountName: account.accountName,
              emailAddress: account.emailAddress,
            }));

            allEmails.push(...emailsWithAccount);
            accountResults.push({
              accountId: account._id,
              accountName: account.accountName,
              emailCount: result.emailCount,
            });
          }
        } catch (error: any) {
          logger.error(`Error syncing emails for account ${account.emailAddress}:`, error);
          accountResults.push({
            accountId: account._id,
            accountName: account.accountName,
            error: error.message,
          });
        }
      }

      // Sort emails by date (newest first)
      allEmails.sort((a, b) => {
        const dateA = new Date(a.headers?.date || 0);
        const dateB = new Date(b.headers?.date || 0);
        return dateB.getTime() - dateA.getTime();
      });

      // Apply pagination
      const paginatedEmails = allEmails.slice(
        parseInt(offset as string),
        parseInt(offset as string) + parseInt(limit as string)
      );

      res.json({
        success: true,
        data: {
          emails: paginatedEmails,
          totalCount: allEmails.length,
          accountResults,
          folder,
        },
      });
    } catch (error: any) {
      logger.error("Error getting all emails:", error);
      res.status(500).json({
        success: false,
        message: "Failed to get emails",
        error: error.message,
      });
    }
  }

  // Reply to an email
  static async replyToEmail(req: Request, res: Response) {
    try {
      const { accountId } = req.params;
      const { originalEmailId, subject, text, html, attachments } = req.body;
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

      // Get the email account
      const account = await EmailAccountModel.findOne({ _id: accountId, userId });
      if (!account) {
        return res.status(404).json({
          success: false,
          message: "Email account not found",
        });
      }

      // For now, we'll just send a new email with "Re:" prefix
      // In a full implementation, you'd want to handle threading properly
      const replySubject = subject.startsWith("Re:") ? subject : `Re: ${subject}`;

      const result = await EmailAccountConfigService.sendEmailWithAccount(account, {
        to: originalEmailId, // This should be the original sender's email
        subject: replySubject,
        text,
        html,
        attachments,
      });

      if (!result.success) {
        return res.status(400).json({
          success: false,
          message: "Failed to send reply",
          error: result.error,
        });
      }

      res.json({
        success: true,
        message: "Reply sent successfully",
        data: {
          messageId: result.data?.messageId,
          accountId: account._id,
          from: account.emailAddress,
        },
      });
    } catch (error: any) {
      logger.error("Error replying to email:", error);
      res.status(500).json({
        success: false,
        message: "Failed to send reply",
        error: error.message,
      });
    }
  }

  // Forward an email
  static async forwardEmail(req: Request, res: Response) {
    try {
      const { accountId } = req.params;
      const { originalEmailId, to, subject, text, html, attachments } = req.body;
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

      // Get the email account
      const account = await EmailAccountModel.findOne({ _id: accountId, userId });
      if (!account) {
        return res.status(404).json({
          success: false,
          message: "Email account not found",
        });
      }

      // Forward the email
      const forwardSubject = subject.startsWith("Fwd:") ? subject : `Fwd: ${subject}`;

      const result = await EmailAccountConfigService.sendEmailWithAccount(account, {
        to,
        subject: forwardSubject,
        text,
        html,
        attachments,
      });

      if (!result.success) {
        return res.status(400).json({
          success: false,
          message: "Failed to forward email",
          error: result.error,
        });
      }

      res.json({
        success: true,
        message: "Email forwarded successfully",
        data: {
          messageId: result.data?.messageId,
          accountId: account._id,
          from: account.emailAddress,
        },
      });
    } catch (error: any) {
      logger.error("Error forwarding email:", error);
      res.status(500).json({
        success: false,
        message: "Failed to forward email",
        error: error.message,
      });
    }
  }

  // Get email account statistics
  static async getAccountStats(req: Request, res: Response) {
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

      const accounts = await EmailAccountModel.find({ userId, isActive: true });

      const stats = accounts.map((account) => ({
        accountId: account._id,
        accountName: account.accountName,
        emailAddress: account.emailAddress,
        accountType: account.accountType,
        isPrimary: account.isPrimary,
        status: account.status,
        connectionStatus: account.connectionStatus,
        stats: account.stats,
        lastTestedAt: account.lastTestedAt,
      }));

      res.json({
        success: true,
        data: {
          totalAccounts: accounts.length,
          accounts: stats,
        },
      });
    } catch (error: any) {
      logger.error("Error getting account stats:", error);
      res.status(500).json({
        success: false,
        message: "Failed to get account statistics",
        error: error.message,
      });
    }
  }
}
