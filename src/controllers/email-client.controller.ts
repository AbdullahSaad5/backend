import { Request, Response } from "express";
import { EmailAccountModel, IEmailAccount } from "@/models/email-account.model";
import { EmailModel } from "@/models/email.model";
import { EmailAccountConfigService } from "@/services/email-account-config.service";
import { EmailOAuthService } from "@/services/emailOAuth.service";
import { UnifiedEmailService } from "@/services/unified-email.service";
import { logger } from "@/utils/logger.util";
import { jwtVerify } from "@/utils/jwt.util";
import { authService } from "@/services/user-auth.service";
import { EmailDirection, EmailType, EmailStatus, EmailPriority } from "@/contracts/mailbox.contract";

export class EmailClientController {
  // Send email using a specific account
  static async sendEmail(req: Request, res: Response) {
    try {
      const { accountId } = req.params;
      const { to, subject, text, html, cc, bcc, attachments, replyTo, inReplyTo, references, threadId } = req.body;
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

          // Update account with refreshed tokens
          account = await EmailAccountModel.findById(accountId);
        }
      }

      // Use unified email service to send email
      const result = await UnifiedEmailService.sendEmail(account, {
        to,
        subject,
        body: text,
        htmlBody: html,
        cc,
        bcc,
        replyTo,
        inReplyTo,
        references,
        threadId,
        attachments,
      });

      if (result.success) {
        // Validate that we have a messageId
        if (!result.messageId) {
          logger.error("Email service returned success but no messageId", { result, accountId: account._id });
          return res.status(500).json({
            success: false,
            message: "Email sent but failed to generate message ID",
            error: "Internal service error",
          });
        }

        // Save email to database
        const emailData = {
          messageId: result.messageId,
          threadId: result.threadId || threadId,
          accountId: account._id,
          direction: EmailDirection.OUTBOUND,
          type: EmailType.GENERAL,
          status: EmailStatus.RECEIVED,
          priority: EmailPriority.NORMAL,
          subject,
          textContent: text,
          htmlContent: html || text,
          from: { email: account.emailAddress, name: account.displayName || account.accountName },
          to: Array.isArray(to) ? to.map((email: string) => ({ email })) : [{ email: to }],
          cc: cc ? (Array.isArray(cc) ? cc.map((email: string) => ({ email })) : [{ email: cc }]) : [],
          bcc: bcc ? (Array.isArray(bcc) ? bcc.map((email: string) => ({ email })) : [{ email: bcc }]) : [],
          sentAt: new Date(),
          receivedAt: new Date(),
          isRead: true,
          readAt: new Date(),
          isReplied: false,
          isForwarded: false,
          isArchived: false,
          isSpam: false,
          inReplyTo,
          references,
        };

        try {
          const savedEmail = await EmailModel.create(emailData);

          res.status(200).json({
            success: true,
            message: "Email sent successfully",
            data: {
              messageId: result.messageId,
              threadId: result.threadId,
              email: savedEmail,
              provider: result.provider,
            },
          });
        } catch (dbError: any) {
          logger.error("Failed to save email to database", { dbError, emailData });

          // Email was sent but failed to save to database
          res.status(200).json({
            success: true,
            message: "Email sent successfully but failed to save to database",
            data: {
              messageId: result.messageId,
              threadId: result.threadId,
              provider: result.provider,
              warning: "Email sent but not saved to database",
            },
          });
        }
      } else {
        logger.error("Email service failed", { result, accountId: account._id });
        res.status(400).json({
          success: false,
          message: "Failed to send email",
          error: result.error,
          provider: result.provider,
        });
      }
    } catch (error: any) {
      logger.error("Send email error:", error);
      res.status(500).json({
        success: false,
        message: "Failed to send email",
        error: error.message,
      });
    }
  }

  /**
   * Send reply email using unified service
   */
  static async sendReply(req: Request, res: Response) {
    try {
      const { accountId } = req.params;
      const { originalMessageId, to, subject, text, html, cc, bcc, attachments, replyTo } = req.body;
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

      // Get original message for threading information
      const originalEmail = await EmailModel.findById(originalMessageId);
      if (!originalEmail) {
        return res.status(404).json({
          success: false,
          message: "Original message not found",
        });
      }

      // Use unified email service to send reply
      const result = await UnifiedEmailService.sendReply(account, originalMessageId, {
        to,
        subject: subject || `Re: ${originalEmail.subject}`,
        body: text,
        htmlBody: html,
        cc,
        bcc,
        replyTo,
        threadId: originalEmail.threadId,
        inReplyTo: originalEmail.messageId,
        references: originalEmail.references
          ? [...originalEmail.references, originalEmail.messageId]
          : [originalEmail.messageId],
      });

      if (result.success) {
        // Save reply email to database
        const emailData = {
          messageId: result.messageId,
          threadId: result.threadId || originalEmail.threadId,
          accountId: account._id,
          direction: EmailDirection.OUTBOUND,
          type: EmailType.GENERAL,
          status: EmailStatus.RECEIVED,
          priority: EmailPriority.NORMAL,
          subject: subject || `Re: ${originalEmail.subject}`,
          textContent: text,
          htmlContent: html || text,
          from: { email: account.emailAddress, name: account.displayName || account.accountName },
          to: Array.isArray(to) ? to.map((email: string) => ({ email })) : [{ email: to }],
          cc: cc ? (Array.isArray(cc) ? cc.map((email: string) => ({ email })) : [{ email: cc }]) : [],
          bcc: bcc ? (Array.isArray(bcc) ? bcc.map((email: string) => ({ email })) : [{ email: bcc }]) : [],
          sentAt: new Date(),
          receivedAt: new Date(),
          isRead: true,
          readAt: new Date(),
          isReplied: false,
          isForwarded: false,
          isArchived: false,
          isSpam: false,
          inReplyTo: originalEmail.messageId,
          references: originalEmail.references
            ? [...originalEmail.references, originalEmail.messageId]
            : [originalEmail.messageId],
        };

        const savedEmail = await EmailModel.create(emailData);

        // Mark original email as replied
        originalEmail.isReplied = true;
        originalEmail.repliedAt = new Date();
        await originalEmail.save();

        res.status(200).json({
          success: true,
          message: "Reply sent successfully",
          data: {
            messageId: result.messageId,
            threadId: result.threadId,
            email: savedEmail,
            provider: result.provider,
          },
        });
      } else {
        res.status(400).json({
          success: false,
          message: "Failed to send reply",
          error: result.error,
          provider: result.provider,
        });
      }
    } catch (error: any) {
      logger.error("Send reply error:", error);
      res.status(500).json({
        success: false,
        message: "Failed to send reply",
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
      const { folder = "INBOX", limit = 50, offset = 0, search, threadId } = req.query;
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

      let emails = [];
      let totalCount = 0;

      // If threadId is provided, fetch emails on-demand from Gmail API
      if (threadId) {
        console.log("📧 Fetching emails on-demand for threadId:", threadId);

        // For Gmail accounts, fetch emails on-demand
        if (account.accountType === "gmail" && account.oauth) {
          const { GmailSyncService } = await import("@/services/sync/gmail-sync.service");
          const result = await GmailSyncService.getThreadEmails(account, threadId as string);

          if (result.success && result.emails) {
            emails = result.emails;
            totalCount = result.emails.length;
            console.log("📧 Fetched", emails.length, "emails on-demand from Gmail API");
          } else {
            console.error("❌ Failed to fetch emails on-demand:", result.error);
            emails = [];
            totalCount = 0;
          }
        } else if (account.accountType === "outlook" && account.oauth) {
          // For Outlook accounts, fetch emails on-demand
          const { OutlookSyncService } = await import("@/services/sync/outlook-sync.service");
          const result = await OutlookSyncService.getThreadEmails(account, threadId as string);

          if (result.success && result.emails) {
            emails = result.emails;
            totalCount = result.emails.length;
            console.log("📧 Fetched", emails.length, "emails on-demand from Outlook API");
          } else {
            console.error("❌ Failed to fetch emails on-demand:", result.error);
            emails = [];
            totalCount = 0;
          }
        } else {
          // For other account types, check database (fallback)
          const threadEmails = await EmailModel.find({
            threadId: threadId,
            accountId: account._id,
          })
            .sort({ receivedAt: 1, sentAt: 1 }) // Sort chronologically
            .limit(parseInt(limit as string))
            .lean();

          emails = threadEmails;
          totalCount = await EmailModel.countDocuments({
            threadId: threadId,
            accountId: account._id,
          });

          console.log("📧 Found", emails.length, "emails in database");
        }
      } else {
        // Sync emails from the account (normal flow)
        const result = await EmailAccountConfigService.syncEmails(account, folder as string, parseInt(limit as string));

        if (!result.success) {
          return res.status(400).json({
            success: false,
            message: "Failed to fetch emails",
            error: result.error,
          });
        }

        emails = result.emails || [];
        totalCount = result.emailCount;
      }

      res.json({
        success: true,
        data: {
          emails: emails,
          totalCount: totalCount,
          accountId: account._id,
          folder,
          threadId: threadId || null,
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
      const { originalEmailId, subject, text, html, attachments, threadId } = req.body;
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

      // Get the original email to extract proper threading information
      const originalEmail = await EmailModel.findById(originalEmailId);
      if (!originalEmail) {
        return res.status(404).json({
          success: false,
          message: "Original email not found",
        });
      }

      // Determine the recipient for the reply
      let recipientEmail = "";
      if (originalEmail.direction === "inbound") {
        // If original is inbound, reply to the sender
        recipientEmail = originalEmail.from.email;
      } else if (originalEmail.direction === "outbound") {
        // If original is outbound, reply to the recipient
        recipientEmail = originalEmail.to[0]?.email;
      }

      if (!recipientEmail) {
        return res.status(400).json({
          success: false,
          message: "Could not determine recipient for reply",
        });
      }

      // Create reply subject
      const replySubject = subject.startsWith("Re:") ? subject : `Re: ${subject}`;

      // Use the original email's thread ID for proper threading
      const finalThreadId = threadId || originalEmail.threadId;

      const result = await EmailAccountConfigService.sendEmailWithAccount(account, {
        to: recipientEmail,
        subject: replySubject,
        text,
        html,
        attachments,
        inReplyTo: originalEmail.messageId,
        references: originalEmail.messageId,
        threadId: finalThreadId,
      });

      if (!result.success) {
        return res.status(400).json({
          success: false,
          message: "Failed to send reply",
          error: result.error,
        });
      }

      // Mark the original email as replied
      originalEmail.isReplied = true;
      originalEmail.repliedAt = new Date();
      if (!originalEmail.isRead) {
        originalEmail.isRead = true;
        originalEmail.readAt = new Date();
      }
      await originalEmail.save();

      res.json({
        success: true,
        message: "Reply sent successfully",
        data: {
          messageId: result.data?.messageId,
          accountId: account._id,
          from: account.emailAddress,
          threadId: finalThreadId,
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
