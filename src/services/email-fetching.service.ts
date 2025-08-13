import { IEmailAccount, EmailAccountModel } from "@/models/email-account.model";
import { EmailModel } from "@/models/email.model";
import { EmailThreadModel } from "@/models/email-thread.model";
import { EmailAccountConfigService } from "./email-account-config.service";
import { logger } from "@/utils/logger.util";
import Imap from "imap";
import { simpleParser } from "mailparser";
import { google } from "googleapis";
import { Client } from "@microsoft/microsoft-graph-client";
import crypto from "crypto";
import { IEmail } from "@/contracts/mailbox.contract";

export interface FetchedEmail {
  messageId: string;
  threadId?: string;
  subject: string;
  from: { email: string; name?: string };
  to: { email: string; name?: string }[];
  cc?: { email: string; name?: string }[];
  bcc?: { email: string; name?: string }[];
  replyTo?: { email: string; name?: string };
  date: Date;
  textContent?: string;
  htmlContent?: string;
  attachments?: any[];
  headers?: any[];
  isRead: boolean;
  uid?: number;
  flags?: string[];
  // Threading headers (RFC 2822 standard)
  inReplyTo?: string;
  references?: string[];
  parentMessageId?: string;
}

export interface EmailFetchResult {
  success: boolean;
  emails: FetchedEmail[];
  totalCount: number;
  newCount: number;
  error?: string;
  syncStatus?: string; // New field for sync status
  pagination?: {
    page: number;
    pageSize: number;
    totalPages: number;
    hasNextPage: boolean;
    nextPageToken?: string;
  };
  historyId?: string; // New field for Gmail History API
}

export interface EmailFetchOptions {
  folder?: string;
  limit?: number;
  since?: Date;
  markAsRead?: boolean;
  includeBody?: boolean; // Whether to include email body content (default: true)
  fetchAll?: boolean; // New option to fetch all emails instead of just recent ones
  page?: number; // Page number for pagination (1-based)
  pageSize?: number; // Number of emails per page
  useHistoryAPI?: boolean; // New option for Gmail History API
}

export class EmailFetchingService {
  private static readonly BATCH_SIZE = 100;
  private static readonly RATE_LIMIT_DELAY = 1000; // 1 second between batches
  private static readonly QUOTA_LIMIT = 1000000; // Gmail API quota per day

  /**
   * Refresh OAuth token for Gmail account
   */
  private static async refreshGmailToken(emailAccount: IEmailAccount): Promise<IEmailAccount> {
    try {
      console.log("🔄 REFRESHING GMAIL TOKEN");
      console.log("Refresh token details:", {
        hasRefreshToken: !!emailAccount.oauth?.refreshToken,
        refreshTokenLength: emailAccount.oauth?.refreshToken?.length,
        accountEmail: emailAccount.emailAddress,
      });

      if (!emailAccount.oauth?.refreshToken) {
        console.log("❌ No refresh token available");
        throw new Error("No refresh token available");
      }

      console.log("🔑 Creating OAuth2 client for refresh");
      const oauth2Client = new google.auth.OAuth2(
        process.env.GOOGLE_CLIENT_ID,
        process.env.GOOGLE_CLIENT_SECRET,
        process.env.GOOGLE_REDIRECT_URI
      );

      // Decrypt refresh token before using it
      const { EmailOAuthService } = await import("@/services/emailOAuth.service");
      const decryptedRefreshToken = EmailOAuthService.decryptData(emailAccount.oauth.refreshToken);

      oauth2Client.setCredentials({
        refresh_token: decryptedRefreshToken,
      });

      console.log("🔄 Calling Google API to refresh token...");
      // Get new access token
      const { credentials } = await oauth2Client.refreshAccessToken();

      console.log("✅ Token refresh response:", {
        hasAccessToken: !!credentials.access_token,
        accessTokenLength: credentials.access_token?.length,
        hasExpiryDate: !!credentials.expiry_date,
        expiryDate: credentials.expiry_date ? new Date(credentials.expiry_date).toISOString() : null,
      });

      if (!credentials.access_token) {
        console.log("❌ No access token in refresh response");
        throw new Error("Failed to refresh access token");
      }

      console.log("💾 Updating account with new token...");
      // Encrypt the new access token before saving
      const encryptedAccessToken = EmailOAuthService.encryptData(credentials.access_token);

      // Update account with new encrypted token
      const updatedAccount = await EmailAccountModel.findByIdAndUpdate(
        emailAccount._id,
        {
          $set: {
            "oauth.accessToken": encryptedAccessToken,
            "oauth.tokenExpiry": credentials.expiry_date ? new Date(credentials.expiry_date) : undefined,
            connectionStatus: "connected",
            "stats.lastError": null,
          },
        },
        { new: true }
      );

      if (!updatedAccount) {
        console.log("❌ Failed to update account in database");
        throw new Error("Failed to update account with new token");
      }

      console.log("✅ Token refresh complete");
      logger.info(`Successfully refreshed Gmail token for account: ${emailAccount.emailAddress}`);
      return updatedAccount;
    } catch (error: any) {
      logger.error(`Failed to refresh Gmail token for account ${emailAccount.emailAddress}:`, error);

      // Update account with error status
      await EmailAccountModel.findByIdAndUpdate(emailAccount._id, {
        $set: {
          connectionStatus: "error",
          "stats.lastError": `Token refresh failed: ${error.message}`,
        },
      });

      throw error;
    }
  }

  /**
   * Main method to fetch emails from any configured account
   */
  static async fetchEmailsFromAccount(
    emailAccount: IEmailAccount,
    options: EmailFetchOptions = {}
  ): Promise<EmailFetchResult> {
    // Set default values
    const fetchOptions: EmailFetchOptions = {
      includeBody: true, // Default to including body content
      ...options,
    };
    try {
      console.log("🚀 STARTING EMAIL FETCH");
      console.log("Account:", {
        id: emailAccount._id,
        email: emailAccount.emailAddress,
        type: emailAccount.accountType,
        connectionStatus: emailAccount.connectionStatus,
        isActive: emailAccount.isActive,
        status: emailAccount.status,
        hasOAuth: !!emailAccount.oauth,
        oauthProvider: emailAccount.oauth?.provider,
        hasAccessToken: !!emailAccount.oauth?.accessToken,
        hasRefreshToken: !!emailAccount.oauth?.refreshToken,
        lastError: emailAccount.stats?.lastError,
      });
      console.log("Options:", {
        ...fetchOptions,
        includeBody: fetchOptions.includeBody !== false, // Show the actual value being used
      });

      logger.info(`Starting email fetch for account: ${emailAccount.emailAddress}`);

      // Check account status
      if (!emailAccount.isActive || emailAccount.status === "error") {
        console.log("❌ Account is not active or has error status");
        console.log("isActive:", emailAccount.isActive, "status:", emailAccount.status);
        throw new Error(`Email account is not active or has errors`);
      }

      let result: EmailFetchResult;

      // Route to appropriate fetching method based on account type
      switch (emailAccount.accountType) {
        case "gmail":
          console.log("📧 Gmail account detected");
          if (emailAccount.oauth) {
            console.log("🔐 Using Gmail API with OAuth");
            // Check if we should use the new History API approach
            if (fetchOptions.useHistoryAPI || emailAccount.syncState?.syncStatus === "complete") {
              console.log("🔄 Using Gmail History API for efficient syncing");
              result = await this.syncGmailWithHistoryAPI(emailAccount, fetchOptions);
            } else {
              console.log("📧 Using traditional Gmail API sync");
              result = await this.fetchFromGmailAPI(emailAccount, fetchOptions);
            }
          } else {
            console.log("📨 Using IMAP for Gmail");
            result = await this.fetchFromIMAP(emailAccount, fetchOptions);
          }
          break;

        case "outlook":
          if (emailAccount.oauth) {
            result = await this.fetchFromOutlookAPI(emailAccount, fetchOptions);
          } else {
            result = await this.fetchFromIMAP(emailAccount, fetchOptions);
          }
          break;

        case "imap":
        case "exchange":
        case "custom":
        default:
          result = await this.fetchFromIMAP(emailAccount, fetchOptions);
          break;
      }

      console.log("💾 Storing emails in database...");
      // Store fetched emails in database
      if (result.success && result.emails.length > 0) {
        await this.storeEmailsInDatabase(result.emails, emailAccount);
        console.log("✅ Emails stored successfully");
      } else {
        console.log("ℹ️ No emails to store");
      }

      // Update account stats
      console.log("📊 Updating account stats...");
      await this.updateAccountStats(emailAccount, result);

      console.log("🎉 EMAIL FETCH COMPLETE:", {
        totalEmails: result.emails.length,
        newEmails: result.newCount,
        success: result.success,
      });

      logger.info(`Email fetch completed for ${emailAccount.emailAddress}: ${result.newCount} new emails`);
      return result;
    } catch (error: any) {
      console.log("💥 EMAIL FETCH FAILED:", error.message);
      logger.error(`Error fetching emails for account ${emailAccount.emailAddress}:`, error);

      // Update account with error status
      await this.updateAccountError(emailAccount, error.message);

      return {
        success: false,
        emails: [],
        totalCount: 0,
        newCount: 0,
        error: error.message,
      };
    }
  }

  /**
   * Sync emails from multiple folders for an account
   */
  static async syncMultipleFolders(
    emailAccount: IEmailAccount,
    options: EmailFetchOptions = {}
  ): Promise<EmailFetchResult> {
    try {
      console.log("🔄 SYNCING MULTIPLE FOLDERS");
      console.log("Account:", {
        id: emailAccount._id,
        email: emailAccount.emailAddress,
        syncFolders: emailAccount.settings?.syncFolders || ["INBOX"],
      });

      const syncFolders = emailAccount.settings?.syncFolders || ["INBOX"];
      let allEmails: FetchedEmail[] = [];
      let totalNewCount = 0;
      let totalCount = 0;

      // Sync each folder
      for (const folder of syncFolders) {
        console.log(`📁 Syncing folder: ${folder}`);

        try {
          const folderOptions = {
            ...options,
            folder: folder,
          };

          const result = await this.fetchEmailsFromAccount(emailAccount, folderOptions);

          if (result.success) {
            allEmails = allEmails.concat(result.emails);
            totalNewCount += result.newCount;
            totalCount += result.totalCount;

            console.log(`✅ Folder ${folder} synced:`, {
              emails: result.emails.length,
              newEmails: result.newCount,
              totalCount: result.totalCount,
            });
          } else {
            console.log(`❌ Folder ${folder} sync failed:`, result.error);
          }
        } catch (error: any) {
          console.log(`❌ Error syncing folder ${folder}:`, error.message);
          // Continue with other folders even if one fails
        }
      }

      console.log("🎉 MULTI-FOLDER SYNC COMPLETE:", {
        foldersSynced: syncFolders.length,
        totalEmails: allEmails.length,
        totalNewEmails: totalNewCount,
        totalCount: totalCount,
      });

      return {
        success: true,
        emails: allEmails,
        totalCount: totalCount,
        newCount: totalNewCount,
      };
    } catch (error: any) {
      console.log("💥 MULTI-FOLDER SYNC FAILED:", error.message);
      logger.error(`Error syncing multiple folders for account ${emailAccount.emailAddress}:`, error);

      return {
        success: false,
        emails: [],
        totalCount: 0,
        newCount: 0,
        error: error.message,
      };
    }
  }

  /**
   * Enhanced Gmail sync using History API for efficient incremental syncing
   */
  static async syncGmailWithHistoryAPI(
    emailAccount: IEmailAccount,
    options: EmailFetchOptions = {}
  ): Promise<EmailFetchResult> {
    try {
      logger.info(`Starting Gmail History API sync for account: ${emailAccount.emailAddress}`);

      // Initialize sync state if not exists
      if (!emailAccount.syncState) {
        emailAccount.syncState = {
          syncStatus: "initial",
          syncProgress: { totalProcessed: 0, currentBatch: 0, estimatedTotal: 0 },
        };
      }

      // If this is initial sync, fetch recent emails first
      if (emailAccount.syncState.syncStatus === "initial") {
        const initialResult = await this.performInitialGmailSync(emailAccount, options);
        if (!initialResult.success) {
          return initialResult;
        }
      }

      // Perform historical sync using History API
      if (emailAccount.syncState.syncStatus === "initial" || emailAccount.syncState.syncStatus === "historical") {
        try {
          const historicalResult = await this.performHistoricalGmailSync(emailAccount);
          if (!historicalResult.success) {
            return historicalResult;
          }
          logger.info(`Historical sync completed for ${emailAccount.emailAddress}`);
        } catch (error: any) {
          logger.warn(
            `Historical sync failed for ${emailAccount.emailAddress}, continuing with current state: ${error.message}`
          );
          // Continue with current state instead of failing completely
        }
      }

      // Setup watch notifications for real-time updates
      if (emailAccount.syncState.syncStatus === "complete") {
        await this.setupGmailWatch(emailAccount);
      }

      // Get the final sync state
      const finalSyncState = await EmailAccountModel.findById(emailAccount._id).select("syncState");

      return {
        success: true,
        emails: [],
        totalCount: finalSyncState?.syncState?.syncProgress?.totalProcessed || 0,
        newCount: finalSyncState?.syncState?.syncProgress?.totalProcessed || 0,
        historyId: emailAccount.syncState.lastHistoryId,
        syncStatus: emailAccount.syncState.syncStatus,
      };
    } catch (error: any) {
      logger.error(`Gmail History API sync failed for ${emailAccount.emailAddress}:`, error);
      await this.updateSyncError(emailAccount, error.message);

      return {
        success: false,
        emails: [],
        totalCount: 0,
        newCount: 0,
        error: error.message,
        syncStatus: emailAccount.syncState?.syncStatus,
      };
    }
  }

  /**
   * Perform initial Gmail sync to get recent emails and capture historyId
   */
  private static async performInitialGmailSync(
    emailAccount: IEmailAccount,
    options: EmailFetchOptions
  ): Promise<EmailFetchResult> {
    try {
      logger.info(`Performing initial Gmail sync for ${emailAccount.emailAddress}`);

      // Fetch recent emails using messages.list
      const gmail = google.gmail({ version: "v1", auth: await this.getGmailAuthClient(emailAccount) });

      const messagesResponse = await gmail.users.messages.list({
        userId: "me",
        maxResults: options.limit || 50,
        q: options.since ? `after:${Math.floor(options.since.getTime() / 1000)}` : undefined,
      });

      if (!messagesResponse.data.messages || messagesResponse.data.messages.length === 0) {
        logger.info(`No recent messages found for ${emailAccount.emailAddress}`);
        return { success: true, emails: [], totalCount: 0, newCount: 0 };
      }

      // Fetch full message details
      const emails: FetchedEmail[] = [];
      for (const message of messagesResponse.data.messages) {
        try {
          const messageResponse = await gmail.users.messages.get({
            userId: "me",
            id: message.id!,
            format: "full",
          });

          const fetchedEmail = this.parseGmailMessage(messageResponse.data, emailAccount);
          emails.push(fetchedEmail);
        } catch (error: any) {
          logger.error(`Error fetching message ${message.id}:`, error);
        }
      }

      // Store emails in database
      if (emails.length > 0) {
        await this.storeEmailsInDatabase(emails, emailAccount);
      }

      // Get current historyId for future incremental syncs
      const profileResponse = await gmail.users.getProfile({ userId: "me" });
      const currentHistoryId = profileResponse.data.historyId;

      // Update sync state
      await this.updateSyncState(emailAccount, {
        lastHistoryId: currentHistoryId,
        syncStatus: "historical",
        lastSyncAt: new Date(),
        syncProgress: { totalProcessed: emails.length, currentBatch: 1, estimatedTotal: emails.length },
      });

      logger.info(
        `Initial sync completed for ${emailAccount.emailAddress}: ${emails.length} emails, historyId: ${currentHistoryId}`
      );

      return {
        success: true,
        emails,
        totalCount: emails.length,
        newCount: emails.length,
        historyId: currentHistoryId ?? undefined,
      };
    } catch (error: any) {
      logger.error(`Initial Gmail sync failed for ${emailAccount.emailAddress}:`, error);
      throw error;
    }
  }

  /**
   * Perform historical sync using Gmail History API
   */
  private static async performHistoricalGmailSync(emailAccount: IEmailAccount): Promise<EmailFetchResult> {
    try {
      logger.info(`Starting historical sync for ${emailAccount.emailAddress}`);

      const gmail = google.gmail({ version: "v1", auth: await this.getGmailAuthClient(emailAccount) });
      const startHistoryId = emailAccount.syncState?.lastHistoryId;

      if (!startHistoryId) {
        logger.warn(
          `No historyId available for historical sync for ${emailAccount.emailAddress}, skipping historical sync`
        );
        // Return success but with no processing since we can't do historical sync without historyId
        return {
          success: true,
          emails: [],
          totalCount: 0,
          newCount: 0,
          historyId: undefined,
        };
      }

      let currentHistoryId = startHistoryId;
      let totalProcessed = 0;
      let batchCount = 0;

      while (true) {
        batchCount++;
        logger.info(`Processing batch ${batchCount} for ${emailAccount.emailAddress}`);

        // Check quota before making API call
        if (!(await this.checkQuota(emailAccount))) {
          logger.warn(`Quota limit reached for ${emailAccount.emailAddress}, pausing sync`);
          break;
        }

        const historyResponse = await gmail.users.history.list({
          userId: "me",
          startHistoryId: currentHistoryId,
          maxResults: this.BATCH_SIZE,
        });

        if (!historyResponse.data.history || historyResponse.data.history.length === 0) {
          logger.info(`No more history entries for ${emailAccount.emailAddress}`);
          break;
        }

        // Process history entries
        for (const historyEntry of historyResponse.data.history) {
          await this.processHistoryEntry(historyEntry, emailAccount);
          totalProcessed++;
        }

        // Update progress
        currentHistoryId = historyResponse.data.historyId || currentHistoryId;
        await this.updateSyncProgress(emailAccount, totalProcessed, currentHistoryId, batchCount);

        // Rate limiting
        await this.delay(this.RATE_LIMIT_DELAY);
      }

      // Mark sync as complete
      await this.updateSyncState(emailAccount, {
        syncStatus: "complete",
        lastSyncAt: new Date(),
        syncProgress: { totalProcessed, currentBatch: batchCount, estimatedTotal: totalProcessed },
      });

      logger.info(`Historical sync completed for ${emailAccount.emailAddress}: ${totalProcessed} entries processed`);

      return {
        success: true,
        emails: [],
        totalCount: totalProcessed,
        newCount: totalProcessed,
        historyId: currentHistoryId,
      };
    } catch (error: any) {
      logger.error(`Historical sync failed for ${emailAccount.emailAddress}:`, error);
      throw error;
    }
  }

  /**
   * Process a single history entry
   */
  private static async processHistoryEntry(historyEntry: any, emailAccount: IEmailAccount): Promise<void> {
    const gmail = google.gmail({ version: "v1", auth: await this.getGmailAuthClient(emailAccount) });

    try {
      // Handle messagesAdded
      if (historyEntry.messagesAdded) {
        for (const msgAdded of historyEntry.messagesAdded) {
          try {
            const messageResponse = await gmail.users.messages.get({
              userId: "me",
              id: msgAdded.message.id!,
              format: "full",
            });

            const fetchedEmail = this.parseGmailMessage(messageResponse.data, emailAccount);
            await this.storeEmailsInDatabase([fetchedEmail], emailAccount);
          } catch (error: any) {
            logger.error(`Error processing added message ${msgAdded.message.id}:`, error);
          }
        }
      }

      // Handle messagesDeleted
      if (historyEntry.messagesDeleted) {
        for (const msgDeleted of historyEntry.messagesDeleted) {
          try {
            await EmailModel.updateMany(
              { messageId: msgDeleted.message.id },
              { $set: { isDeleted: true, deletedAt: new Date() } }
            );
          } catch (error: any) {
            logger.error(`Error processing deleted message ${msgDeleted.message.id}:`, error);
          }
        }
      }

      // Handle labelsAdded/labelsRemoved
      if (historyEntry.labelsAdded || historyEntry.labelsRemoved) {
        await this.updateMessageLabels(historyEntry, emailAccount);
      }
    } catch (error: any) {
      logger.error(`Error processing history entry:`, error);
    }
  }

  /**
   * Setup Gmail watch notifications for real-time updates
   */
  private static async setupGmailWatch(emailAccount: IEmailAccount): Promise<void> {
    try {
      logger.info(`Setting up Gmail watch for ${emailAccount.emailAddress}`);

      const gmail = google.gmail({ version: "v1", auth: await this.getGmailAuthClient(emailAccount) });

      // Get the Google Cloud project ID from environment
      const projectId = process.env.GOOGLE_CLOUD_PROJECT;
      if (!projectId) {
        throw new Error("GOOGLE_CLOUD_PROJECT environment variable is required for Gmail watch setup");
      }

      const topicName = `projects/${projectId}/topics/gmail-notifications`;
      logger.info(`Using topic: ${topicName} for Gmail watch setup`);

      const watchResponse = await gmail.users.watch({
        userId: "me",
        requestBody: {
          topicName: topicName,
          labelIds: ["INBOX", "SENT", "DRAFT"],
          labelFilterAction: "include",
        },
      });

      // Update sync state with watch expiration and set watching flag
      await this.updateSyncState(emailAccount, {
        watchExpiration: new Date(watchResponse.data.expiration || Date.now()),
        lastWatchRenewal: new Date(),
        isWatching: true,
      });

      logger.info(
        `Gmail watch setup completed for ${emailAccount.emailAddress}, expires: ${watchResponse.data.expiration}`
      );
    } catch (error: any) {
      logger.error(`Failed to setup Gmail watch for ${emailAccount.emailAddress}:`, error);

      // Log additional debugging information
      logger.error(`Gmail watch setup error details:`, {
        emailAddress: emailAccount.emailAddress,
        projectId: process.env.GOOGLE_CLOUD_PROJECT,
        hasOAuth: !!emailAccount.oauth,
        oauthProvider: emailAccount.oauth?.provider,
        errorCode: error.code,
        errorMessage: error.message,
      });

      throw error;
    }
  }

  /**
   * Renew Gmail watch subscriptions
   */
  static async renewGmailWatchSubscriptions(): Promise<void> {
    try {
      logger.info("Checking for Gmail watch subscriptions that need renewal");

      const accountsNeedingRenewal = await EmailAccountModel.find({
        "syncState.watchExpiration": { $lt: new Date(Date.now() + 24 * 60 * 60 * 1000) }, // Expires within 24 hours
        "syncState.syncStatus": "complete",
        accountType: "gmail",
        isActive: true,
      });

      logger.info(`Found ${accountsNeedingRenewal.length} accounts needing watch renewal`);

      for (const account of accountsNeedingRenewal) {
        try {
          await this.setupGmailWatch(account);
          logger.info(`Watch renewed for ${account.emailAddress}`);
        } catch (error: any) {
          logger.error(`Failed to renew watch for ${account.emailAddress}:`, error);
        }
      }
    } catch (error: any) {
      logger.error("Error renewing Gmail watch subscriptions:", error);
    }
  }

  /**
   * Process Gmail push notification
   */
  static async processGmailNotification(emailAddress: string, historyId: string): Promise<void> {
    try {
      logger.info(`Processing Gmail notification for ${emailAddress}, historyId: ${historyId}`);

      const account = await EmailAccountModel.findOne({ emailAddress });
      if (!account) {
        logger.error(`Account not found for email: ${emailAddress}`);
        return;
      }

      const lastHistoryId = account.syncState?.lastHistoryId;
      if (!lastHistoryId) {
        logger.error(`No lastHistoryId found for account: ${emailAddress}`);
        return;
      }

      // Fetch new changes using History API
      const gmail = google.gmail({ version: "v1", auth: await this.getGmailAuthClient(account) });

      const historyResponse = await gmail.users.history.list({
        userId: "me",
        startHistoryId: lastHistoryId,
        maxResults: 1000,
      });

      if (historyResponse.data.history && historyResponse.data.history.length > 0) {
        // Process changes
        for (const historyEntry of historyResponse.data.history) {
          await this.processHistoryEntry(historyEntry, account);
        }

        // Update historyId
        await this.updateSyncState(account, {
          lastHistoryId: historyId,
          lastSyncAt: new Date(),
        });

        logger.info(`Processed ${historyResponse.data.history.length} history entries for ${emailAddress}`);
      }
    } catch (error: any) {
      logger.error(`Error processing Gmail notification for ${emailAddress}:`, error);
    }
  }

  // Note: Gmail watch renewal requires Google Cloud Pub/Sub setup
  // This feature is removed to maintain clean code structure
  // Use efficient polling with History API instead

  // Note: Gmail push notification processing requires Google Cloud Pub/Sub setup
  // This feature is removed to maintain clean code structure
  // Use efficient polling with History API instead

  /**
   * Fetch emails using IMAP protocol
   */
  private static async fetchFromIMAP(
    emailAccount: IEmailAccount,
    fetchOptions: EmailFetchOptions
  ): Promise<EmailFetchResult> {
    return new Promise((resolve) => {
      try {
        const imap = this.createIMAPConnection(emailAccount);
        const emails: FetchedEmail[] = [];
        let totalCount = 0;

        imap.once("ready", () => {
          const folder = fetchOptions.folder || "INBOX";

          imap.openBox(folder, false, (err: any, box: any) => {
            if (err) {
              logger.error(`Error opening mailbox ${folder}:`, err);
              resolve({
                success: false,
                emails: [],
                totalCount: 0,
                newCount: 0,
                error: err.message,
              });
              return;
            }

            totalCount = box.messages.total;

            // Build search criteria
            const searchCriteria = this.buildSearchCriteria(fetchOptions);

            imap.search(searchCriteria, (err: any, results: any) => {
              if (err) {
                logger.error("Error searching emails:", err);
                resolve({
                  success: false,
                  emails: [],
                  totalCount: 0,
                  newCount: 0,
                  error: err.message,
                });
                return;
              }

              if (!results || results.length === 0) {
                logger.info("No emails found matching criteria");
                imap.end();
                resolve({
                  success: true,
                  emails: [],
                  totalCount,
                  newCount: 0,
                });
                return;
              }

              // Limit results
              const limit = fetchOptions.limit || 50;
              const limitedResults = results.slice(-limit); // Get most recent

              const imapFetchOptions: any = {
                bodies:
                  fetchOptions.includeBody !== false
                    ? ""
                    : "HEADER.FIELDS (FROM TO SUBJECT DATE MESSAGE-ID REFERENCES IN-REPLY-TO)",
                struct: true,
                markSeen: fetchOptions.markAsRead || false,
              };

              const fetch = imap.fetch(limitedResults, imapFetchOptions);
              let processedCount = 0;

              fetch.on("message", (msg: any, seqno: any) => {
                let emailData: any = {};
                let body = "";

                msg.on("body", (stream: any, info: any) => {
                  // Always collect body data if we're fetching it
                  stream.on("data", (chunk: any) => {
                    body += chunk.toString("utf8");
                  });
                });

                msg.once("attributes", (attrs: any) => {
                  emailData.uid = attrs.uid;
                  emailData.flags = attrs.flags;
                  emailData.date = attrs.date;
                  emailData.isRead = attrs.flags.includes("\\Seen");
                });

                msg.once("end", async () => {
                  try {
                    const parsed: any = await simpleParser(body);

                    console.log(`📧 IMAP message parsed:`, {
                      messageId: parsed.messageId || `${emailAccount._id}_${emailData.uid}`,
                      hasTextContent: !!parsed.text,
                      textContentLength: parsed.text?.length || 0,
                      hasHtmlContent: !!parsed.html,
                      htmlContentLength: parsed.html?.length || 0,
                      subject: parsed.subject,
                      from: parsed.from?.value[0]?.address,
                    });

                    const email: FetchedEmail = {
                      messageId: parsed.messageId || `${emailAccount._id}_${emailData.uid}`,
                      threadId: this.extractThreadId(parsed),
                      subject: parsed.subject || "(No Subject)",
                      from: {
                        email: parsed.from?.value[0]?.address || "",
                        name: parsed.from?.value[0]?.name,
                      },
                      to:
                        parsed.to?.value?.map((addr: any) => ({
                          email: addr.address,
                          name: addr.name,
                        })) || [],
                      cc:
                        parsed.cc?.value?.map((addr: any) => ({
                          email: addr.address,
                          name: addr.name,
                        })) || [],
                      date: parsed.date || emailData.date,
                      textContent: parsed.text,
                      htmlContent: parsed.html,
                      attachments:
                        parsed.attachments?.map((att: any) => ({
                          fileName: att.filename,
                          contentType: att.contentType,
                          size: att.size,
                          contentId: att.cid,
                        })) || [],
                      headers: this.parseHeaders(parsed.headers),
                      isRead: emailData.isRead,
                      uid: emailData.uid,
                      flags: emailData.flags,
                    };

                    emails.push(email);
                    processedCount++;

                    if (processedCount === limitedResults.length) {
                      imap.end();
                      resolve({
                        success: true,
                        emails,
                        totalCount,
                        newCount: emails.filter((e) => !e.isRead).length,
                      });
                    }
                  } catch (parseError: any) {
                    logger.error("Error parsing email:", parseError);
                    processedCount++;

                    if (processedCount === limitedResults.length) {
                      imap.end();
                      resolve({
                        success: true,
                        emails,
                        totalCount,
                        newCount: emails.filter((e) => !e.isRead).length,
                      });
                    }
                  }
                });
              });

              fetch.once("error", (err: any) => {
                logger.error("Fetch error:", err);
                resolve({
                  success: false,
                  emails: [],
                  totalCount: 0,
                  newCount: 0,
                  error: err.message,
                });
              });
            });
          });
        });

        imap.once("error", (err: any) => {
          logger.error("IMAP connection error:", err);
          resolve({
            success: false,
            emails: [],
            totalCount: 0,
            newCount: 0,
            error: err.message,
          });
        });

        imap.connect();
      } catch (error: any) {
        resolve({
          success: false,
          emails: [],
          totalCount: 0,
          newCount: 0,
          error: error.message,
        });
      }
    });
  }

  /**
   * Fetch emails using Gmail API (Enhanced with History API support)
   */
  private static async fetchFromGmailAPI(
    emailAccount: IEmailAccount,
    fetchOptions: EmailFetchOptions
  ): Promise<EmailFetchResult> {
    let currentAccount = emailAccount;

    try {
      console.log("🔐 GMAIL API FETCH START");
      console.log("OAuth details:", {
        hasAccessToken: !!currentAccount.oauth?.accessToken,
        hasRefreshToken: !!currentAccount.oauth?.refreshToken,
        accessTokenLength: currentAccount.oauth?.accessToken?.length,
        refreshTokenLength: currentAccount.oauth?.refreshToken?.length,
        provider: currentAccount.oauth?.provider,
      });

      if (!currentAccount.oauth?.accessToken) {
        console.log("❌ No OAuth access token available");
        throw new Error("Gmail OAuth access token not available");
      }

      // Check if we should use the new History API approach
      if (fetchOptions.useHistoryAPI || currentAccount.syncState?.syncStatus === "complete") {
        console.log("🔄 Using Gmail History API for efficient syncing");
        return await this.syncGmailWithHistoryAPI(currentAccount, fetchOptions);
      }

      console.log("🔑 Creating OAuth2 client");
      console.log("Environment variables:", {
        hasClientId: !!process.env.GOOGLE_CLIENT_ID,
        hasClientSecret: !!process.env.GOOGLE_CLIENT_SECRET,
        hasRedirectUri: !!process.env.GOOGLE_REDIRECT_URI,
        clientIdLength: process.env.GOOGLE_CLIENT_ID?.length,
        clientSecretLength: process.env.GOOGLE_CLIENT_SECRET?.length,
      });

      const oauth2Client = new google.auth.OAuth2(
        process.env.GOOGLE_CLIENT_ID,
        process.env.GOOGLE_CLIENT_SECRET,
        process.env.GOOGLE_REDIRECT_URI
      );

      // Decrypt tokens before using them
      const { EmailOAuthService } = await import("@/services/emailOAuth.service");
      const decryptedAccessToken = EmailOAuthService.getDecryptedAccessToken(currentAccount);
      const decryptedRefreshToken = currentAccount.oauth.refreshToken
        ? EmailOAuthService.decryptData(currentAccount.oauth.refreshToken)
        : undefined;

      if (!decryptedAccessToken) {
        throw new Error("Failed to decrypt access token");
      }

      oauth2Client.setCredentials({
        access_token: decryptedAccessToken,
        refresh_token: decryptedRefreshToken,
      });

      console.log("📧 Creating Gmail API client");
      const gmail = google.gmail({ version: "v1", auth: oauth2Client });

      // Build query for Gmail API
      let query = "";
      if (fetchOptions.since && !fetchOptions.fetchAll) {
        const sinceStr = Math.floor(fetchOptions.since.getTime() / 1000);
        query += `after:${sinceStr} `;
      }
      if (fetchOptions.folder && fetchOptions.folder !== "INBOX") {
        query += `in:${fetchOptions.folder.toLowerCase()} `;
      }

      let allMessages: any[] = [];
      let nextPageToken: string | undefined;
      let pageCount = 0;
      let lastListResponse: any = null;

      // Determine pagination strategy
      const usePagination = fetchOptions.page && fetchOptions.pageSize;
      const maxPages = usePagination ? 1 : fetchOptions.fetchAll ? 20 : 1; // Single page for pagination, multiple for fetchAll
      const maxResults = usePagination
        ? fetchOptions.pageSize!
        : fetchOptions.fetchAll
          ? 500
          : fetchOptions.limit || 50;

      // console.log("📊 Pagination settings:", {
      //   usePagination,
      //   page: fetchOptions.page,
      //   pageSize: fetchOptions.pageSize,
      //   maxPages,
      //   maxResults,
      //   fetchAll: fetchOptions.fetchAll,
      // });

      do {
        pageCount++;
        console.log(`📄 Fetching page ${pageCount}...`);

        const listResponse = await gmail.users.messages.list({
          userId: "me",
          q: query.trim(),
          maxResults: maxResults,
          pageToken: nextPageToken,
        });

        lastListResponse = listResponse;

        console.log(`📨 Gmail API response (page ${pageCount}):`, {
          totalMessages: listResponse.data.messages?.length || 0,
          resultSizeEstimate: listResponse.data.resultSizeEstimate,
          nextPageToken: !!listResponse.data.nextPageToken,
        });

        if (listResponse.data.messages) {
          allMessages = allMessages.concat(listResponse.data.messages);
        }

        nextPageToken = listResponse.data.nextPageToken || undefined;

        // Break if we've reached the max pages or no more pages
        if (pageCount >= maxPages || !nextPageToken) {
          break;
        }
      } while (nextPageToken);

      console.log(`📊 Total messages collected: ${allMessages.length} from ${pageCount} pages`);

      if (allMessages.length === 0) {
        console.log("📭 No messages found");
        return {
          success: true,
          emails: [],
          totalCount: 0,
          newCount: 0,
        };
      }

      // Fetch detailed message data
      console.log("📥 Fetching detailed message data");
      const emails: FetchedEmail[] = [];
      const messagePromises = allMessages.map(async (message: any, index: number) => {
        try {
          console.log(`📧 Fetching message ${index + 1}/${allMessages.length}: ${message.id}`);
          const messageResponse = await gmail.users.messages.get({
            userId: "me",
            id: message.id!,
            format: "full",
          });

          const msg = messageResponse.data;
          const headers = msg.payload?.headers || [];

          const parsedEmail = this.parseGmailMessage(msg, emailAccount);
          return parsedEmail;
        } catch (error: any) {
          console.log(`❌ Error fetching Gmail message ${message.id}:`, error.message);
          logger.error(`Error fetching Gmail message ${message.id}:`, error);
          return null;
        }
      });

      console.log("⏳ Waiting for all messages to be processed...");
      const fetchedMessages = await Promise.all(messagePromises);
      const validEmails = fetchedMessages.filter((email) => email !== null) as FetchedEmail[];
      const paginationData = usePagination
        ? {
            page: fetchOptions.page!,
            pageSize: fetchOptions.pageSize!,
            totalPages: Math.ceil(
              (lastListResponse?.data.resultSizeEstimate || allMessages.length) / fetchOptions.pageSize!
            ),
            hasNextPage: !!lastListResponse?.data.nextPageToken,
            nextPageToken: lastListResponse?.data.nextPageToken,
          }
        : undefined;

      console.log("📊 Pagination Debug:", {
        usePagination,
        requestedPage: fetchOptions.page,
        requestedPageSize: fetchOptions.pageSize,
        totalEmails: lastListResponse?.data.resultSizeEstimate || allMessages.length,
        fetchedEmails: allMessages.length,
        paginationData,
      });

      return {
        success: true,
        emails: validEmails,
        totalCount: lastListResponse?.data.resultSizeEstimate || allMessages.length,
        newCount: validEmails.filter((e) => !e.isRead).length,
        pagination: paginationData,
      };
    } catch (error: any) {
      console.log("❌ GMAIL API ERROR:", {
        message: error.message,
        code: error.code,
        status: error.status,
        statusText: error.statusText,
        stack: error.stack?.split("\n")[0],
      });
      logger.error("Gmail API fetch error:", error);

      // Check if it's an authentication error
      if (
        error.code === 401 ||
        error.message?.includes("invalid_grant") ||
        error.message?.includes("Invalid credentials")
      ) {
        console.log("🔄 Authentication error detected, attempting token refresh...");
        logger.warn(
          `Gmail authentication error for account ${currentAccount.emailAddress}, attempting token refresh...`
        );

        try {
          // Attempt to refresh the token
          console.log("🔑 Refreshing OAuth token...");
          currentAccount = await this.refreshGmailToken(currentAccount);
          console.log("✅ Token refresh successful, retrying fetch...");

          // Retry the operation with refreshed token
          logger.info(`Token refreshed successfully, retrying Gmail fetch for ${currentAccount.emailAddress}`);
          return await this.fetchFromGmailAPI(currentAccount, fetchOptions);
        } catch (refreshError: any) {
          console.log("❌ Token refresh failed:", refreshError.message);
          logger.error(`Token refresh failed for account ${currentAccount.emailAddress}:`, refreshError);

          // Update account status to reflect the authentication failure
          await EmailAccountModel.findByIdAndUpdate(currentAccount._id, {
            $set: {
              connectionStatus: "error",
              "stats.lastError": `Authentication failed: ${refreshError.message}. Please re-authenticate this account.`,
            },
          });

          throw new Error(`Gmail authentication failed: ${refreshError.message}. Please re-authenticate this account.`);
        }
      }

      // Update account with the error
      console.log("💾 Updating account with error status");
      await EmailAccountModel.findByIdAndUpdate(currentAccount._id, {
        $set: {
          connectionStatus: "error",
          "stats.lastError": error.message,
        },
      });

      throw error;
    }
  }

  /**
   * Fetch emails using Outlook/Microsoft Graph API
   */
  private static async fetchFromOutlookAPI(
    emailAccount: IEmailAccount,
    fetchOptions: EmailFetchOptions
  ): Promise<EmailFetchResult> {
    try {
      if (!emailAccount.oauth?.accessToken) {
        throw new Error("Outlook OAuth access token not available");
      }

      const graphClient = Client.init({
        authProvider: (done) => {
          done(null, emailAccount.oauth!.accessToken!);
        },
      });

      // Build query parameters
      let queryParams: any = {
        $top: fetchOptions.limit || 50,
        $orderby: "receivedDateTime desc",
      };

      if (fetchOptions.since) {
        queryParams.$filter = `receivedDateTime ge ${fetchOptions.since.toISOString()}`;
      }

      // Determine folder
      let folderPath = "me/mailFolders/inbox";
      if (fetchOptions.folder && fetchOptions.folder.toLowerCase() !== "inbox") {
        folderPath = `me/mailFolders/${fetchOptions.folder.toLowerCase()}`;
      }

      const messages = await graphClient.api(`${folderPath}/messages`).query(queryParams).get();

      if (!messages.value || messages.value.length === 0) {
        return {
          success: true,
          emails: [],
          totalCount: 0,
          newCount: 0,
        };
      }

      // Parse Outlook messages
      const emails: FetchedEmail[] = messages.value.map((msg: any) => this.parseOutlookMessage(msg, emailAccount));

      return {
        success: true,
        emails,
        totalCount: messages["@odata.count"] || emails.length,
        newCount: emails.filter((e) => !e.isRead).length,
      };
    } catch (error: any) {
      logger.error("Outlook API fetch error:", error);
      throw error;
    }
  }

  /**
   * Store fetched emails in database with thread management
   */
  private static async storeEmailsInDatabase(emails: FetchedEmail[], emailAccount: IEmailAccount): Promise<void> {
    for (const email of emails) {
      try {
        // Check if email already exists
        const existingEmail = await EmailModel.findOne({ messageId: email.messageId });
        if (existingEmail) {
          continue; // Skip if already exists
        }

        // Use the new threading service to find or create thread
        const { EmailThreadingService } = await import("@/services/email-threading.service");
        // Prepare email data for threading service
        const emailData: Partial<any | IEmail> = {
          messageId: email.messageId,
          threadId: email.threadId,
          accountId: emailAccount._id,
          direction: "inbound",
          type: "general",
          status: "received",
          subject: email.subject,
          normalizedSubject: this.normalizeSubject(email.subject),
          textContent: email.textContent,
          htmlContent: email.htmlContent,
          from: email.from,
          to: email.to,
          cc: email.cc,
          bcc: email.bcc,
          replyTo: email.replyTo,
          headers: email.headers,
          attachments: email.attachments,
          receivedAt: email.date,
          isRead: email.isRead,
          readAt: email.isRead ? new Date() : undefined,
          // Threading headers
          inReplyTo: email.inReplyTo,
          references: email.references,
          parentMessageId: email.parentMessageId,
          folder: "INBOX",
        };

        // Find or create thread using the threading service
        const threadId = await EmailThreadingService.findOrCreateThread(emailData as IEmail);

        // Update email data with thread ID
        emailData.threadId = threadId;

        // Create email document
        const emailDoc = new EmailModel(emailData);
        await emailDoc.save();

        console.log(`💾 Email stored in database:`, {
          messageId: email.messageId,
          subject: email.subject,
          hasTextContent: !!email.textContent,
          textContentLength: email.textContent?.length || 0,
          hasHtmlContent: !!email.htmlContent,
          htmlContentLength: email.htmlContent?.length || 0,
          threadId: threadId,
        });

        logger.debug(`Stored email: ${email.subject} in thread: ${threadId}`);
      } catch (error: any) {
        // Handle database connection errors gracefully
        if (error.name === "MongoNotConnectedError" || error.message?.includes("Client must be connected")) {
          logger.warn(`Database connection lost while storing email ${email.messageId}, skipping...`);
          break; // Stop processing more emails if DB is disconnected
        }
        logger.error(`Error storing email ${email.messageId}:`, error);
      }
    }
  }

  /**
   * Normalize email subject by removing common prefixes
   */
  private static normalizeSubject(subject: string): string {
    return subject
      .replace(/^(Re:|Fwd?:|RE:|FWD?:|FW:|fw:)\s*/gi, "") // Remove Re:/Fwd: prefixes
      .replace(/^\[.*?\]\s*/g, "") // Remove [tag] prefixes
      .trim()
      .toLowerCase();
  }

  // Helper methods
  private static createIMAPConnection(emailAccount: IEmailAccount): Imap {
    const { incomingServer } = emailAccount;

    return new Imap({
      user: incomingServer.username,
      password: EmailAccountConfigService.decryptPassword(incomingServer.password),
      host: incomingServer.host,
      port: incomingServer.port,
      tls: incomingServer.security === "ssl",
      tlsOptions: { rejectUnauthorized: false },
    });
  }

  private static buildSearchCriteria(options: EmailFetchOptions): any[] {
    const criteria: any = ["ALL"];

    if (options.since) {
      criteria.push(["SINCE", options.since]);
    }

    return criteria;
  }

  private static extractThreadId(parsed: any): string | undefined {
    // Try to extract thread ID from References or In-Reply-To headers
    const references = parsed.references;
    const inReplyTo = parsed.inReplyTo;

    if (references && references.length > 0) {
      return references[0].replace(/[<>]/g, "");
    }

    if (inReplyTo) {
      return inReplyTo.replace(/[<>]/g, "");
    }

    return undefined;
  }

  private static parseHeaders(headers: any): any[] {
    const headerArray: any[] = [];

    if (headers) {
      for (const [name, value] of headers.entries()) {
        headerArray.push({ name, value: value.toString() });
      }
    }

    return headerArray;
  }

  private static parseGmailMessage(msg: any, emailAccount: IEmailAccount): FetchedEmail {
    const headers = msg.payload?.headers || [];
    const getHeader = (name: string) => headers.find((h: any) => h.name.toLowerCase() === name.toLowerCase())?.value;

    // Extract threading headers (RFC 2822 standard)
    const messageId = getHeader("Message-ID") || msg.id;
    const inReplyTo = getHeader("In-Reply-To");
    const references = getHeader("References");
    const referencesArray = references ? references.split(/\s+/).filter(Boolean) : [];

    // Parse addresses
    const from = this.parseSingleAddress(getHeader("From"));
    const to = this.parseAddressHeader(getHeader("To"));
    const cc = this.parseAddressHeader(getHeader("Cc"));
    const bcc = this.parseAddressHeader(getHeader("Bcc"));
    const replyTo = this.parseSingleAddress(getHeader("Reply-To"));

    // Extract content
    const textContent = this.extractTextFromGmailPayload(msg.payload);
    const htmlContent = this.extractHtmlFromGmailPayload(msg.payload);
    return {
      messageId: msg.id!,
      threadId: msg.threadId, // Gmail's native thread ID
      subject: getHeader("Subject") || "(No Subject)",
      from: from || { email: "", name: "" },
      to: to,
      cc: cc,
      bcc: bcc,
      replyTo: replyTo || undefined,
      date: new Date(parseInt(msg.internalDate!)),
      textContent: textContent,
      htmlContent: htmlContent,
      isRead: !msg.labelIds?.includes("UNREAD"),
      headers: headers.map((h: any) => ({ name: h.name, value: h.value })),
      // Threading headers
      inReplyTo: inReplyTo,
      references: referencesArray,
      parentMessageId:
        inReplyTo || (referencesArray.length > 0 ? referencesArray[referencesArray.length - 1] : undefined),
    };
  }

  private static parseOutlookMessage(msg: any, emailAccount: IEmailAccount): FetchedEmail {
    // Extract content based on body type
    let textContent: string | undefined;
    let htmlContent: string | undefined;

    if (msg.body) {
      if (msg.body.contentType === "text") {
        textContent = msg.body.content;
      } else if (msg.body.contentType === "html") {
        htmlContent = msg.body.content;
      }
    }

    // If we have HTML but no text, try to extract text from HTML
    if (htmlContent && !textContent) {
      try {
        // Simple HTML to text conversion (remove HTML tags)
        textContent = htmlContent
          .replace(/<[^>]*>/g, "")
          .replace(/\s+/g, " ")
          .trim();
      } catch (error) {
        console.log("Error converting HTML to text:", error);
      }
    }

    console.log(`📧 Outlook message parsed:`, {
      messageId: msg.id,
      hasTextContent: !!textContent,
      textContentLength: textContent?.length || 0,
      hasHtmlContent: !!htmlContent,
      htmlContentLength: htmlContent?.length || 0,
      subject: msg.subject,
      from: msg.from?.emailAddress?.address,
      bodyContentType: msg.body?.contentType,
    });

    return {
      messageId: msg.id,
      threadId: msg.conversationId,
      subject: msg.subject || "(No Subject)",
      from: {
        email: msg.from?.emailAddress?.address || "",
        name: msg.from?.emailAddress?.name,
      },
      to:
        msg.toRecipients?.map((r: any) => ({
          email: r.emailAddress.address,
          name: r.emailAddress.name,
        })) || [],
      cc:
        msg.ccRecipients?.map((r: any) => ({
          email: r.emailAddress.address,
          name: r.emailAddress.name,
        })) || [],
      date: new Date(msg.receivedDateTime),
      textContent: textContent,
      htmlContent: htmlContent,
      isRead: msg.isRead,
      attachments:
        msg.attachments?.map((att: any) => ({
          fileName: att.name,
          contentType: att.contentType,
          size: att.size,
        })) || [],
    };
  }

  private static parseAddressHeader(header?: string): { email: string; name?: string }[] {
    if (!header) return [];

    const addresses: { email: string; name?: string }[] = [];
    const parts = header.split(",");

    for (const part of parts) {
      const trimmed = part.trim();
      const match = trimmed.match(/^(.+)<(.+)>$/) || trimmed.match(/^(.+)$/);

      if (match) {
        const email = match[2] || match[1];
        const name = match[2] ? match[1].trim().replace(/"/g, "") : undefined;
        addresses.push({ email: email.trim(), name });
      }
    }

    return addresses;
  }

  private static parseSingleAddress(header?: string): { email: string; name?: string } | null {
    if (!header) return null;

    const trimmed = header.trim();
    const match = trimmed.match(/^(.+)<(.+)>$/) || trimmed.match(/^(.+)$/);

    if (match) {
      const email = match[2] || match[1];
      const name = match[2] ? match[1].trim().replace(/"/g, "") : undefined;
      return { email: email.trim(), name };
    }

    return null;
  }

  private static extractTextFromGmailPayload(payload: any): string | undefined {
    if (!payload) return undefined;

    // If payload has text content directly
    if (payload.body?.data) {
      try {
        const decoded = Buffer.from(payload.body.data, "base64").toString("utf-8");
        return decoded;
      } catch (error) {
        console.log("Error decoding Gmail text body:", error);
      }
    }

    // Handle multipart messages
    if (payload.parts) {
      for (const part of payload.parts) {
        // Look for text/plain content
        if (part.mimeType === "text/plain") {
          if (part.body?.data) {
            try {
              const decoded = Buffer.from(part.body.data, "base64").toString("utf-8");
              return decoded;
            } catch (error) {
              console.log("Error decoding Gmail text part:", error);
            }
          }
        }

        // Recursively check nested parts
        if (part.parts) {
          const nestedText = this.extractTextFromGmailPayload(part);
          if (nestedText) return nestedText;
        }
      }
    }

    return undefined;
  }

  private static extractHtmlFromGmailPayload(payload: any): string | undefined {
    if (!payload) return undefined;

    // If payload has HTML content directly
    if (payload.body?.data) {
      try {
        const decoded = Buffer.from(payload.body.data, "base64").toString("utf-8");
        return decoded;
      } catch (error) {
        console.log("Error decoding Gmail HTML body:", error);
      }
    }

    // Handle multipart messages
    if (payload.parts) {
      for (const part of payload.parts) {
        // Look for text/html content
        if (part.mimeType === "text/html") {
          if (part.body?.data) {
            try {
              const decoded = Buffer.from(part.body.data, "base64").toString("utf-8");
              return decoded;
            } catch (error) {
              console.log("Error decoding Gmail HTML part:", error);
            }
          }
        }

        // Recursively check nested parts
        if (part.parts) {
          const nestedHtml = this.extractHtmlFromGmailPayload(part);
          if (nestedHtml) return nestedHtml;
        }
      }
    }

    return undefined;
  }

  private static async updateAccountStats(emailAccount: IEmailAccount, result: EmailFetchResult): Promise<void> {
    try {
      const totalEmails = await EmailModel.countDocuments({ accountId: emailAccount._id });
      const unreadEmails = await EmailModel.countDocuments({ accountId: emailAccount._id, isRead: false });

      emailAccount.stats = {
        ...emailAccount.stats,
        totalEmails,
        unreadEmails,
        lastSyncAt: new Date(),
        lastError: result.success ? undefined : result.error,
        lastErrorAt: result.success ? undefined : new Date(),
      };

      emailAccount.connectionStatus = result.success ? "connected" : "error";
      emailAccount.status = result.success ? "active" : "error";

      await emailAccount.save();
    } catch (error: any) {
      // Handle database connection errors gracefully
      if (error.name === "MongoNotConnectedError" || error.message?.includes("Client must be connected")) {
        logger.warn(`Database connection lost while updating account stats for ${emailAccount.emailAddress}`);
        return;
      }
      logger.error("Error updating account stats:", error);
    }
  }

  private static async updateAccountError(emailAccount: IEmailAccount, error: string): Promise<void> {
    try {
      emailAccount.stats = {
        ...emailAccount.stats,
        lastError: error,
        lastErrorAt: new Date(),
      };
      emailAccount.connectionStatus = "error";
      emailAccount.status = "error";

      await emailAccount.save();
    } catch (updateError: any) {
      logger.error("Error updating account error status:", updateError);
    }
  }

  /**
   * Get Gmail OAuth client
   */
  private static async getGmailAuthClient(emailAccount: IEmailAccount): Promise<any> {
    const { EmailOAuthService } = await import("@/services/emailOAuth.service");

    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URI
    );

    const decryptedAccessToken = EmailOAuthService.getDecryptedAccessToken(emailAccount);
    const decryptedRefreshToken = emailAccount.oauth?.refreshToken
      ? EmailOAuthService.decryptData(emailAccount.oauth.refreshToken)
      : undefined;

    if (!decryptedAccessToken) {
      throw new Error("Failed to decrypt access token");
    }

    oauth2Client.setCredentials({
      access_token: decryptedAccessToken,
      refresh_token: decryptedRefreshToken,
    });

    return oauth2Client;
  }

  /**
   * Check API quota
   */
  private static async checkQuota(emailAccount: IEmailAccount): Promise<boolean> {
    const quotaUsage = emailAccount.syncState?.quotaUsage?.daily || 0;
    const remaining = this.QUOTA_LIMIT - quotaUsage;

    if (remaining < 1000) {
      logger.warn(`Low quota remaining for account ${emailAccount.emailAddress}: ${remaining}`);
      return false;
    }

    return true;
  }

  /**
   * Update sync state
   */
  private static async updateSyncState(emailAccount: IEmailAccount, updates: any): Promise<void> {
    try {
      await EmailAccountModel.findByIdAndUpdate(emailAccount._id, {
        $set: { syncState: { ...emailAccount.syncState, ...updates } },
      });
    } catch (error: any) {
      logger.error(`Error updating sync state for ${emailAccount.emailAddress}:`, error);
    }
  }

  /**
   * Update sync progress
   */
  private static async updateSyncProgress(
    emailAccount: IEmailAccount,
    totalProcessed: number,
    historyId: string,
    batchCount: number
  ): Promise<void> {
    await this.updateSyncState(emailAccount, {
      lastHistoryId: historyId,
      syncProgress: {
        totalProcessed,
        currentBatch: batchCount,
        estimatedTotal: totalProcessed,
      },
    });
  }

  /**
   * Update sync error
   */
  private static async updateSyncError(emailAccount: IEmailAccount, error: string): Promise<void> {
    await this.updateSyncState(emailAccount, {
      syncStatus: "error",
      lastError: error,
      lastErrorAt: new Date(),
    });
  }

  /**
   * Update message labels
   */
  private static async updateMessageLabels(historyEntry: any, emailAccount: IEmailAccount): Promise<void> {
    try {
      // This would update message labels in your database
      // Implementation depends on your specific requirements
      logger.info(`Processing label changes for ${emailAccount.emailAddress}`);
    } catch (error: any) {
      logger.error(`Error updating message labels:`, error);
    }
  }

  /**
   * Utility delay function
   */
  private static delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
