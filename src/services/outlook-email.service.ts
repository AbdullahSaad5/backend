import { Client } from "@microsoft/microsoft-graph-client";
import { IEmailAccount } from "@/models/email-account.model";
import { EmailOAuthService } from "./emailOAuth.service";
import { logger } from "@/utils/logger.util";

export interface OutlookEmailMessage {
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

export interface OutlookEmailResponse {
  success: boolean;
  messageId?: string;
  threadId?: string;
  error?: string;
}

export class OutlookEmailService {
  /**
   * Send email using Microsoft Graph API
   */
  static async sendEmail(emailAccount: IEmailAccount, message: OutlookEmailMessage): Promise<OutlookEmailResponse> {
    try {
      logger.info(`Sending Outlook email from ${emailAccount.emailAddress}`);

      // Validate required fields
      if (!message.to || !message.subject || !message.body) {
        return {
          success: false,
          error: "Missing required fields: to, subject, and body are required",
        };
      }

      // Get access token
      const accessToken = await this.getAccessToken(emailAccount);
      if (!accessToken) {
        throw new Error("Failed to get Outlook access token");
      }

      // Create Microsoft Graph client
      const graphClient = Client.init({
        authProvider: (done) => {
          done(null, accessToken);
        },
      });

      // Prepare email data for Microsoft Graph
      const emailData = this.prepareEmailData(message, emailAccount);

      logger.info(`Prepared email data for Outlook`, {
        emailAddress: emailAccount.emailAddress,
        subject: message.subject,
        to: message.to,
        hasHtml: !!message.htmlBody,
        hasAttachments: !!(message.attachments && message.attachments.length > 0),
      });

      // Send email via Microsoft Graph
      const response = await graphClient.api("/me/sendMail").post({
        message: emailData,
        saveToSentItems: true,
      });

      // Generate a unique message ID since sendMail doesn't return one
      const messageId = this.generateMessageId();

      logger.info(`Outlook email sent successfully: ${messageId}`, {
        emailAddress: emailAccount.emailAddress,
        subject: message.subject,
        to: message.to,
        responseStatus: response ? "success" : "no-response",
        responseData: response,
      });

      return {
        success: true,
        messageId,
        threadId: message.threadId || emailData.conversationId,
      };
    } catch (error: any) {
      logger.error("Outlook email sending failed:", {
        error: error.message,
        stack: error.stack,
        emailAddress: emailAccount.emailAddress,
        subject: message.subject,
        to: message.to,
      });
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Send reply email using Microsoft Graph API
   */
  static async sendReply(
    emailAccount: IEmailAccount,
    originalMessageId: string,
    message: OutlookEmailMessage
  ): Promise<OutlookEmailResponse> {
    try {
      logger.info(`Sending Outlook reply from ${emailAccount.emailAddress}`);

      // Get access token
      const accessToken = await this.getAccessToken(emailAccount);
      if (!accessToken) {
        throw new Error("Failed to get Outlook access token");
      }

      // Create Microsoft Graph client
      const graphClient = Client.init({
        authProvider: (done) => {
          done(null, accessToken);
        },
      });

      // Get original message to extract threading information
      const originalMessage = await graphClient.api(`/me/messages/${originalMessageId}`).get();

      // Prepare reply data with proper threading headers
      const replyData = this.prepareReplyData(message, originalMessage, emailAccount);

      // Send reply via Microsoft Graph
      const response = await graphClient.api("/me/sendMail").post({
        message: replyData,
        saveToSentItems: true,
      });

      // Generate a unique message ID since sendMail doesn't return one
      const messageId = this.generateMessageId();

      logger.info(`Outlook reply sent successfully: ${messageId}`, {
        emailAddress: emailAccount.emailAddress,
        subject: message.subject,
        to: message.to,
        originalMessageId,
        conversationId: originalMessage.conversationId,
        responseStatus: response ? "success" : "no-response",
        responseData: response,
      });

      return {
        success: true,
        messageId,
        threadId: originalMessage.conversationId,
      };
    } catch (error: any) {
      logger.error("Outlook reply sending failed:", error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Create draft email using Microsoft Graph API
   */
  static async createDraft(emailAccount: IEmailAccount, message: OutlookEmailMessage): Promise<OutlookEmailResponse> {
    try {
      logger.info(`Creating Outlook draft from ${emailAccount.emailAddress}`);

      // Get access token
      const accessToken = await this.getAccessToken(emailAccount);
      if (!accessToken) {
        throw new Error("Failed to get Outlook access token");
      }

      // Create Microsoft Graph client
      const graphClient = Client.init({
        authProvider: (done) => {
          done(null, accessToken);
        },
      });

      // Prepare email data for Microsoft Graph
      const emailData = this.prepareEmailData(message, emailAccount);

      // Create draft via Microsoft Graph
      const response = await graphClient.api("/me/messages").post(emailData);

      logger.info(`Outlook draft created successfully: ${response.id}`);

      return {
        success: true,
        messageId: response.id,
        threadId: message.threadId || response.conversationId,
      };
    } catch (error: any) {
      logger.error("Outlook draft creation failed:", error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Get access token for Outlook account with proper validation
   */
  private static async getAccessToken(emailAccount: IEmailAccount): Promise<string | null> {
    try {
      // Validate OAuth configuration
      if (!emailAccount.oauth?.accessToken || !emailAccount.oauth?.refreshToken) {
        throw new Error("OAuth configuration missing for Outlook account");
      }

      // Check if current access token is still valid
      if (emailAccount.oauth.tokenExpiry) {
        const now = new Date();
        const expiry = new Date(emailAccount.oauth.tokenExpiry);
        const bufferTime = 5 * 60 * 1000; // 5 minutes buffer

        if (now.getTime() < expiry.getTime() - bufferTime) {
          // Token is still valid with buffer time, decrypt and return
          const decryptedToken = EmailOAuthService.getDecryptedAccessToken(emailAccount);

          // Validate the decrypted token
          if (!decryptedToken || decryptedToken.trim().length === 0) {
            logger.warn("Decrypted access token is empty, attempting refresh", {
              emailAddress: emailAccount.emailAddress,
              hasAccessToken: !!emailAccount.oauth.accessToken,
              tokenExpiry: emailAccount.oauth.tokenExpiry,
            });
          } else {
            logger.info("Using valid cached access token", {
              emailAddress: emailAccount.emailAddress,
              tokenLength: decryptedToken.length,
              expiresAt: expiry.toISOString(),
            });
            return decryptedToken;
          }
        } else {
          logger.info("Access token expired or expiring soon, refreshing", {
            emailAddress: emailAccount.emailAddress,
            expiresAt: expiry.toISOString(),
            now: now.toISOString(),
          });
        }
      }

      // Token expired, missing, or invalid - refresh it
      logger.info("Refreshing Outlook access token", {
        emailAddress: emailAccount.emailAddress,
        reason: !emailAccount.oauth.tokenExpiry ? "no_expiry" : "expired_or_invalid",
      });

      const refreshResult = await EmailOAuthService.refreshTokens(emailAccount);
      if (!refreshResult.success) {
        throw new Error(`Failed to refresh Outlook tokens: ${refreshResult.error}`);
      }

      // Get the refreshed token from the database
      const { EmailAccountModel } = await import("@/models/email-account.model");
      const refreshedAccount = await EmailAccountModel.findById(emailAccount._id);
      if (!refreshedAccount?.oauth?.accessToken) {
        throw new Error("No access token found after refresh");
      }

      const newDecryptedToken = EmailOAuthService.getDecryptedAccessToken(refreshedAccount);
      if (!newDecryptedToken || newDecryptedToken.trim().length === 0) {
        throw new Error("Decrypted access token is empty after refresh");
      }

      logger.info("Successfully refreshed Outlook access token", {
        emailAddress: emailAccount.emailAddress,
        tokenLength: newDecryptedToken.length,
      });

      return newDecryptedToken;
    } catch (error: any) {
      logger.error("Error getting Outlook access token:", {
        error: error.message,
        emailAddress: emailAccount.emailAddress,
        hasOAuth: !!emailAccount.oauth,
        hasAccessToken: !!emailAccount.oauth?.accessToken,
        hasRefreshToken: !!emailAccount.oauth?.refreshToken,
        tokenExpiry: emailAccount.oauth?.tokenExpiry,
      });
      return null;
    }
  }

  /**
   * Prepare email data for Microsoft Graph API
   */
  private static prepareEmailData(message: OutlookEmailMessage, emailAccount: IEmailAccount): any {
    const recipients = this.parseRecipients(message.to);
    const ccRecipients = message.cc ? this.parseRecipients(message.cc) : [];
    const bccRecipients = message.bcc ? this.parseRecipients(message.bcc) : [];

    const emailData: any = {
      subject: message.subject,
      body: {
        contentType: message.htmlBody ? "HTML" : "Text",
        content: message.htmlBody || message.body,
      },
      toRecipients: recipients,
      from: {
        emailAddress: {
          address: emailAccount.emailAddress,
          name: emailAccount.displayName || emailAccount.accountName,
        },
      },
    };

    if (ccRecipients.length > 0) {
      emailData.ccRecipients = ccRecipients;
    }

    if (bccRecipients.length > 0) {
      emailData.bccRecipients = bccRecipients;
    }

    if (message.replyTo) {
      emailData.replyTo = [
        {
          emailAddress: {
            address: message.replyTo,
          },
        },
      ];
    }

    // Add threading information if available
    if (message.threadId) {
      emailData.conversationId = message.threadId;
    }

    if (message.inReplyTo) {
      emailData.inReplyTo = message.inReplyTo;
    }

    if (message.references && message.references.length > 0) {
      emailData.references = message.references;
    }

    logger.debug(`Prepared Outlook email data:`, {
      subject: emailData.subject,
      bodyType: emailData.body.contentType,
      bodyLength: emailData.body.content?.length || 0,
      toCount: emailData.toRecipients?.length || 0,
      ccCount: emailData.ccRecipients?.length || 0,
      bccCount: emailData.bccRecipients?.length || 0,
      hasThreading: !!(emailData.conversationId || emailData.inReplyTo || emailData.references),
    });

    return emailData;
  }

  /**
   * Prepare reply data with proper threading headers
   */
  private static prepareReplyData(
    message: OutlookEmailMessage,
    originalMessage: any,
    emailAccount: IEmailAccount
  ): any {
    const emailData = this.prepareEmailData(message, emailAccount);

    // Add threading information from original message
    if (originalMessage.conversationId) {
      emailData.conversationId = originalMessage.conversationId;
    }

    if (originalMessage.id) {
      emailData.inReplyTo = originalMessage.id;

      // Build references chain
      const references = [originalMessage.id];
      if (originalMessage.references) {
        references.unshift(...originalMessage.references);
      }
      emailData.references = references;
    }

    // Prepend "Re:" to subject if not already present
    if (!emailData.subject.toLowerCase().startsWith("re:")) {
      emailData.subject = `Re: ${emailData.subject}`;
    }

    return emailData;
  }

  /**
   * Parse recipients into Microsoft Graph format
   */
  private static parseRecipients(recipients: string | string[]): any[] {
    const recipientArray = Array.isArray(recipients) ? recipients : [recipients];

    return recipientArray.map((recipient) => ({
      emailAddress: {
        address: recipient.trim(),
      },
    }));
  }

  /**
   * Get email thread information
   */
  static async getThreadInfo(emailAccount: IEmailAccount, threadId: string): Promise<any> {
    try {
      const accessToken = await this.getAccessToken(emailAccount);
      if (!accessToken) {
        throw new Error("Failed to get Outlook access token");
      }

      const graphClient = Client.init({
        authProvider: (done) => {
          done(null, accessToken);
        },
      });

      // Get messages in the thread
      const response = await graphClient
        .api(`/me/messages?$filter=conversationId eq '${threadId}'&$orderby=receivedDateTime asc`)
        .get();

      return {
        success: true,
        threadId,
        messages: response.value || [],
        messageCount: response.value?.length || 0,
      };
    } catch (error: any) {
      logger.error("Error getting Outlook thread info:", error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Generate a unique message ID for Outlook emails
   * Since sendMail endpoint doesn't return an ID, we generate one
   */
  private static generateMessageId(): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 15);
    return `outlook_msg_${timestamp}_${random}`;
  }
}
