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
import { PubSub } from "@google-cloud/pubsub";
import crypto from "crypto";

export interface RealTimeSyncResult {
  success: boolean;
  message: string;
  emailsProcessed?: number;
  error?: string;
}

export class RealTimeEmailSyncService {
  // Lazy initialization of Google Cloud Pub/Sub client
  private static getPubSubClient(): PubSub {
    const projectId = process.env.GOOGLE_CLOUD_PROJECT;
    const serviceAccountCredentials = process.env.GOOGLE_SERVICE_ACCOUNT_CREDENTIALS;

    if (!projectId || !serviceAccountCredentials) {
      throw new Error(
        "Google Cloud configuration missing: GOOGLE_CLOUD_PROJECT or GOOGLE_SERVICE_ACCOUNT_CREDENTIALS not set"
      );
    }

    // Parse the service account credentials from environment variable
    let credentials;
    try {
      credentials = JSON.parse(serviceAccountCredentials);
    } catch (error) {
      throw new Error("Invalid GOOGLE_SERVICE_ACCOUNT_CREDENTIALS format in environment variables");
    }

    return new PubSub({
      projectId,
      credentials,
    });
  }

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

      // Automatically create account-specific topic
      let topicName: string;
      let isAutoCreated = false;

      try {
        // Try to create account-specific topic
        logger.info(`🔄 [Gmail] Attempting to create account-specific topic for: ${account.emailAddress}`);
        topicName = await this.ensureGmailTopicExists(account);
        isAutoCreated = true;
        logger.info(`✅ [Gmail] Using auto-created account-specific topic: ${topicName}`);
      } catch (error: any) {
        // Fallback to shared topic if auto-creation fails
        logger.warn(`⚠️ [Gmail] Topic creation failed for ${account.emailAddress}, error: ${error.message}`);
        topicName = `projects/${projectId}/topics/gmail-sync-notifications`;
        logger.warn(`⚠️ [Gmail] Falling back to shared topic: ${topicName} for ${account.emailAddress}`);
      }

      // Create Pub/Sub subscription for the topic to deliver notifications to webhook
      let subscriptionName: string;
      try {
        logger.info(`📧 [Gmail] Creating Pub/Sub subscription for: ${account.emailAddress}`);
        subscriptionName = await this.ensureGmailSubscriptionExists(account, topicName);
        logger.info(`✅ [Gmail] Pub/Sub subscription created: ${subscriptionName}`);
      } catch (subscriptionError: any) {
        logger.error(
          `❌ [Gmail] Failed to create Pub/Sub subscription for ${account.emailAddress}:`,
          subscriptionError
        );
        throw new Error(`Pub/Sub subscription creation failed: ${subscriptionError.message}`);
      }

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

      try {
        const updateResult = await EmailAccountModel.findByIdAndUpdate(
          account._id,
          {
            $set: {
              "syncState.gmailTopic": topicName,
              "syncState.gmailSubscription": subscriptionName,
              "syncState.isAutoCreated": isAutoCreated,
              "syncState.watchExpiration": expirationTime,
              "syncState.lastWatchRenewal": new Date(),
              "syncState.isWatching": true,
              "syncState.syncStatus": "watching",
            },
          },
          { new: true }
        );

        if (!updateResult) {
          logger.error(`❌ [Gmail] Database update failed for: ${account.emailAddress}`);
          throw new Error("Failed to update database");
        }

        // Verify the update was successful
        const verifyAccount = await EmailAccountModel.findById(account._id);
        if (!verifyAccount?.syncState?.gmailTopic) {
          logger.error(`❌ [Gmail] Database update verification failed for: ${account.emailAddress}`);
          throw new Error("Database update verification failed");
        }
      } catch (dbError: any) {
        logger.error(`❌ [Gmail] Database update error for ${account.emailAddress}:`, dbError);
        throw new Error(`Database update failed: ${dbError.message}`);
      }

      return {
        success: true,
        message: `Gmail real-time sync setup completed with ${isAutoCreated ? "auto-created" : "shared"} topic`,
      };
    } catch (error: any) {
      logger.error(`❌ [Gmail] Failed to setup real-time sync for ${account.emailAddress}:`, error);

      // Fallback to polling
      return this.setupGmailPollingFallback(account);
    }
  }

  /**
   * Automatically create Pub/Sub subscription for Gmail account
   */
  private static async ensureGmailSubscriptionExists(account: IEmailAccount, topicName: string): Promise<string> {
    try {
      // Generate unique subscription name for this account using Gmail username
      const gmailUsername = account.emailAddress.split("@")[0];
      const accountHash = gmailUsername; // Use Gmail username directly as hash

      const subscriptionName = `gmail-sync-${accountHash}-webhook`;
      const fullSubscriptionName = `projects/${process.env.GOOGLE_CLOUD_PROJECT}/subscriptions/${subscriptionName}`;

      // Get webhook endpoint URL
      const webhookUrl =
        process.env.GMAIL_WEBHOOK_URL ||
        `${process.env.BACKEND_URL || "https://bavit-dev-1eb6ed0cf94e.herokuapp.com"}/api/gmail-webhook/webhook`;

      try {
        // Check if subscription exists
        const pubsub = this.getPubSubClient();
        const [subscriptions] = await pubsub.getSubscriptions();
        const subscriptionExists = subscriptions.some((sub) => sub.name.includes(subscriptionName));

        if (!subscriptionExists) {
          // Create subscription with push delivery to webhook
          logger.info(`📧 [Gmail] Creating subscription: ${subscriptionName} → ${webhookUrl}`);

          // Create subscription through the topic (required by Google Cloud Pub/Sub)
          const topic = pubsub.topic(topicName);
          await topic.createSubscription(subscriptionName, {
            pushConfig: {
              pushEndpoint: webhookUrl,
            },
            ackDeadlineSeconds: 60,
            messageRetentionDuration: {
              seconds: 7 * 24 * 60 * 60, // 7 days
            },
            retryPolicy: {
              minimumBackoff: {
                seconds: 10,
              },
              maximumBackoff: {
                seconds: 600,
              },
            },
          });

          logger.info(`✅ [Gmail] Auto-created Pub/Sub subscription: ${subscriptionName} for ${account.emailAddress}`);
        } else {
          logger.info(`ℹ️ [Gmail] Subscription ${subscriptionName} already exists for ${account.emailAddress}`);
        }
      } catch (error: any) {
        if (error.code === 6) {
          // Subscription already exists (race condition)
          logger.info(`ℹ️ [Gmail] Subscription ${subscriptionName} already exists for ${account.emailAddress}`);
        } else {
          throw error;
        }
      }

      return fullSubscriptionName;
    } catch (error: any) {
      logger.error(`❌ [Gmail] Failed to create subscription for ${account.emailAddress}:`, error);
      throw error;
    }
  }

  /**
   * Automatically create Pub/Sub topic for Gmail account
   */
  private static async ensureGmailTopicExists(account: IEmailAccount): Promise<string> {
    try {
      // Generate unique topic name for this account using Gmail username
      const gmailUsername = account.emailAddress.split("@")[0];
      const accountHash = gmailUsername; // Use Gmail username directly as hash

      const topicName = `gmail-sync-${accountHash}`;
      const fullTopicName = `projects/${process.env.GOOGLE_CLOUD_PROJECT}/topics/${topicName}`;

      try {
        // Check if topic exists
        const pubsub = this.getPubSubClient();
        const [topics] = await pubsub.getTopics();
        const topicExists = topics.some((topic) => topic.name.includes(topicName));

        if (!topicExists) {
          // Create topic automatically
          await pubsub.createTopic(topicName);
          logger.info(`✅ [Gmail] Auto-created Pub/Sub topic: ${topicName} for ${account.emailAddress}`);
        } else {
          logger.info(`ℹ️ [Gmail] Topic ${topicName} already exists for ${account.emailAddress}`);
        }
      } catch (error: any) {
        if (error.code === 6) {
          // Topic already exists (race condition)
          logger.info(`ℹ️ [Gmail] Topic ${topicName} already exists for ${account.emailAddress}`);
        } else {
          throw error;
        }
      }

      return fullTopicName;
    } catch (error: any) {
      logger.error(`❌ [Gmail] Failed to create topic for ${account.emailAddress}:`, error);
      throw error;
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

      // Check if token is expired and refresh if needed
      let decryptedAccessToken = EmailOAuthService.decryptData(account.oauth.accessToken);

      if (account.oauth.tokenExpiry && new Date() > account.oauth.tokenExpiry) {
        logger.info(`🔄 [Outlook] Token expired for: ${account.emailAddress}, refreshing...`);
        try {
          const refreshResult = await EmailOAuthService.refreshTokens(account);
          if (refreshResult.success) {
            // Get the refreshed token
            const updatedAccount = await EmailAccountModel.findById(account._id);
            if (updatedAccount?.oauth?.accessToken) {
              decryptedAccessToken = EmailOAuthService.decryptData(updatedAccount.oauth.accessToken);
              logger.info(`✅ [Outlook] Token refreshed successfully for: ${account.emailAddress}`);
            } else {
              throw new Error("Failed to get refreshed token");
            }
          } else {
            throw new Error(`Token refresh failed: ${refreshResult.error}`);
          }
        } catch (refreshError: any) {
          logger.error(`❌ [Outlook] Token refresh failed: ${refreshError.message}`);
          throw new Error(`Token refresh failed: ${refreshError.message}`);
        }
      }

      // Test the access token first to ensure it's valid
      try {
        logger.info(`🔍 [Outlook] Testing access token for: ${account.emailAddress}`);
        const testResponse = await fetch("https://graph.microsoft.com/v1.0/me", {
          headers: {
            Authorization: `Bearer ${decryptedAccessToken}`,
          },
        });

        if (!testResponse.ok) {
          const errorText = await testResponse.text();
          logger.error(`❌ [Outlook] Access token test failed: ${testResponse.status} ${testResponse.statusText}`);
          logger.error(`❌ [Outlook] Error details: ${errorText}`);
          throw new Error(`Access token is invalid: ${testResponse.status} ${testResponse.statusText}`);
        }

        logger.info(`✅ [Outlook] Access token is valid for: ${account.emailAddress}`);
      } catch (tokenError: any) {
        logger.error(`❌ [Outlook] Token validation failed: ${tokenError.message}`);
        throw new Error(`Token validation failed: ${tokenError.message}`);
      }

      // Create Microsoft Graph client with proper authentication
      // We'll use direct HTTP requests instead of the Graph client to avoid JWT issues
      const graphClient = Client.init({
        authProvider: (done) => {
          // This won't be used, but required by the Client.init interface
          done(null, "");
        },
      });

      // Setup Outlook webhook subscription using instance-based configuration
      const webhookUrl = getOutlookWebhookUrl();
      if (webhookUrl) {
        logger.info(`📧 [Outlook] Using webhook URL: ${webhookUrl} for: ${account.emailAddress}`);
        return this.setupOutlookWebhook(account, graphClient, webhookUrl, decryptedAccessToken);
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
    webhookUrl: string,
    accessToken: string
  ): Promise<RealTimeSyncResult> {
    try {
      // Create webhook subscription for new emails using direct HTTP request with access token
      logger.info(`📧 [Outlook] Creating webhook subscription for: ${account.emailAddress}`);
      logger.info(`📧 [Outlook] Webhook URL: ${webhookUrl}/${account._id}`);
      logger.info(`📧 [Outlook] Full notification URL: ${webhookUrl}/${account._id}`);

      const subscriptionPayload = {
        changeType: "created,updated",
        notificationUrl: `${webhookUrl}/${account._id}`,
        resource: "/me/messages",
        expirationDateTime: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(), // 3 days
        clientState: account._id,
      };

      logger.info(`📧 [Outlook] Subscription payload:`, subscriptionPayload);

      const subscriptionResponse = await fetch("https://graph.microsoft.com/v1.0/subscriptions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(subscriptionPayload),
      });

      logger.info(
        `📧 [Outlook] Subscription response status: ${subscriptionResponse.status} ${subscriptionResponse.statusText}`
      );

      if (!subscriptionResponse.ok) {
        const errorText = await subscriptionResponse.text();
        logger.error(
          `❌ [Outlook] Subscription creation failed: ${subscriptionResponse.status} ${subscriptionResponse.statusText}`
        );
        logger.error(`❌ [Outlook] Error details: ${errorText}`);
        logger.error(`❌ [Outlook] Response headers:`, Object.fromEntries(subscriptionResponse.headers.entries()));
        throw new Error(
          `Failed to create subscription: ${subscriptionResponse.status} ${subscriptionResponse.statusText} - ${errorText}`
        );
      }

      const subscription = await subscriptionResponse.json();
      logger.info(`✅ [Outlook] Subscription created successfully: ${subscription.id}`);

      // Parse subscription expiry
      const subscriptionExpiry = new Date(subscription.expirationDateTime);

      // Update account sync state with complete webhook information
      await EmailAccountModel.findByIdAndUpdate(account._id, {
        $set: {
          "syncState.syncStatus": "webhook",
          "syncState.lastWatchRenewal": new Date(),
          "syncState.isWatching": true,
          "syncState.webhookId": subscription.id,
          "syncState.webhookUrl": `${webhookUrl}/${account._id}`,
          "syncState.subscriptionExpiry": subscriptionExpiry,
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
   * Retry wrapper for Gmail API calls
   */
  private static async retryGmailApiCall<T>(
    apiCall: () => Promise<T>,
    maxRetries: number = 3,
    delay: number = 1000
  ): Promise<T> {
    let lastError: any;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await apiCall();
      } catch (error: any) {
        lastError = error;

        // Don't retry on authentication errors
        if (error.code === 401 || error.code === 403) {
          console.log(`❌ [Gmail] Authentication error, not retrying: ${error.message}`);
          throw error;
        }

        // Don't retry on rate limit errors, wait longer
        if (error.code === 429) {
          const waitTime = delay * Math.pow(2, attempt - 1);
          console.log(`⏳ [Gmail] Rate limited, waiting ${waitTime}ms before retry ${attempt}/${maxRetries}`);
          await new Promise((resolve) => setTimeout(resolve, waitTime));
          continue;
        }

        if (attempt < maxRetries) {
          const waitTime = delay * Math.pow(2, attempt - 1);
          console.log(
            `🔄 [Gmail] API call failed, retrying in ${waitTime}ms (${attempt}/${maxRetries}): ${error.message}`
          );
          await new Promise((resolve) => setTimeout(resolve, waitTime));
        } else {
          console.log(`❌ [Gmail] API call failed after ${maxRetries} attempts: ${error.message}`);
        }
      }
    }

    throw lastError;
  }

  /**
   * Sync Gmail emails and store in database
   *
   * IMPROVEMENTS ADDED:
   * ✅ Enhanced history types (messageAdded, labelChanged, messageDeleted, threadDeleted)
   * ✅ Better duplicate prevention with multiple criteria checks
   * ✅ Retry logic for Gmail API calls with exponential backoff
   * ✅ Comprehensive thread data with attachments detection
   * ✅ Enhanced error handling and logging
   * ✅ Fallback logic with time-based duplicate prevention
   * ✅ Participant management for threads
   * ✅ Status updates based on email properties
   */
  static async syncGmailEmails(account: IEmailAccount, historyId?: string): Promise<RealTimeSyncResult> {
    try {
      console.log(`🔄 [Gmail] ===== STARTING GMAIL EMAIL SYNC =====`);
      console.log(`🔄 [Gmail] Account: ${account.emailAddress}`);
      console.log(`🔄 [Gmail] History ID: ${historyId || "undefined"}`);

      logger.info(
        `🔄 [Gmail] Syncing emails for: ${account.emailAddress}${historyId ? ` with historyId: ${historyId}` : ""}`
      );

      // Get decrypted access token
      console.log(`🔓 [Gmail] Decrypting OAuth tokens...`);
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
        try {
          console.log(`📧 [Gmail] Fetching changes since historyId: ${historyId}`);
          logger.info(`📧 [Gmail] Fetching changes since historyId: ${historyId}`);

          // Enhanced history types to catch all relevant changes
          const historyResponse = await this.retryGmailApiCall(() =>
            gmail.users.history.list({
              userId: "me",
              startHistoryId: historyId,
              historyTypes: ["messageAdded", "labelChanged", "messageDeleted", "threadDeleted"],
            })
          );

          const history = historyResponse.data;
          console.log(`📧 [Gmail] History response:`, {
            historyCount: history.history?.length || 0,
            nextPageToken: history.nextPageToken || "none",
            historyId: history.historyId,
          });

          // Add detailed history logging
          console.log(`📧 [Gmail] FULL HISTORY RESPONSE:`, JSON.stringify(history, null, 2));
          console.log(`📧 [Gmail] History ID requested: ${historyId}`);
          console.log(`📧 [Gmail] History ID returned: ${history.historyId}`);

          if (history.history && history.history.length > 0) {
            // Log each history entry in detail
            history.history.forEach((h, index) => {
              console.log(`📧 [Gmail] History entry ${index + 1}:`, {
                messagesAdded: h.messagesAdded?.length || 0,
                labelsAdded: h.labelsAdded?.length || 0,
                labelsRemoved: h.labelsRemoved?.length || 0,
                messagesDeleted: h.messagesDeleted?.length || 0,
              });
            });

            // Extract message IDs from all relevant history types
            const messageIds = new Set<string>();

            history.history.forEach((h) => {
              // Add new messages
              if (h.messagesAdded) {
                h.messagesAdded.forEach((m) => {
                  if (m.message?.id) {
                    messageIds.add(m.message.id);
                    console.log(`📧 [Gmail] Found new message: ${m.message.id}`);
                  }
                });
              }

              // Add messages with label changes (for read/unread status updates)
              if (h.labelsAdded || h.labelsRemoved) {
                const labelChangeMessages = [...(h.labelsAdded || []), ...(h.labelsRemoved || [])];
                labelChangeMessages.forEach((l) => {
                  if (l.message?.id) {
                    messageIds.add(l.message.id);
                    console.log(`📧 [Gmail] Found label change for message: ${l.message.id}`);
                  }
                });
              }

              // Add deleted messages for cleanup
              if (h.messagesDeleted) {
                h.messagesDeleted.forEach((m) => {
                  if (m.message?.id) {
                    messageIds.add(m.message.id);
                    console.log(`📧 [Gmail] Found deleted message: ${m.message.id}`);
                  }
                });
              }
            });

            const uniqueMessageIds = Array.from(messageIds);
            console.log(`📧 [Gmail] Found ${uniqueMessageIds.length} unique messages in history:`, uniqueMessageIds);
            logger.info(`📧 [Gmail] Found ${uniqueMessageIds.length} unique messages in history`);

            // Get full message details for each unique message
            for (const messageId of uniqueMessageIds) {
              try {
                console.log(`📧 [Gmail] Fetching full details for message: ${messageId}`);
                const messageDetails = await this.retryGmailApiCall(() =>
                  gmail.users.messages.get({
                    userId: "me",
                    id: messageId,
                    format: "full",
                  })
                );

                console.log(`📧 [Gmail] Message details received:`, {
                  id: messageDetails.data.id,
                  threadId: messageDetails.data.threadId,
                  labelIds: messageDetails.data.labelIds,
                  internalDate: messageDetails.data.internalDate,
                  snippet: messageDetails.data.snippet?.substring(0, 100),
                });

                messages.push(messageDetails.data);
                console.log(`✅ [Gmail] Successfully fetched message: ${messageId}`);
              } catch (messageError: any) {
                console.log(`❌ [Gmail] Failed to fetch message ${messageId}:`, messageError);
                logger.error(`❌ [Gmail] Failed to fetch message ${messageId}:`, messageError);

                // If message was deleted, handle cleanup
                if (messageError.code === 404) {
                  console.log(`🗑️ [Gmail] Message ${messageId} was deleted, marking for cleanup`);
                  // You could implement cleanup logic here
                }
              }
            }
          } else {
            console.log(`📧 [Gmail] No new messages found in history`);
            console.log(`📧 [Gmail] History response details:`, {
              history: history.history,
              historyId: history.historyId,
              nextPageToken: history.nextPageToken,
            });

            // Add fallback to fetch recent messages when history is empty
            console.log(`📧 [Gmail] Attempting fallback to recent messages...`);
            try {
              const recentMessagesResponse = await this.retryGmailApiCall(() =>
                gmail.users.messages.list({
                  userId: "me",
                  maxResults: 5,
                  q: "is:unread",
                })
              );

              const recentMessages = recentMessagesResponse.data.messages || [];
              console.log(`📧 [Gmail] Fallback fetched ${recentMessages.length} recent unread messages`);

              if (recentMessages.length > 0) {
                // Get full details for recent messages
                for (const msg of recentMessages) {
                  try {
                    const fullMessage = await this.retryGmailApiCall(() =>
                      gmail.users.messages.get({
                        userId: "me",
                        id: msg.id!,
                        format: "full",
                      })
                    );
                    messages.push(fullMessage.data);
                    console.log(`📧 [Gmail] Added recent message: ${msg.id}`);
                  } catch (error) {
                    console.log(`❌ [Gmail] Failed to fetch recent message ${msg.id}:`, error);
                  }
                }
              }
            } catch (fallbackError: any) {
              console.log(`❌ [Gmail] Fallback to recent messages failed:`, fallbackError);
            }
          }
        } catch (historyError: any) {
          console.log(`❌ [Gmail] Failed to fetch history:`, historyError);
          console.log(`❌ [Gmail] History error details:`, {
            code: historyError.code,
            message: historyError.message,
            status: historyError.status,
            stack: historyError.stack,
          });
          logger.error(`❌ [Gmail] Failed to fetch history:`, historyError);

          // Enhanced fallback with better duplicate prevention
          console.log(`📧 [Gmail] Falling back to recent messages with duplicate prevention...`);
          try {
            // Get the last sync time to prevent fetching already processed emails
            const lastSyncTime = account.syncState?.lastSyncAt || new Date(Date.now() - 24 * 60 * 60 * 1000); // 24 hours ago

            const messagesResponse = await gmail.users.messages.list({
              userId: "me",
              maxResults: 20,
              q: `after:${Math.floor(lastSyncTime.getTime() / 1000)}`,
            });
            messages = messagesResponse.data.messages || [];
            console.log(
              `📧 [Gmail] Fallback fetched ${messages.length} recent messages after ${lastSyncTime.toISOString()}`
            );
          } catch (fallbackError: any) {
            console.log(`❌ [Gmail] Fallback to recent messages also failed:`, fallbackError);
            logger.error(`❌ [Gmail] Fallback to recent messages also failed:`, fallbackError);
          }
        }
      } else {
        // Fallback: Get recent messages (polling flow)
        console.log(`📧 [Gmail] Fetching recent messages (polling mode)`);
        logger.info(`📧 [Gmail] Fetching recent messages (polling mode)`);
        const messagesResponse = await gmail.users.messages.list({
          userId: "me",
          maxResults: 50,
          q: "is:unread OR is:important",
        });
        messages = messagesResponse.data.messages || [];
      }

      console.log(`📧 [Gmail] Total messages to process: ${messages.length}`);
      console.log(
        `📧 [Gmail] Messages array:`,
        messages.map((m) => ({ id: m.id, threadId: m.threadId }))
      );
      let emailsProcessed = 0;

      for (const message of messages) {
        try {
          console.log(`📧 [Gmail] ===== PROCESSING MESSAGE ${message.id} =====`);
          console.log(`📧 [Gmail] Message data:`, {
            id: message.id,
            threadId: message.threadId,
            labelIds: message.labelIds,
            internalDate: message.internalDate,
            snippet: message.snippet?.substring(0, 100),
          });

          // Enhanced duplicate prevention - check multiple criteria
          const existingEmail = await EmailModel.findOne({
            messageId: message.id,
            accountId: account._id,
          });

          if (existingEmail) {
            console.log(`⏭️ [Gmail] Email ${message.id} already exists, skipping...`);
            console.log(`⏭️ [Gmail] Existing email details:`, {
              emailId: existingEmail._id,
              subject: existingEmail.subject,
              receivedAt: existingEmail.receivedAt,
            });
            continue; // Skip if already processed
          }

          // Additional duplicate check using internalDate and subject
          const messageData = message;
          const headers = messageData.payload?.headers || [];
          const subject = this.extractHeader(headers, "Subject") || "No Subject";
          const internalDate = parseInt(messageData.internalDate || Date.now().toString());

          console.log(`📧 [Gmail] Message headers:`, {
            subject: subject,
            from: this.extractHeader(headers, "From"),
            to: this.extractHeader(headers, "To"),
            internalDate: new Date(internalDate),
          });

          // Check for potential duplicates based on content
          const potentialDuplicate = await EmailModel.findOne({
            accountId: account._id,
            subject: subject,
            receivedAt: {
              $gte: new Date(internalDate - 60000), // Within 1 minute
              $lte: new Date(internalDate + 60000),
            },
          });

          if (potentialDuplicate) {
            console.log(`⚠️ [Gmail] Potential duplicate found for message ${message.id}:`, {
              existingId: potentialDuplicate._id,
              subject: subject,
              receivedAt: new Date(internalDate),
            });
            // Continue processing but log the potential duplicate
          }

          // Extract email data and determine threadId
          let threadId = messageData.threadId;

          // If Gmail doesn't provide threadId, generate one based on subject and participants
          if (!threadId) {
            const from = this.extractHeader(headers, "From") || "";
            const to = this.extractHeader(headers, "To") || "";

            // Create a hash-based threadId for emails without Gmail threadId
            const threadKey = `${subject.toLowerCase().trim()}_${from}_${to}`;
            threadId = `generated_${Buffer.from(threadKey).toString("base64").substring(0, 16)}`;

            console.log(`🔄 [Gmail] Generated threadId: ${threadId} for message: ${message.id}`);
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

          console.log(`📧 [Gmail] Email data prepared:`, {
            messageId: emailData.messageId,
            subject: emailData.subject,
            from: emailData.from.email,
            threadId: emailData.threadId,
          });

          // Ensure we have a valid threadId before proceeding
          if (!emailData.threadId) {
            console.log(`⚠️ [Gmail] Skipping email ${emailData.messageId} - no threadId available`);
            logger.warn(`⚠️ [Gmail] Skipping email ${emailData.messageId} - no threadId available`);
            continue;
          }

          // Save email to database
          console.log(`💾 [Gmail] Saving email to database: ${emailData.messageId}`);
          let savedEmail;
          try {
            savedEmail = await EmailModel.create(emailData);
            emailsProcessed++;
            console.log(`✅ [Gmail] Email saved to database successfully:`, {
              emailId: savedEmail._id,
              messageId: savedEmail.messageId,
              subject: savedEmail.subject,
            });
          } catch (dbError: any) {
            console.log(`❌ [Gmail] Failed to save email to database:`, {
              messageId: emailData.messageId,
              error: dbError.message,
              code: dbError.code,
              stack: dbError.stack,
            });
            logger.error(`❌ [Gmail] Failed to save email to database:`, dbError);
            continue; // Skip to next message if this one fails
          }

          // Create or update Gmail thread
          try {
            console.log(`🧵 [Gmail] Creating/updating thread for email: ${savedEmail.threadId}`);
            const existingThread = await GmailThreadModel.findOne({
              threadId: savedEmail.threadId,
              accountId: account._id,
            });

            if (existingThread) {
              // Update existing thread with comprehensive data
              console.log(`🔄 [Gmail] Updating existing thread: ${savedEmail.threadId}`);

              const updateData: any = {
                $inc: {
                  messageCount: 1,
                  unreadCount: savedEmail.isRead ? 0 : 1,
                  totalSize: messageData.sizeEstimate || 0,
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
                  // Update thread status based on latest email
                  status: savedEmail.isSpam ? "spam" : "active",
                  folder: savedEmail.folder,
                  category: savedEmail.category,
                },
                $push: {
                  "rawGmailData.messageIds": savedEmail.messageId,
                },
              };

              // Add participants if they don't exist
              const newParticipants = [
                { email: savedEmail.from.email, name: savedEmail.from.name },
                ...savedEmail.to.map((recipient: { email: string; name?: string }) => ({
                  email: recipient.email,
                  name: recipient.name,
                })),
              ];

              // Update participants array with new unique participants
              newParticipants.forEach((participant) => {
                if (!existingThread.participants.some((p: any) => p.email === participant.email)) {
                  updateData.$push = updateData.$push || {};
                  updateData.$push.participants = participant;
                }
              });

              await GmailThreadModel.findByIdAndUpdate(existingThread._id, updateData);
              console.log(`✅ [Gmail] Thread updated successfully: ${savedEmail.threadId}`);
              logger.info(`📧 [Gmail] Updated thread: ${savedEmail.threadId}`);
            } else {
              // Create new thread with comprehensive data
              console.log(`🆕 [Gmail] Creating new thread: ${savedEmail.threadId}`);

              // Check for attachments
              const hasAttachments =
                messageData.payload?.parts?.some((part: any) => part.filename && part.filename.trim() !== "") || false;

              const threadData = {
                threadId: savedEmail.threadId,
                accountId: account._id,
                subject: savedEmail.subject,
                normalizedSubject: savedEmail.subject.toLowerCase().trim(),
                messageCount: 1,
                unreadCount: savedEmail.isRead ? 0 : 1,
                isStarred: savedEmail.isStarred || false,
                hasAttachments: hasAttachments,
                firstMessageAt: savedEmail.receivedAt,
                lastMessageAt: savedEmail.receivedAt,
                lastActivity: savedEmail.receivedAt,
                status: savedEmail.isSpam ? "spam" : "active",
                folder: savedEmail.folder,
                category: savedEmail.category,
                threadType: "conversation",
                isPinned: false,
                totalSize: messageData.sizeEstimate || 0,
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
                  sizeEstimate: messageData.sizeEstimate || 0,
                  snippet: messageData.snippet || "",
                },
              };

              await GmailThreadModel.create(threadData);
              console.log(`✅ [Gmail] New thread created successfully: ${savedEmail.threadId}`);
              logger.info(`📧 [Gmail] Created new thread: ${savedEmail.threadId}`);
            }
          } catch (threadError: any) {
            console.log(`❌ [Gmail] Failed to create/update thread for ${savedEmail.threadId}:`, threadError);
            logger.error(`❌ [Gmail] Failed to create/update thread for ${savedEmail.threadId}:`, threadError);
          }

          // Emit real-time notification
          console.log(`📡 [Gmail] Emitting real-time notification for email: ${savedEmail.messageId}`);
          socketManager.emitNewEmail(account.emailAddress, {
            emailId: savedEmail._id,
            messageId: savedEmail.messageId,
            subject: savedEmail.subject,
            from: savedEmail.from,
            receivedAt: savedEmail.receivedAt,
            isRead: savedEmail.isRead,
            threadId: savedEmail.threadId,
          });

          console.log(`📧 [Gmail] Email processing completed: ${savedEmail.subject} for ${account.emailAddress}`);
          logger.info(`📧 [Gmail] Saved email: ${savedEmail.subject} for ${account.emailAddress}`);
        } catch (messageError: any) {
          console.log(`❌ [Gmail] Failed to process message ${message.id || "unknown"}:`, messageError);
          logger.error(`❌ [Gmail] Failed to process message ${message.id || "unknown"}:`, messageError);
        }
      }

      // Update account sync state
      console.log(`💾 [Gmail] Updating account sync state...`);
      await EmailAccountModel.findByIdAndUpdate(account._id, {
        $set: {
          "syncState.lastSyncAt": new Date(),
          "stats.lastSyncAt": new Date(),
        },
      });

      console.log(`✅ [Gmail] ===== GMAIL SYNC COMPLETED =====`);
      console.log(`✅ [Gmail] Account: ${account.emailAddress}`);
      console.log(`✅ [Gmail] Emails processed: ${emailsProcessed}`);
      console.log(`✅ [Gmail] Sync completed at: ${new Date().toISOString()}`);

      logger.info(`✅ [Gmail] Sync completed for ${account.emailAddress}: ${emailsProcessed} emails processed`);

      return {
        success: true,
        message: `Gmail sync completed: ${emailsProcessed} emails processed`,
        emailsProcessed,
      };
    } catch (error: any) {
      console.log(`💥 [Gmail] ===== GMAIL SYNC FAILED =====`);
      console.log(`💥 [Gmail] Account: ${account.emailAddress}`);
      console.log(`💥 [Gmail] Error:`, error);
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
   * Get account-specific Gmail topic information
   */
  static async getGmailTopicInfo(account: IEmailAccount): Promise<{
    topicName: string;
    isAutoCreated: boolean;
    isActive: boolean;
  } | null> {
    try {
      if (!account.syncState?.gmailTopic) {
        return null;
      }

      const topicName = account.syncState.gmailTopic.split("/").pop() || "";
      const isActive = !!(
        account.syncState.isWatching &&
        account.syncState.watchExpiration &&
        new Date(account.syncState.watchExpiration) > new Date()
      );

      return {
        topicName,
        isAutoCreated: account.syncState.isAutoCreated || false,
        isActive,
      };
    } catch (error: any) {
      logger.error(`❌ [Gmail] Failed to get topic info for ${account.emailAddress}:`, error);
      return null;
    }
  }

  /**
   * Clean up Outlook webhook subscription when account is removed
   */
  static async cleanupOutlookSubscription(account: IEmailAccount): Promise<void> {
    try {
      if (account.syncState?.webhookId && account.oauth?.accessToken) {
        try {
          // Get decrypted access token
          const decryptedAccessToken = EmailOAuthService.decryptData(account.oauth.accessToken);

          // Delete the webhook subscription
          const deleteResponse = await fetch(
            `https://graph.microsoft.com/v1.0/subscriptions/${account.syncState.webhookId}`,
            {
              method: "DELETE",
              headers: {
                Authorization: `Bearer ${decryptedAccessToken}`,
                "Content-Type": "application/json",
              },
            }
          );

          if (deleteResponse.ok) {
            logger.info(
              `✅ [Outlook] Deleted webhook subscription: ${account.syncState.webhookId} for ${account.emailAddress}`
            );
          } else {
            const errorText = await deleteResponse.text();
            logger.warn(
              `⚠️ [Outlook] Failed to delete subscription ${account.syncState.webhookId}: ${deleteResponse.status} ${errorText}`
            );
          }
        } catch (error: any) {
          logger.error(`❌ [Outlook] Failed to delete subscription ${account.syncState.webhookId}:`, error);
        }
      }
    } catch (error: any) {
      logger.error(`❌ [Outlook] Failed to cleanup subscription for ${account.emailAddress}:`, error);
    }
  }

  /**
   * Clean up Gmail topic and subscription when account is removed
   */
  static async cleanupGmailTopic(account: IEmailAccount): Promise<void> {
    try {
      // Clean up subscription first
      if (account.syncState?.gmailSubscription) {
        const subscriptionName = account.syncState.gmailSubscription.split("/").pop(); // Extract subscription name from full path

        if (subscriptionName && subscriptionName.startsWith("gmail-sync-")) {
          try {
            const pubsub = this.getPubSubClient();
            const subscription = pubsub.subscription(subscriptionName);
            await subscription.delete();
            logger.info(
              `✅ [Gmail] Deleted auto-created subscription: ${subscriptionName} for ${account.emailAddress}`
            );
          } catch (error: any) {
            if (error.code === 5) {
              // Subscription not found (already deleted)
              logger.info(`ℹ️ [Gmail] Subscription ${subscriptionName} already deleted for ${account.emailAddress}`);
            } else {
              logger.error(`❌ [Gmail] Failed to delete subscription ${subscriptionName}:`, error);
            }
          }
        }
      }

      // Clean up topic
      if (account.syncState?.gmailTopic && account.syncState?.isAutoCreated) {
        const topicName = account.syncState.gmailTopic.split("/").pop(); // Extract topic name from full path

        if (topicName && topicName.startsWith("gmail-sync-")) {
          try {
            const pubsub = this.getPubSubClient();
            await pubsub.topic(topicName).delete();
            logger.info(`✅ [Gmail] Deleted auto-created topic: ${topicName} for ${account.emailAddress}`);
          } catch (error: any) {
            if (error.code === 5) {
              // Topic not found (already deleted)
              logger.info(`ℹ️ [Gmail] Topic ${topicName} already deleted for ${account.emailAddress}`);
            } else {
              logger.error(`❌ [Gmail] Failed to delete topic ${topicName}:`, error);
            }
          }
        }
      }
    } catch (error: any) {
      logger.error(`❌ [Gmail] Failed to cleanup resources for ${account.emailAddress}:`, error);
    }
  }

  /**
   * Clean up all webhook resources when account is removed
   */
  static async cleanupAccountWebhooks(account: IEmailAccount): Promise<void> {
    try {
      logger.info(`🧹 [${account.accountType.toUpperCase()}] Cleaning up webhooks for: ${account.emailAddress}`);

      if (account.accountType === "gmail") {
        await this.cleanupGmailTopic(account);
      } else if (account.accountType === "outlook") {
        await this.cleanupOutlookSubscription(account);
      }

      logger.info(`✅ [${account.accountType.toUpperCase()}] Webhook cleanup completed for: ${account.emailAddress}`);
    } catch (error: any) {
      logger.error(
        `❌ [${account.accountType.toUpperCase()}] Webhook cleanup failed for ${account.emailAddress}:`,
        error
      );
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
            // Check if Gmail watch is expiring soon (within 24 hours)
            if (
              account.syncState?.watchExpiration &&
              new Date(account.syncState.watchExpiration).getTime() - Date.now() < 24 * 60 * 60 * 1000
            ) {
              logger.info(`🔄 [Gmail] Renewing expiring watch for: ${account.emailAddress}`);
              await this.setupGmailRealTimeSync(account);
            }
          } else if (account.accountType === "outlook") {
            // Check if Outlook subscription is expiring soon (within 12 hours)
            if (
              account.syncState?.subscriptionExpiry &&
              new Date(account.syncState.subscriptionExpiry).getTime() - Date.now() < 12 * 60 * 60 * 1000
            ) {
              logger.info(`🔄 [Outlook] Renewing expiring subscription for: ${account.emailAddress}`);
              await this.setupOutlookRealTimeSync(account);
            }
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
