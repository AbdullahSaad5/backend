import { IEmailAccount, EmailAccountModel } from "@/models/email-account.model";
import { EmailModel } from "@/models/email.model";

import { EmailAccountConfigService } from "./email-account-config.service";
import { logger } from "@/utils/logger.util";
import Imap from "imap";
import { simpleParser } from "mailparser";
import { google } from "googleapis";

import { IEmail } from "@/contracts/mailbox.contract";
import { getStoredGmailAuthClient } from "@/utils/gmail-helpers.util";
import { GmailThreadModel } from "@/models/gmail-thread.model";
import { OutlookThreadModel } from "@/models/outlook-thread.model";

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
  message?: string;
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
            // For Gmail accounts, use the RealTimeEmailSyncService instead
            console.log("🔄 Redirecting to RealTimeEmailSyncService for Gmail");
            const { RealTimeEmailSyncService } = await import("@/services/real-time-email-sync.service");
            const syncResult = await RealTimeEmailSyncService.syncGmailEmails(emailAccount, undefined);

            // Convert RealTimeSyncResult to EmailFetchResult
            result = {
              success: syncResult.success,
              emails: [], // Gmail sync doesn't return individual emails
              totalCount: syncResult.emailsProcessed || 0,
              newCount: syncResult.emailsProcessed || 0,
              message: syncResult.message,
              error: syncResult.error,
            };
          } else {
            console.log("📨 Using IMAP for Gmail");
            result = await this.fetchFromIMAP(emailAccount, fetchOptions);
          }
          break;

        case "outlook":
          if (emailAccount.oauth) {
            // Use thread metadata approach only - no individual message fetching
            console.log("🔄 Outlook now uses thread metadata approach only");
            result = {
              success: true,
              emails: [],
              totalCount: 0,
              newCount: 0,
              message: "Outlook uses thread metadata approach. Use thread metadata endpoints.",
            };
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
        // This function no longer exists, redirect to RealTimeEmailSyncService
        const { RealTimeEmailSyncService } = await import("@/services/real-time-email-sync.service");
        const syncResult = await RealTimeEmailSyncService.syncGmailEmails(emailAccount, undefined);
        return {
          success: syncResult.success,
          emails: [],
          totalCount: syncResult.emailsProcessed || 0,
          newCount: syncResult.emailsProcessed || 0,
          message: syncResult.message,
          error: syncResult.error,
        };
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

      // For fetchAll, we want to get ALL emails without any date restrictions
      if (fetchOptions.fetchAll) {
        console.log("🔄 Fetching ALL emails (no date restrictions)");
        // Don't add any date filters - this will fetch all emails
      } else {
        console.log("📅 Fetching recent emails only");
      }

      let allMessages: any[] = [];
      let nextPageToken: string | undefined;
      let pageCount = 0;
      let lastListResponse: any = null;

      // Determine pagination strategy for fetchAll
      const usePagination = fetchOptions.page && fetchOptions.pageSize;
      const maxPages = usePagination ? 1 : fetchOptions.fetchAll ? 50 : 1; // Increase max pages for fetchAll
      const maxResults = usePagination
        ? fetchOptions.pageSize!
        : fetchOptions.fetchAll
          ? 500 // Maximum allowed by Gmail API
          : fetchOptions.limit || 50;

      console.log("📊 Gmail API settings:", {
        usePagination,
        page: fetchOptions.page,
        pageSize: fetchOptions.pageSize,
        maxPages,
        maxResults,
        fetchAll: fetchOptions.fetchAll,
        query: query.trim() || "ALL",
      });

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
          // Token refresh is now handled by RealTimeEmailSyncService
          throw new Error("Token refresh required - please re-authenticate this account");
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
   * Store fetched emails in database with thread management using bulk operations
   */
  static async storeEmailsInDatabase(emails: FetchedEmail[], emailAccount: IEmailAccount): Promise<void> {
    if (emails.length === 0) return;

    try {
      // Enhanced duplicate check with bulk operation
      const messageIds = emails.map((email) => email.messageId);
      const existingEmails = await EmailModel.find({
        $or: [
          { messageId: { $in: messageIds } },
          {
            $and: [
              { accountId: emailAccount._id },
              { "from.email": { $in: emails.map((e) => e.from.email) } },
              { subject: { $in: emails.map((e) => e.subject) } },
              { receivedAt: { $gte: new Date(Date.now() - 300000) } }, // Within 5 minutes
            ],
          },
        ],
      }).select("messageId");

      const existingMessageIds = new Set(existingEmails.map((e) => e.messageId));
      const newEmails = emails.filter((email) => !existingMessageIds.has(email.messageId));

      if (newEmails.length === 0) {
        console.log(`💾 All ${emails.length} emails already exist in database`);
        return;
      }

      console.log(`💾 Processing ${newEmails.length} new emails out of ${emails.length} total`);

      // Use the threading service to find or create threads

      // Prepare email data for bulk insertion
      const emailDocs = [];

      for (const email of newEmails) {
        try {
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

          // Find or create thread using the appropriate thread model
          let threadId = email.threadId;

          if (!threadId) {
            // Determine which thread model to use based on email source
            let ThreadModel;
            if (email.from?.email.includes("@gmail.com")) {
              ThreadModel = GmailThreadModel;
            } else if (email.from?.email.includes("@outlook.com") || email.from?.email.includes("@hotmail.com")) {
              ThreadModel = OutlookThreadModel;
            } else {
              // Fallback to Gmail thread model
              ThreadModel = GmailThreadModel;
            }

            // Generate thread ID based on subject
            const normalizedSubject = this.normalizeSubject(email.subject);
            threadId = `thread_${normalizedSubject.replace(/[^a-zA-Z0-9]/g, "_")}_${Date.now()}`;

            // Create thread in appropriate collection
            try {
              const threadData = {
                threadId: threadId,
                accountId: emailAccount._id,
                subject: email.subject,
                normalizedSubject: normalizedSubject,
                messageCount: 1,
                participants: [email.from, ...email.to],
                firstMessageAt: email.date,
                lastMessageAt: email.date,
                status: "active",
              };

              await ThreadModel.create(threadData);
            } catch (threadError: any) {
              logger.error(`Error creating thread:`, threadError);
              // Continue with generated threadId even if thread creation fails
            }
          }

          // Update email data with thread ID
          emailData.threadId = threadId;

          // Create email document for bulk insertion
          const emailDoc = new EmailModel(emailData);
          emailDocs.push(emailDoc);
        } catch (error: any) {
          logger.error(`Error preparing email ${email.messageId} for storage:`, error);
        }
      }

      // Bulk insert all emails
      if (emailDocs.length > 0) {
        await EmailModel.insertMany(emailDocs, { ordered: false });
        console.log(`💾 Bulk inserted ${emailDocs.length} emails to database`);

        logger.info(`Bulk stored ${emailDocs.length} emails for account: ${emailAccount.emailAddress}`);
      }
    } catch (error: any) {
      // Handle database connection errors gracefully
      if (error.name === "MongoNotConnectedError" || error.message?.includes("Client must be connected")) {
        logger.warn(`Database connection lost while storing emails, skipping...`);
        return;
      }
      logger.error(`Error bulk storing emails:`, error);

      // Fallback to individual saves if bulk operation fails
      console.log(`🔄 Falling back to individual email storage due to bulk operation failure`);
      for (const email of emails) {
        try {
          const emailDoc = new EmailModel({
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
            inReplyTo: email.inReplyTo,
            references: email.references,
            parentMessageId: email.parentMessageId,
            folder: "INBOX",
          });
          await emailDoc.save();
        } catch (saveError: any) {
          logger.error(`Error storing email ${email.messageId}:`, saveError);
        }
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

  static parseGmailMessage(msg: any, emailAccount: IEmailAccount): FetchedEmail {
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
   * Get Gmail OAuth client using centralized helper
   */
  static async getGmailAuthClient(emailAccount: IEmailAccount): Promise<any> {
    const result = await getStoredGmailAuthClient(emailAccount);

    if (!result.success) {
      throw new Error(result.error || "Gmail authentication failed");
    }

    return result.oauth2Client;
  }

  /**
   * Get Outlook access token
   */
  private static async getOutlookAccessToken(emailAccount: IEmailAccount): Promise<string | null> {
    try {
      // Check if current access token is still valid
      if (emailAccount.oauth?.accessToken && emailAccount.oauth?.tokenExpiry) {
        const now = new Date();
        const expiry = new Date(emailAccount.oauth.tokenExpiry);

        if (now < expiry) {
          // Token is still valid, decrypt and return
          const { EmailOAuthService } = await import("@/services/emailOAuth.service");
          return EmailOAuthService.getDecryptedAccessToken(emailAccount);
        }
      }

      // Token expired or not available, refresh it
      const { EmailOAuthService } = await import("@/services/emailOAuth.service");
      const refreshResult = await EmailOAuthService.refreshTokens(emailAccount);
      if (!refreshResult.success) {
        throw new Error(`Failed to refresh Outlook tokens: ${refreshResult.error}`);
      }

      return EmailOAuthService.getDecryptedAccessToken(emailAccount);
    } catch (error: any) {
      logger.error("Error getting Outlook access token:", error);
      return null;
    }
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
}
