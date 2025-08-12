import { Request, Response } from "express";
import { EmailAccountModel, IEmailAccount } from "@/models/email-account.model";
import { EmailModel } from "@/models/email.model";
import { EmailAccountConfigService } from "@/services/email-account-config.service";
import { EmailOAuthService } from "@/services/emailOAuth.service";
import { logger } from "@/utils/logger.util";
import { jwtVerify } from "@/utils/jwt.util";
import { authService } from "@/services/user-auth.service";
import { EmailDirection, EmailType, EmailStatus, EmailPriority } from "@/contracts/mailbox.contract";

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
      let account = await EmailAccountModel.findOne({ _id: accountId, userId });
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

      // Validate OAuth configuration for OAuth accounts
      if (account.oauth) {
        if (!account.oauth.accessToken && !account.oauth.refreshToken) {
          return res.status(400).json({
            success: false,
            message: "OAuth account is not properly configured. Please re-authenticate.",
          });
        }
      } else {
        // For non-OAuth accounts, validate SMTP configuration
        if (!account.outgoingServer?.host || !account.outgoingServer?.username || !account.outgoingServer?.password) {
          return res.status(400).json({
            success: false,
            message: "SMTP configuration is incomplete. Please check account settings.",
          });
        }
      }

      // Check if current access token is still valid before attempting refresh
      if (account.oauth && account.oauth.tokenExpiry && new Date() > account.oauth.tokenExpiry) {
        console.log("🔄 Token expired, checking if current token is still valid...");

        const isTokenValid = await EmailOAuthService.isAccessTokenValid(account);
        if (isTokenValid) {
          console.log("✅ Current access token is still valid, no refresh needed");
        } else {
          console.log("🔄 Token is invalid, attempting refresh...");
          const refreshResult = await EmailOAuthService.refreshTokens(account);
          if (!refreshResult.success) {
            console.log("❌ Token refresh failed:", refreshResult.error);

            // Check if it's an authentication issue that requires re-authentication
            if (refreshResult.error?.includes("re-authenticate") || refreshResult.error?.includes("invalid_grant")) {
              return res.status(401).json({
                success: false,
                message: "OAuth authentication expired. Please re-authenticate your account.",
                error: refreshResult.error,
                requiresReauth: true,
              });
            }

            return res.status(400).json({
              success: false,
              message: "Failed to refresh OAuth tokens",
              error: refreshResult.error,
            });
          }
          console.log("✅ Token refresh successful");

          // Reload the account to get updated tokens
          const updatedAccount = await EmailAccountModel.findOne({ _id: accountId, userId });
          if (updatedAccount) {
            account = updatedAccount;
          }
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
        // If sending failed and it's an OAuth account, it might be due to token issues
        if (account.oauth) {
          console.log("❌ Email sending failed for OAuth account:", result.error);
          return res.status(400).json({
            success: false,
            message: "Failed to send email. OAuth tokens may be invalid. Please re-authenticate your account.",
            error: result.error,
            requiresReauth: true,
          });
        } else {
          console.log("❌ Email sending failed for SMTP account:", result.error);
          return res.status(400).json({
            success: false,
            message: "Failed to send email",
            error: result.error,
          });
        }
      }

      console.log("✅ Email sent successfully");

      // Save sent email to database
      try {
        // Check if this is a reply or forward by analyzing subject
        const isReply = subject.toLowerCase().includes("re:");
        const isForward = subject.toLowerCase().includes("fwd:") || subject.toLowerCase().includes("fw:");
        let threadId;
        let originalEmailId = null;

        if (isReply || isForward) {
          // Find the original email being replied to or forwarded
          const cleanSubject = subject.replace(/^(Re:|Fwd?:|RE:|FWD?:)\s*/gi, "").trim();

          // Look for existing emails with similar subject
          const originalEmail = await EmailModel.findOne({
            $and: [
              {
                $or: [{ subject: { $regex: cleanSubject, $options: "i" } }, { subject: cleanSubject }],
              },
              {
                $or: [{ "from.email": Array.isArray(to) ? to[0] : to }, { "to.email": account.emailAddress }],
              },
            ],
          }).sort({ receivedAt: -1 });

          if (originalEmail) {
            threadId = originalEmail.threadId;
            originalEmailId = originalEmail._id;

            // Mark original email as replied or forwarded
            if (isReply) {
              originalEmail.isReplied = true;
              originalEmail.repliedAt = new Date();
              if (!originalEmail.isRead) {
                originalEmail.isRead = true;
                originalEmail.readAt = new Date();
              }
            } else if (isForward) {
              originalEmail.isForwarded = true;
              originalEmail.forwardedAt = new Date();
              if (!originalEmail.isRead) {
                originalEmail.isRead = true;
                originalEmail.readAt = new Date();
              }
            }
            await originalEmail.save();

            logger.info(`Original email updated for reply/forward`, {
              originalEmailId: originalEmail._id,
              isReply,
              isForward,
              threadId,
            });
          } else {
            // No original email found, create new thread
            threadId = `thread_${cleanSubject.replace(/[^a-zA-Z0-9]/g, "_").toLowerCase()}_${Date.now()}`;
          }
        } else {
          // New email thread
          const normalizedSubject = subject.replace(/^(Re:|Fwd?:|RE:|FWD?:)\s*/gi, "").trim();
          threadId = `thread_${normalizedSubject.replace(/[^a-zA-Z0-9]/g, "_").toLowerCase()}_${Date.now()}`;
        }

        // Create email data for database storage
        const emailData = {
          messageId: result.data?.messageId || `sent_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          threadId,
          accountId: account._id,
          direction: EmailDirection.OUTBOUND,
          type: "general" as EmailType,
          status: EmailStatus.PROCESSED,
          priority: EmailPriority.NORMAL,
          subject,
          textContent: text,
          htmlContent: html,
          from: {
            email: account.emailAddress,
            name: account.displayName || account.accountName,
          },
          to: Array.isArray(to) ? to.map((email: string) => ({ email })) : [{ email: to }],
          cc: cc ? (Array.isArray(cc) ? cc.map((email: string) => ({ email })) : [{ email: cc }]) : [],
          bcc: bcc ? (Array.isArray(bcc) ? bcc.map((email: string) => ({ email })) : [{ email: bcc }]) : [],
          replyTo: replyTo ? { email: replyTo } : undefined,
          sentAt: new Date(),
          receivedAt: new Date(),
          isRead: true, // Outbound emails are considered "read" by the sender
          readAt: new Date(),
          isReplied: false,
          isForwarded: false,
          isArchived: false,
          isSpam: false,
          folder: "Sent", // Mark as sent folder
        };

        const savedEmail = await EmailModel.create(emailData);

        logger.info(`Sent email stored in database`, {
          emailId: savedEmail._id,
          messageId: result.data?.messageId,
          threadId,
          subject,
          to: Array.isArray(to) ? to : [to],
        });
      } catch (dbError: any) {
        logger.error("Error storing sent email in database:", dbError);
        // Don't fail the email send if database storage fails
        console.log("⚠️ Email sent successfully but failed to store in database:", dbError.message);
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
