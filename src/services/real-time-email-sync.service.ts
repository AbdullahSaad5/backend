import { google } from "googleapis";
import { EmailAccountModel, IEmailAccount } from "@/models/email-account.model";
import { EmailModel } from "@/models/email.model";
import { GmailThreadModel } from "@/models/gmail-thread.model";
import { OutlookThreadModel } from "@/models/outlook-thread.model";
import { EmailOAuthService } from "@/services/emailOAuth.service";
import { logger } from "@/utils/logger.util";
import { socketManager } from "@/datasources/socket.datasource";
import { Client } from "@microsoft/microsoft-graph-client";
import { getOutlookWebhookUrl } from "@/config/instance-config";

export interface RealTimeSyncResult {
  success: boolean;
  message: string;
  emailsProcessed?: number;
  error?: string;
}

export class RealTimeEmailSyncService {
  /**
   * Setup real-time sync for Gmail accounts
   */
  static async setupGmailRealTimeSync(account: IEmailAccount): Promise<RealTimeSyncResult> {
    try {
      logger.info(`🔄 [Gmail] Setting up real-time sync for: ${account.emailAddress}`);

      if (!account.oauth?.accessToken) {
        throw new Error("No OAuth access token available");
      }

      // Get decrypted access token
      const decryptedAccessToken = EmailOAuthService.decryptData(account.oauth.accessToken);
      const decryptedRefreshToken = account.oauth.refreshToken
        ? EmailOAuthService.decryptData(account.oauth.refreshToken)
        : null;

      if (!decryptedAccessToken || !decryptedRefreshToken) {
        throw new Error("Failed to decrypt OAuth tokens");
      }

      const oauth2Client = new google.auth.OAuth2(
        process.env.GOOGLE_CLIENT_ID,
        process.env.GOOGLE_CLIENT_SECRET,
        process.env.GOOGLE_REDIRECT_URI
      );

      oauth2Client.setCredentials({
        access_token: decryptedAccessToken,
        refresh_token: decryptedRefreshToken,
      });

      const gmail = google.gmail({ version: "v1", auth: oauth2Client });

      // Check if we have a Google Cloud project configured
      const projectId = process.env.GOOGLE_CLOUD_PROJECT;
      if (!projectId) {
        logger.warn(`⚠️ [Gmail] GOOGLE_CLOUD_PROJECT not set, using polling fallback for: ${account.emailAddress}`);
        return this.setupGmailPollingFallback(account);
      }

      // Setup Gmail watch with Google Cloud Pub/Sub
      // Use a consistent topic name for the project
      const topicName = `projects/${projectId}/topics/gmail-sync-notifications`;

      logger.info(`📧 [Gmail] Setting up watch with topic: ${topicName} for: ${account.emailAddress}`);

      const watchResponse = await gmail.users.watch({
        userId: "me",
        requestBody: {
          topicName: topicName,
          labelIds: ["INBOX", "SENT", "DRAFT"],
          labelFilterAction: "include",
        },
      });

      // Update account sync state
      const expirationTime = watchResponse.data.expiration
        ? new Date(parseInt(watchResponse.data.expiration))
        : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days default

      await EmailAccountModel.findByIdAndUpdate(account._id, {
        $set: {
          "syncState.watchExpiration": expirationTime,
          "syncState.lastWatchRenewal": new Date(),
          "syncState.isWatching": true,
          "syncState.syncStatus": "watching",
        },
      });

      logger.info(`✅ [Gmail] Real-time sync setup completed for: ${account.emailAddress}`);
      logger.info(`📅 [Gmail] Watch expires: ${expirationTime.toISOString()}`);

      return {
        success: true,
        message: "Gmail real-time sync setup completed",
      };
    } catch (error: any) {
      logger.error(`❌ [Gmail] Failed to setup real-time sync for ${account.emailAddress}:`, error);

      // Fallback to polling
      return this.setupGmailPollingFallback(account);
    }
  }

  /**
   * Get the latest historyId for an account
   */
  private static async getLatestHistoryId(account: IEmailAccount, gmail: any): Promise<string | null> {
    try {
      // Get the latest message to extract historyId
      const response = await gmail.users.messages.list({
        userId: "me",
        maxResults: 1,
        q: "is:unread OR is:important",
      });

      if (response.data.messages && response.data.messages.length > 0) {
        const latestMessage = await gmail.users.messages.get({
          userId: "me",
          id: response.data.messages[0].id,
          format: "minimal",
        });

        // The historyId is available in the response headers
        const historyId = latestMessage.data.historyId;
        if (historyId) {
          logger.info(`📧 [Gmail] Latest historyId for ${account.emailAddress}: ${historyId}`);
          return historyId;
        }
      }

      return null;
    } catch (error: any) {
      logger.error(`❌ [Gmail] Failed to get latest historyId for ${account.emailAddress}:`, error);
      return null;
    }
  }

  /**
   * Setup Gmail polling fallback when watch is not available
   */
  private static async setupGmailPollingFallback(account: IEmailAccount): Promise<RealTimeSyncResult> {
    try {
      logger.info(`🔄 [Gmail] Setting up polling fallback for: ${account.emailAddress}`);

      // Get decrypted access token
      const decryptedAccessToken = EmailOAuthService.decryptData(account.oauth!.accessToken!);
      const decryptedRefreshToken = account.oauth!.refreshToken
        ? EmailOAuthService.decryptData(account.oauth!.refreshToken)
        : null;

      const oauth2Client = new google.auth.OAuth2(
        process.env.GOOGLE_CLIENT_ID,
        process.env.GOOGLE_CLIENT_SECRET,
        process.env.GOOGLE_REDIRECT_URI
      );

      oauth2Client.setCredentials({
        access_token: decryptedAccessToken,
        refresh_token: decryptedRefreshToken,
      });

      const gmail = google.gmail({ version: "v1", auth: oauth2Client });

      await EmailAccountModel.findByIdAndUpdate(account._id, {
        $set: {
          "syncState.syncStatus": "polling",
          "syncState.lastSyncAt": new Date(),
          "syncState.isWatching": false,
        },
      });

      // Schedule periodic sync every 5 minutes
      setInterval(
        async () => {
          try {
            // Get latest historyId for incremental sync
            const latestHistoryId = await this.getLatestHistoryId(account, gmail);
            await this.syncGmailEmails(account, latestHistoryId || undefined);
          } catch (error) {
            logger.error(`❌ [Gmail] Polling sync failed for ${account.emailAddress}:`, error);
          }
        },
        5 * 60 * 1000
      ); // 5 minutes

      return {
        success: true,
        message: "Gmail polling fallback setup completed",
      };
    } catch (error: any) {
      logger.error(`❌ [Gmail] Failed to setup polling fallback for ${account.emailAddress}:`, error);
      return {
        success: false,
        message: "Failed to setup polling fallback",
        error: error.message,
      };
    }
  }

  /**
   * Setup real-time sync for Outlook accounts
   */
  static async setupOutlookRealTimeSync(account: IEmailAccount): Promise<RealTimeSyncResult> {
    try {
      logger.info(`🔄 [Outlook] Setting up real-time sync for: ${account.emailAddress}`);

      if (!account.oauth?.accessToken) {
        throw new Error("No OAuth access token available");
      }

      // Get decrypted access token
      const decryptedAccessToken = EmailOAuthService.decryptData(account.oauth.accessToken);

      // Create Microsoft Graph client with proper authentication
      const graphClient = Client.init({
        authProvider: (done) => {
          // Microsoft Graph accepts opaque access tokens (not JWT format)
          // This is normal behavior for Microsoft Graph API
          done(null, decryptedAccessToken);
        },
      });

      // Setup Outlook webhook subscription using instance-based configuration
      const webhookUrl = getOutlookWebhookUrl();
      if (webhookUrl) {
        logger.info(`📧 [Outlook] Using webhook URL: ${webhookUrl} for: ${account.emailAddress}`);
        return this.setupOutlookWebhook(account, graphClient, webhookUrl);
      } else {
        logger.warn(
          `⚠️ [Outlook] No webhook URL configured for instance, using polling fallback for: ${account.emailAddress}`
        );
        // Fallback to polling
        return this.setupOutlookPollingFallback(account);
      }
    } catch (error: any) {
      logger.error(`❌ [Outlook] Failed to setup real-time sync for ${account.emailAddress}:`, error);
      return this.setupOutlookPollingFallback(account);
    }
  }

  /**
   * Setup Outlook webhook subscription
   */
  private static async setupOutlookWebhook(
    account: IEmailAccount,
    graphClient: Client,
    webhookUrl: string
  ): Promise<RealTimeSyncResult> {
    try {
      // Create webhook subscription for new emails
      const subscription = await graphClient.api("/subscriptions").post({
        changeType: "created,updated",
        notificationUrl: `${webhookUrl}/${account._id}`,
        resource: "/me/messages",
        expirationDateTime: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000), // 3 days
        clientState: account._id,
      });

      // Update account sync state
      await EmailAccountModel.findByIdAndUpdate(account._id, {
        $set: {
          "syncState.syncStatus": "webhook",
          "syncState.lastWatchRenewal": new Date(),
          "syncState.isWatching": true,
          "syncState.webhookId": subscription.id,
        },
      });

      logger.info(`✅ [Outlook] Webhook subscription created for: ${account.emailAddress}`);

      return {
        success: true,
        message: "Outlook webhook subscription setup completed",
      };
    } catch (error: any) {
      logger.error(`❌ [Outlook] Webhook setup failed for ${account.emailAddress}:`, error);
      return this.setupOutlookPollingFallback(account);
    }
  }

  /**
   * Setup Outlook polling fallback
   */
  private static async setupOutlookPollingFallback(account: IEmailAccount): Promise<RealTimeSyncResult> {
    try {
      logger.info(`🔄 [Outlook] Setting up polling fallback for: ${account.emailAddress}`);

      await EmailAccountModel.findByIdAndUpdate(account._id, {
        $set: {
          "syncState.syncStatus": "polling",
          "syncState.lastSyncAt": new Date(),
          "syncState.isWatching": false,
        },
      });

      // Schedule periodic sync every 5 minutes
      setInterval(
        async () => {
          try {
            await this.syncOutlookEmails(account);
          } catch (error) {
            logger.error(`❌ [Outlook] Polling sync failed for ${account.emailAddress}:`, error);
          }
        },
        5 * 60 * 1000
      ); // 5 minutes

      return {
        success: true,
        message: "Outlook polling fallback setup completed",
      };
    } catch (error: any) {
      logger.error(`❌ [Outlook] Failed to setup polling fallback for ${account.emailAddress}:`, error);
      return {
        success: false,
        message: "Failed to setup polling fallback",
        error: error.message,
      };
    }
  }

  /**
   * Sync Gmail emails and store in database
   */
  static async syncGmailEmails(account: IEmailAccount, historyId?: string): Promise<RealTimeSyncResult> {
    try {
      logger.info(
        `🔄 [Gmail] Syncing emails for: ${account.emailAddress}${historyId ? ` with historyId: ${historyId}` : ""}`
      );

      // Get decrypted access token
      const decryptedAccessToken = EmailOAuthService.decryptData(account.oauth!.accessToken!);
      const decryptedRefreshToken = account.oauth!.refreshToken
        ? EmailOAuthService.decryptData(account.oauth!.refreshToken)
        : null;

      const oauth2Client = new google.auth.OAuth2(
        process.env.GOOGLE_CLIENT_ID,
        process.env.GOOGLE_CLIENT_SECRET,
        process.env.GOOGLE_REDIRECT_URI
      );

      oauth2Client.setCredentials({
        access_token: decryptedAccessToken,
        refresh_token: decryptedRefreshToken,
      });

      const gmail = google.gmail({ version: "v1", auth: oauth2Client });

      let messages: any[] = [];

      if (historyId) {
        // Use historyId to get specific changes (webhook flow)
        logger.info(`📧 [Gmail] Fetching changes since historyId: ${historyId}`);

        try {
          const historyResponse = await gmail.users.history.list({
            userId: "me",
            startHistoryId: historyId,
            historyTypes: ["messageAdded"],
          });

          const history = historyResponse.data;
          if (history.history && history.history.length > 0) {
            // Extract message IDs from history
            const messageIds = history.history
              .flatMap((h) => h.messagesAdded || [])
              .map((m) => m.message?.id)
              .filter(Boolean);

            logger.info(`📧 [Gmail] Found ${messageIds.length} new messages in history`);

            // Get full message details for each new message
            for (const messageId of messageIds) {
              try {
                const messageDetails = await gmail.users.messages.get({
                  userId: "me",
                  id: messageId!,
                  format: "full",
                });
                messages.push(messageDetails.data);
              } catch (messageError: any) {
                logger.error(`❌ [Gmail] Failed to fetch message ${messageId}:`, messageError);
              }
            }
          }
        } catch (historyError: any) {
          logger.error(`❌ [Gmail] Failed to fetch history:`, historyError);
          // Fallback to recent messages if history fails
          const messagesResponse = await gmail.users.messages.list({
            userId: "me",
            maxResults: 10,
            q: "is:unread OR is:important",
          });
          messages = messagesResponse.data.messages || [];
        }
      } else {
        // Fallback: Get recent messages (polling flow)
        logger.info(`📧 [Gmail] Fetching recent messages (polling mode)`);
        const messagesResponse = await gmail.users.messages.list({
          userId: "me",
          maxResults: 50,
          q: "is:unread OR is:important",
        });
        messages = messagesResponse.data.messages || [];
      }

      let emailsProcessed = 0;

      for (const message of messages) {
        try {
          // Check if email already exists
          const existingEmail = await EmailModel.findOne({
            messageId: message.id,
            accountId: account._id,
          });

          if (existingEmail) {
            continue; // Skip if already processed
          }

          // Message data is already fetched in history flow
          const messageData = message;
          const headers = messageData.payload?.headers || [];

          // Extract email data and determine threadId
          let threadId = messageData.threadId;

          // If Gmail doesn't provide threadId, generate one based on subject and participants
          if (!threadId) {
            const subject = this.extractHeader(headers, "Subject") || "No Subject";
            const from = this.extractHeader(headers, "From") || "";
            const to = this.extractHeader(headers, "To") || "";

            // Create a hash-based threadId for emails without Gmail threadId
            const threadKey = `${subject.toLowerCase().trim()}_${from}_${to}`;
            threadId = `generated_${Buffer.from(threadKey).toString("base64").substring(0, 16)}`;

            logger.info(`🔄 [Gmail] Generated threadId: ${threadId} for message: ${message.id}`);
          }

          const emailData = {
            messageId: message.id,
            threadId: threadId,
            accountId: account._id,
            direction: "inbound",
            type: "general",
            status: "received",
            priority: "normal",
            subject: this.extractHeader(headers, "Subject") || "No Subject",
            textContent: this.extractTextContent(messageData.payload),
            htmlContent: this.extractHtmlContent(messageData.payload),
            from: {
              email: this.extractHeader(headers, "From") || "",
              name: this.extractNameFromHeader(this.extractHeader(headers, "From") || ""),
            },
            to: this.extractRecipients(headers, "To"),
            cc: this.extractRecipients(headers, "Cc"),
            bcc: this.extractRecipients(headers, "Bcc"),
            receivedAt: new Date(parseInt(messageData.internalDate || Date.now().toString())),
            isRead: !messageData.labelIds?.includes("UNREAD"),
            isReplied: messageData.labelIds?.includes("REPLIED") || false,
            isForwarded: messageData.labelIds?.includes("FORWARDED") || false,
            isArchived: messageData.labelIds?.includes("ARCHIVED") || false,
            isSpam: messageData.labelIds?.includes("SPAM") || false,
            isStarred: messageData.labelIds?.includes("STARRED") || false,
            folder: "INBOX",
            category: "primary",
          };

          // Ensure we have a valid threadId before proceeding
          if (!emailData.threadId) {
            logger.warn(`⚠️ [Gmail] Skipping email ${emailData.messageId} - no threadId available`);
            continue;
          }

          // Save email to database
          const savedEmail = await EmailModel.create(emailData);
          emailsProcessed++;

          // Create or update Gmail thread
          try {
            const existingThread = await GmailThreadModel.findOne({
              threadId: savedEmail.threadId,
              accountId: account._id,
            });

            if (existingThread) {
              // Update existing thread
              await GmailThreadModel.findByIdAndUpdate(existingThread._id, {
                $inc: {
                  messageCount: 1,
                  unreadCount: savedEmail.isRead ? 0 : 1,
                },
                $set: {
                  lastMessageAt: savedEmail.receivedAt,
                  lastActivity: savedEmail.receivedAt,
                  latestEmailFrom: {
                    email: savedEmail.from.email,
                    name: savedEmail.from.name,
                  },
                  latestEmailTo: savedEmail.to.map((recipient: { email: string; name?: string }) => ({
                    email: recipient.email,
                    name: recipient.name,
                  })),
                  latestEmailPreview: savedEmail.textContent?.substring(0, 100) || "",
                  updatedAt: new Date(),
                },
                $push: {
                  "rawGmailData.messageIds": savedEmail.messageId,
                },
              });
              logger.info(`📧 [Gmail] Updated thread: ${savedEmail.threadId}`);
            } else {
              // Create new thread
              const threadData = {
                threadId: savedEmail.threadId,
                accountId: account._id,
                subject: savedEmail.subject,
                normalizedSubject: savedEmail.subject.toLowerCase().trim(),
                messageCount: 1,
                unreadCount: savedEmail.isRead ? 0 : 1,
                isStarred: savedEmail.isStarred || false,
                hasAttachments: false, // Will be updated when we fetch full message details
                firstMessageAt: savedEmail.receivedAt,
                lastMessageAt: savedEmail.receivedAt,
                lastActivity: savedEmail.receivedAt,
                status: "active",
                folder: savedEmail.folder,
                category: savedEmail.category,
                threadType: "conversation",
                isPinned: false,
                totalSize: 0,
                participants: [
                  { email: savedEmail.from.email, name: savedEmail.from.name },
                  ...savedEmail.to.map((recipient: { email: string; name?: string }) => ({
                    email: recipient.email,
                    name: recipient.name,
                  })),
                ],
                latestEmailFrom: {
                  email: savedEmail.from.email,
                  name: savedEmail.from.name,
                },
                latestEmailTo: savedEmail.to.map((recipient: { email: string; name?: string }) => ({
                  email: recipient.email,
                  name: recipient.name,
                })),
                latestEmailPreview: savedEmail.textContent?.substring(0, 100) || "",
                rawGmailData: {
                  threadId: savedEmail.threadId,
                  messageIds: [savedEmail.messageId],
                  messageCount: 1,
                  labelIds: savedEmail.isRead ? [] : ["UNREAD"],
                },
              };

              await GmailThreadModel.create(threadData);
              logger.info(`📧 [Gmail] Created new thread: ${savedEmail.threadId}`);
            }
          } catch (threadError: any) {
            logger.error(`❌ [Gmail] Failed to create/update thread for ${savedEmail.threadId}:`, threadError);
          }

          // Emit real-time notification
          socketManager.emitNewEmail(account.emailAddress, {
            emailId: savedEmail._id,
            messageId: savedEmail.messageId,
            subject: savedEmail.subject,
            from: savedEmail.from,
            receivedAt: savedEmail.receivedAt,
            isRead: savedEmail.isRead,
            threadId: savedEmail.threadId,
          });

          logger.info(`📧 [Gmail] Saved email: ${savedEmail.subject} for ${account.emailAddress}`);
        } catch (messageError: any) {
          logger.error(`❌ [Gmail] Failed to process message ${message.id || "unknown"}:`, messageError);
        }
      }

      // Update account sync state
      await EmailAccountModel.findByIdAndUpdate(account._id, {
        $set: {
          "syncState.lastSyncAt": new Date(),
          "stats.lastSyncAt": new Date(),
        },
      });

      logger.info(`✅ [Gmail] Sync completed for ${account.emailAddress}: ${emailsProcessed} emails processed`);

      return {
        success: true,
        message: `Gmail sync completed: ${emailsProcessed} emails processed`,
        emailsProcessed,
      };
    } catch (error: any) {
      logger.error(`❌ [Gmail] Sync failed for ${account.emailAddress}:`, error);
      return {
        success: false,
        message: "Gmail sync failed",
        error: error.message,
      };
    }
  }

  /**
   * Sync Outlook emails and store in database
   */
  static async syncOutlookEmails(account: IEmailAccount): Promise<RealTimeSyncResult> {
    try {
      logger.info(`🔄 [Outlook] Syncing emails for: ${account.emailAddress}`);

      // Get decrypted access token
      const decryptedAccessToken = EmailOAuthService.decryptData(account.oauth!.accessToken!);

      // Create Microsoft Graph client with proper authentication
      const graphClient = Client.init({
        authProvider: (done) => {
          // Microsoft Graph accepts opaque access tokens (not JWT format)
          // This is normal behavior for Microsoft Graph API
          done(null, decryptedAccessToken);
        },
      });

      // Get recent messages
      const messagesResponse = await graphClient
        .api("/me/messages")
        .top(50)
        .orderby("receivedDateTime desc")
        .select(
          "id,conversationId,subject,from,toRecipients,ccRecipients,bccRecipients,receivedDateTime,sentDateTime,isRead,body,bodyPreview,hasAttachments"
        )
        .get();

      const messages = messagesResponse.value || [];
      let emailsProcessed = 0;

      for (const message of messages) {
        try {
          // Check if email already exists
          const existingEmail = await EmailModel.findOne({
            messageId: message.id,
            accountId: account._id,
          });

          if (existingEmail) {
            continue; // Skip if already processed
          }

          // Extract email data and ensure threadId
          let threadId = message.conversationId;

          // If Outlook doesn't provide conversationId, generate one based on subject and participants
          if (!threadId) {
            const subject = message.subject || "No Subject";
            const from = message.from?.emailAddress?.address || "";
            const to = (message.toRecipients || []).map((r: any) => r.emailAddress?.address).join(",");

            // Create a hash-based threadId for emails without conversationId
            const threadKey = `${subject.toLowerCase().trim()}_${from}_${to}`;
            threadId = `generated_${Buffer.from(threadKey).toString("base64").substring(0, 16)}`;

            logger.info(`🔄 [Outlook] Generated threadId: ${threadId} for message: ${message.id}`);
          }

          const emailData = {
            messageId: message.id,
            threadId: threadId,
            accountId: account._id,
            direction: "inbound",
            type: "general",
            status: "received",
            priority: "normal",
            subject: message.subject || "No Subject",
            textContent: message.body?.contentType === "text" ? message.body.content : "",
            htmlContent: message.body?.contentType === "html" ? message.body.content : "",
            from: {
              email: message.from?.emailAddress?.address || "",
              name: message.from?.emailAddress?.name || "",
            },
            to: (message.toRecipients || []).map((recipient: any) => ({
              email: recipient.emailAddress?.address || "",
              name: recipient.emailAddress?.name || "",
            })),
            cc: (message.ccRecipients || []).map((recipient: any) => ({
              email: recipient.emailAddress?.address || "",
              name: recipient.emailAddress?.address || "",
            })),
            bcc: (message.bccRecipients || []).map((recipient: any) => ({
              email: recipient.emailAddress?.address || "",
              name: recipient.emailAddress?.address || "",
            })),
            receivedAt: new Date(message.receivedDateTime),
            sentAt: message.sentDateTime ? new Date(message.sentDateTime) : undefined,
            isRead: message.isRead || false,
            isReplied: false,
            isForwarded: false,
            isArchived: false,
            isSpam: false,
            isStarred: false,
            folder: "INBOX",
            category: "primary",
          };

          // Save email to database
          const savedEmail = await EmailModel.create(emailData);
          emailsProcessed++;

          // Create or update Outlook thread
          try {
            const existingThread = await OutlookThreadModel.findOne({
              conversationId: savedEmail.threadId,
              accountId: account._id,
            });

            if (existingThread) {
              // Update existing thread
              await OutlookThreadModel.findByIdAndUpdate(existingThread._id, {
                $inc: {
                  messageCount: 1,
                  unreadCount: savedEmail.isRead ? 0 : 1,
                },
                $set: {
                  lastMessageAt: savedEmail.receivedAt,
                  lastActivity: savedEmail.receivedAt,
                  latestEmailFrom: {
                    email: savedEmail.from.email,
                    name: savedEmail.from.name,
                  },
                  latestEmailTo: savedEmail.to.map((recipient: { email: string; name?: string }) => ({
                    email: recipient.email,
                    name: recipient.name,
                  })),
                  latestEmailPreview: savedEmail.textContent?.substring(0, 100) || "",
                  updatedAt: new Date(),
                },
                $push: {
                  "rawOutlookData.messageIds": savedEmail.messageId,
                },
              });
              logger.info(`📧 [Outlook] Updated thread: ${savedEmail.threadId}`);
            } else {
              // Create new thread
              const threadData = {
                conversationId: savedEmail.threadId,
                accountId: account._id,
                subject: savedEmail.subject,
                normalizedSubject: savedEmail.subject.toLowerCase().trim(),
                messageCount: 1,
                unreadCount: savedEmail.isRead ? 0 : 1,
                isStarred: savedEmail.isStarred || false,
                hasAttachments: false,
                firstMessageAt: savedEmail.receivedAt,
                lastMessageAt: savedEmail.receivedAt,
                lastActivity: savedEmail.receivedAt,
                status: "active",
                folder: savedEmail.folder,
                category: savedEmail.category,
                threadType: "conversation",
                isPinned: false,
                totalSize: 0,
                participants: [
                  { email: savedEmail.from.email, name: savedEmail.from.name },
                  ...savedEmail.to.map((recipient: { email: string; name?: string }) => ({
                    email: recipient.email,
                    name: recipient.name,
                  })),
                ],
                latestEmailFrom: {
                  email: savedEmail.from.email,
                  name: savedEmail.from.name,
                },
                latestEmailTo: savedEmail.to.map((recipient: { email: string; name?: string }) => ({
                  email: recipient.email,
                  name: recipient.name,
                })),
                latestEmailPreview: savedEmail.textContent?.substring(0, 100) || "",
                rawOutlookData: {
                  conversationId: savedEmail.threadId,
                  messageIds: [savedEmail.messageId],
                  messageCount: 1,
                  lastMessageId: savedEmail.messageId,
                },
              };

              await OutlookThreadModel.create(threadData);
              logger.info(`📧 [Outlook] Created new thread: ${savedEmail.threadId}`);
            }
          } catch (threadError: any) {
            logger.error(`❌ [Outlook] Failed to create/update thread for ${savedEmail.threadId}:`, threadError);
          }

          // Emit real-time notification
          socketManager.emitNewEmail(account.emailAddress, {
            emailId: savedEmail._id,
            messageId: savedEmail.messageId,
            subject: savedEmail.subject,
            from: savedEmail.from,
            receivedAt: savedEmail.receivedAt,
            isRead: savedEmail.isRead,
            threadId: savedEmail.threadId,
          });

          logger.info(`📧 [Outlook] Saved email: ${savedEmail.subject} for ${account.emailAddress}`);
        } catch (messageError: any) {
          logger.error(`❌ [Outlook] Failed to process message ${message.id}:`, messageError);
        }
      }

      // Update account sync state
      await EmailAccountModel.findByIdAndUpdate(account._id, {
        $set: {
          "syncState.lastSyncAt": new Date(),
          "stats.lastSyncAt": new Date(),
        },
      });

      logger.info(`✅ [Outlook] Sync completed for ${account.emailAddress}: ${emailsProcessed} emails processed`);

      return {
        success: true,
        message: `Outlook sync completed: ${emailsProcessed} emails processed`,
        emailsProcessed,
      };
    } catch (error: any) {
      logger.error(`❌ [Outlook] Sync failed for ${account.emailAddress}:`, error);
      return {
        success: false,
        message: "Outlook sync failed",
        error: error.message,
      };
    }
  }

  /**
   * Renew all real-time sync subscriptions
   */
  static async renewAllSubscriptions(): Promise<void> {
    try {
      logger.info("🔄 Renewing all real-time sync subscriptions...");

      const accounts = await EmailAccountModel.find({
        isActive: true,
        "syncState.isWatching": true,
      });

      for (const account of accounts) {
        try {
          if (account.accountType === "gmail") {
            await this.setupGmailRealTimeSync(account);
          } else if (account.accountType === "outlook") {
            await this.setupOutlookRealTimeSync(account);
          }
        } catch (error: any) {
          logger.error(`❌ Failed to renew subscription for ${account.emailAddress}:`, error);
        }
      }

      logger.info("✅ All subscriptions renewed");
    } catch (error: any) {
      logger.error("❌ Failed to renew subscriptions:", error);
    }
  }

  // Helper methods
  private static extractHeader(headers: any[], name: string): string | undefined {
    const header = headers.find((h) => h.name.toLowerCase() === name.toLowerCase());
    return header?.value;
  }

  private static extractNameFromHeader(header: string): string | undefined {
    const match = header.match(/"?([^"<]+)"?\s*<?[^>]*>?/);
    return match?.[1]?.trim();
  }

  private static extractRecipients(headers: any[], type: string): Array<{ email: string; name?: string }> {
    const headerValue = this.extractHeader(headers, type);
    if (!headerValue) return [];

    return headerValue.split(",").map((recipient) => {
      const match = recipient.match(/"?([^"<]+)"?\s*<?([^>]*)>?/);
      return {
        email: match?.[2] || match?.[1] || recipient.trim(),
        name: match?.[1] || undefined,
      };
    });
  }

  private static extractTextContent(payload: any): string {
    if (payload.body?.data) {
      return Buffer.from(payload.body.data, "base64").toString();
    }

    if (payload.parts) {
      for (const part of payload.parts) {
        if (part.mimeType === "text/plain" && part.body?.data) {
          return Buffer.from(part.body.data, "base64").toString();
        }
      }
    }

    return "";
  }

  private static extractHtmlContent(payload: any): string {
    if (payload.parts) {
      for (const part of payload.parts) {
        if (part.mimeType === "text/html" && part.body?.data) {
          return Buffer.from(part.body.data, "base64").toString();
        }
      }
    }

    return "";
  }
}
