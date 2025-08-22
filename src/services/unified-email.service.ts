import { IEmailAccount } from "@/models/email-account.model";
import { OutlookEmailService, OutlookEmailMessage } from "./outlook-email.service";
import { EmailAccountConfigService } from "./email-account-config.service";
import { logger } from "@/utils/logger.util";

export interface UnifiedEmailMessage {
  to: string | string[];
  cc?: string | string[];
  bcc?: string | string[];
  subject: string;
  body: string;
  htmlBody?: string;
  replyTo?: string;
  inReplyTo?: string;
  references?: string[];
  threadId?: string;
  attachments?: any[];
}

export interface UnifiedEmailResponse {
  success: boolean;
  messageId?: string;
  threadId?: string;
  error?: string;
  provider?: string;
}

export class UnifiedEmailService {
  /**
   * Send email using the appropriate service based on account type
   */
  static async sendEmail(emailAccount: IEmailAccount, message: UnifiedEmailMessage): Promise<UnifiedEmailResponse> {
    try {
      // Validate input parameters
      if (!emailAccount) {
        return {
          success: false,
          error: "Email account is required",
          provider: "unknown",
        };
      }

      if (!message || !message.to || !message.subject || !message.body) {
        return {
          success: false,
          error: "Invalid message: to, subject, and body are required",
          provider: emailAccount.oauth?.provider || "smtp",
        };
      }

      logger.info(`Sending email via unified service`, {
        emailAddress: emailAccount.emailAddress,
        provider: emailAccount.oauth?.provider || "smtp",
        subject: message.subject,
        to: message.to,
      });

      if (emailAccount.oauth?.provider === "outlook") {
        // Use Outlook service for Microsoft Graph API
        logger.info(`Using Outlook service for ${emailAccount.emailAddress}`);
        const result = await OutlookEmailService.sendEmail(emailAccount, message as OutlookEmailMessage);
        return {
          ...result,
          provider: "outlook",
        };
      } else if (emailAccount.oauth?.provider === "gmail") {
        // Use Gmail service (SMTP with OAuth2)
        logger.info(`Using Gmail service for ${emailAccount.emailAddress}`);
        return await this.sendGmailEmail(emailAccount, message);
      } else {
        // Use traditional SMTP
        logger.info(`Using SMTP service for ${emailAccount.emailAddress}`);
        return await this.sendSMTPEmail(emailAccount, message);
      }
    } catch (error: any) {
      logger.error("Unified email sending failed:", {
        error: error.message,
        stack: error.stack,
        emailAddress: emailAccount?.emailAddress,
        provider: emailAccount?.oauth?.provider || "smtp",
      });
      return {
        success: false,
        error: error.message,
        provider: emailAccount?.oauth?.provider || "smtp",
      };
    }
  }

  /**
   * Send reply email using the appropriate service
   */
  static async sendReply(
    emailAccount: IEmailAccount,
    originalMessageId: string,
    message: UnifiedEmailMessage
  ): Promise<UnifiedEmailResponse> {
    try {
      if (emailAccount.oauth?.provider === "outlook") {
        // Use Outlook service for replies
        logger.info(`Using Outlook service for reply from ${emailAccount.emailAddress}`);
        const result = await OutlookEmailService.sendReply(
          emailAccount,
          originalMessageId,
          message as OutlookEmailMessage
        );
        return {
          ...result,
          provider: "outlook",
        };
      } else {
        // For Gmail and SMTP, use regular send with threading headers
        logger.info(
          `Using ${emailAccount.oauth?.provider || "SMTP"} service for reply from ${emailAccount.emailAddress}`
        );
        return await this.sendEmail(emailAccount, message);
      }
    } catch (error: any) {
      logger.error("Unified reply sending failed:", error);
      return {
        success: false,
        error: error.message,
        provider: emailAccount.oauth?.provider || "smtp",
      };
    }
  }

  /**
   * Create draft email using the appropriate service
   */
  static async createDraft(emailAccount: IEmailAccount, message: UnifiedEmailMessage): Promise<UnifiedEmailResponse> {
    try {
      if (emailAccount.oauth?.provider === "outlook") {
        // Use Outlook service for drafts
        logger.info(`Using Outlook service for draft from ${emailAccount.emailAddress}`);
        const result = await OutlookEmailService.createDraft(emailAccount, message as OutlookEmailMessage);
        return {
          ...result,
          provider: "outlook",
        };
      } else {
        // For Gmail and SMTP, create draft in database (not actual draft on server)
        logger.info(`Creating draft in database for ${emailAccount.emailAddress}`);
        return await this.createDatabaseDraft(emailAccount, message);
      }
    } catch (error: any) {
      logger.error("Unified draft creation failed:", error);
      return {
        success: false,
        error: error.message,
        provider: emailAccount.oauth?.provider || "smtp",
      };
    }
  }

  /**
   * Send Gmail email using OAuth2 SMTP
   */
  private static async sendGmailEmail(
    emailAccount: IEmailAccount,
    message: UnifiedEmailMessage
  ): Promise<UnifiedEmailResponse> {
    try {
      const transporter = await EmailAccountConfigService.createSMTPTransporter(emailAccount);

      const mailOptions = {
        from: `${emailAccount.displayName || emailAccount.accountName} <${emailAccount.emailAddress}>`,
        to: message.to,
        subject: message.subject,
        text: message.body,
        html: message.htmlBody || message.body,
        cc: message.cc,
        bcc: message.bcc,
        replyTo: message.replyTo,
        inReplyTo: message.inReplyTo,
        references: message.references,
        headers: {
          "Thread-Id": message.threadId,
        },
        attachments: message.attachments,
      };

      const result = await transporter.sendMail(mailOptions);

      return {
        success: true,
        messageId: result.messageId,
        threadId: message.threadId,
        provider: "gmail",
      };
    } catch (error: any) {
      logger.error("Gmail email sending error:", error);
      return {
        success: false,
        error: error.message,
        provider: "gmail",
      };
    }
  }

  /**
   * Send email using traditional SMTP
   */
  private static async sendSMTPEmail(
    emailAccount: IEmailAccount,
    message: UnifiedEmailMessage
  ): Promise<UnifiedEmailResponse> {
    try {
      const transporter = await EmailAccountConfigService.createSMTPTransporter(emailAccount);

      const mailOptions = {
        from: `${emailAccount.displayName || emailAccount.accountName} <${emailAccount.emailAddress}>`,
        to: message.to,
        subject: message.subject,
        text: message.body,
        html: message.htmlBody || message.body,
        cc: message.cc,
        bcc: message.bcc,
        replyTo: message.replyTo,
        inReplyTo: message.inReplyTo,
        references: message.references,
        headers: {
          "Thread-Id": message.threadId,
        },
        attachments: message.attachments,
      };

      const result = await transporter.sendMail(mailOptions);

      return {
        success: true,
        messageId: result.messageId,
        threadId: message.threadId,
        provider: "smtp",
      };
    } catch (error: any) {
      logger.error("SMTP email sending error:", error);
      return {
        success: false,
        error: error.message,
        provider: "smtp",
      };
    }
  }

  /**
   * Create draft in database (for non-Outlook accounts)
   */
  private static async createDatabaseDraft(
    emailAccount: IEmailAccount,
    message: UnifiedEmailMessage
  ): Promise<UnifiedEmailResponse> {
    try {
      // Generate a draft ID
      const draftId = `draft_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      // For now, just return success - actual draft storage would be implemented
      // in the email model and controller
      return {
        success: true,
        messageId: draftId,
        threadId: message.threadId,
        provider: emailAccount.oauth?.provider || "smtp",
      };
    } catch (error: any) {
      logger.error("Database draft creation error:", error);
      return {
        success: false,
        error: error.message,
        provider: emailAccount.oauth?.provider || "smtp",
      };
    }
  }

  /**
   * Get thread information using the appropriate service
   */
  static async getThreadInfo(emailAccount: IEmailAccount, threadId: string): Promise<any> {
    try {
      if (emailAccount.oauth?.provider === "outlook") {
        return await OutlookEmailService.getThreadInfo(emailAccount, threadId);
      } else {
        // For Gmail and other providers, implement thread fetching
        // This would typically query the database for emails with the same threadId
        return {
          success: true,
          threadId,
          messageCount: 0,
          messages: [],
          note: "Thread info available in database for this provider",
        };
      }
    } catch (error: any) {
      logger.error("Error getting thread info:", error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Check if account supports advanced features
   */
  static getAccountCapabilities(emailAccount: IEmailAccount): {
    supportsGraphAPI: boolean;
    supportsDrafts: boolean;
    supportsThreading: boolean;
    provider: string;
  } {
    const provider = emailAccount.oauth?.provider || "smtp";

    return {
      supportsGraphAPI: provider === "outlook",
      supportsDrafts: provider === "outlook",
      supportsThreading: ["outlook", "gmail"].includes(provider),
      provider,
    };
  }
}
