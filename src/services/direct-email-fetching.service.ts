import { IEmailAccount } from "@/models/email-account.model";
import { logger } from "@/utils/logger.util";
import { google } from "googleapis";
import { Client } from "@microsoft/microsoft-graph-client";
import Imap from "imap";
import { simpleParser } from "mailparser";
import { EmailOAuthService } from "./emailOAuth.service";
import { EmailThreadingService } from "./email-threading.service";

export interface DirectEmailData {
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
  snippet?: string;
  category?: string;
  labels?: string[];
  // Threading headers (RFC 2822 standard)
  inReplyTo?: string;
  references?: string[];
  parentMessageId?: string;
}

export interface DirectEmailThread {
  threadId: string;
  subject: string;
  participants: { email: string; name?: string }[];
  messageCount: number;
  unreadCount: number;
  firstMessageAt: Date;
  lastMessageAt: Date;
  status: "active" | "closed" | "archived" | "spam";
  category?: string;
  labels?: string[];
  emails: DirectEmailData[];
}

export interface DirectEmailFetchResult {
  success: boolean;
  emails: DirectEmailData[];
  threads: DirectEmailThread[];
  totalCount: number;
  pagination: {
    page: number;
    pageSize: number;
    totalPages: number;
    hasNextPage: boolean;
    nextPageToken?: string;
    nextCursor?: string;
  };
  error?: string;
  requiresReauth?: boolean;
}

export interface DirectEmailFetchOptions {
  folder?: string;
  page?: number;
  pageSize?: number;
  since?: Date;
  before?: Date;
  query?: string;
  labelIds?: string[];
  includeBody?: boolean;
  markAsRead?: boolean;
  sortBy?: "date" | "from" | "subject" | "size";
  sortOrder?: "asc" | "desc";
  groupByThread?: boolean; // New option to group emails by thread
}

export class DirectEmailFetchingService {
  private static readonly DEFAULT_PAGE_SIZE = 50;
  private static readonly MAX_PAGE_SIZE = 200;
  private static readonly RATE_LIMIT_DELAY = 100;

  /**
   * Main method to fetch emails directly from any configured account
   */
  static async fetchEmailsDirectly(
    emailAccount: IEmailAccount,
    options: DirectEmailFetchOptions = {}
  ): Promise<DirectEmailFetchResult> {
    try {
      logger.info(`Starting direct email fetch for account: ${emailAccount.emailAddress}`);

      // Check account status
      if (!emailAccount.isActive || emailAccount.status === "error") {
        const errorMsg = `Email account is not active or has errors`;
        logger.warn(`${errorMsg} for account: ${emailAccount.emailAddress}`);
        throw new Error(errorMsg);
      }

      let result: DirectEmailFetchResult;

      // Route to appropriate fetching method based on account type
      switch (emailAccount.accountType) {
        case "gmail":
          if (emailAccount.oauth) {
            logger.info(`Using Gmail API with OAuth for account: ${emailAccount.emailAddress}`);
            result = await this.fetchFromGmailAPIDirect(emailAccount, options);
          } else {
            logger.info(`Using IMAP for Gmail account: ${emailAccount.emailAddress}`);
            result = await this.fetchFromIMAPDirect(emailAccount, options);
          }
          break;

        case "outlook":
          if (emailAccount.oauth) {
            result = await this.fetchFromOutlookAPIDirect(emailAccount, options);
          } else {
            result = await this.fetchFromIMAPDirect(emailAccount, options);
          }
          break;

        case "imap":
        case "exchange":
        case "custom":
        default:
          result = await this.fetchFromIMAPDirect(emailAccount, options);
          break;
      }

      // Group emails by thread if requested
      if (options.groupByThread && result.success) {
        result.threads = this.groupEmailsByThread(result.emails);
      }

      // Update account stats on successful fetch
      if (result.success) {
        await this.updateAccountSuccess(emailAccount);
        logger.info(
          `Direct email fetch completed for ${emailAccount.emailAddress}: ${result.emails.length} emails fetched`
        );
      }

      return result;
    } catch (error: any) {
      logger.error(`Direct email fetch failed for ${emailAccount.emailAddress}:`, error);

      // Provide specific error messages for common authentication issues
      let userFriendlyError = error.message;

      if (error.message.includes("invalid_grant") || error.message.includes("Token has been expired")) {
        userFriendlyError = "Gmail authentication expired. Please re-authenticate your account.";
      } else if (error.message.includes("Authentication failed")) {
        userFriendlyError = "Authentication failed. Please check your account credentials.";
      } else if (error.message.includes("Gmail API error")) {
        userFriendlyError = "Gmail API error. Please try again or re-authenticate if the issue persists.";
      }

      // Update account with error status
      await this.updateAccountError(emailAccount, userFriendlyError);

      return {
        success: false,
        emails: [],
        threads: [],
        totalCount: 0,
        pagination: {
          page: options.page || 1,
          pageSize: options.pageSize || this.DEFAULT_PAGE_SIZE,
          totalPages: 0,
          hasNextPage: false,
        },
        error: userFriendlyError,
        requiresReauth: error.message.includes("re-authenticate") || error.message.includes("invalid_grant"),
      };
    }
  }

  /**
   * Direct Gmail API fetching without database storage
   */
  private static async fetchFromGmailAPIDirect(
    emailAccount: IEmailAccount,
    options: DirectEmailFetchOptions
  ): Promise<DirectEmailFetchResult> {
    let currentAccount = emailAccount;

    try {
      const gmail = google.gmail({ version: "v1", auth: await this.getGmailAuthClient(currentAccount) });

      // Build query for Gmail API
      const query = this.buildGmailQuery(options);

      // Calculate pagination
      const pageSize = Math.min(options.pageSize || this.DEFAULT_PAGE_SIZE, this.MAX_PAGE_SIZE);
      const page = options.page || 1;

      // For Gmail, we need to handle pagination differently since it doesn't support page-based pagination
      // We'll use the pageToken approach and calculate our own pagination
      const maxResults = pageSize * page; // Fetch enough emails to reach the requested page

      const messagesResponse = await gmail.users.messages.list({
        userId: "me",
        q: query,
        maxResults: maxResults,
        labelIds: options.labelIds,
      });

      const messages = messagesResponse.data.messages || [];
      const totalCount = messagesResponse.data.resultSizeEstimate || 0;

      // Calculate pagination info
      const totalPages = Math.ceil(totalCount / pageSize);
      const startIndex = (page - 1) * pageSize;
      const endIndex = startIndex + pageSize;
      const pageMessages = messages.slice(startIndex, endIndex);

      // Fetch detailed message data for the current page
      const emails: DirectEmailData[] = [];
      for (const message of pageMessages) {
        try {
          const messageResponse = await gmail.users.messages.get({
            userId: "me",
            id: message.id!,
            format: "full",
          });

          const email = await this.parseGmailMessageDirect(messageResponse.data, currentAccount);
          emails.push(email);

          // Rate limiting
          await this.delay(this.RATE_LIMIT_DELAY);
        } catch (error: any) {
          logger.warn(`Failed to fetch Gmail message ${message.id}: ${error.message}`);
        }
      }

      return {
        success: true,
        emails,
        threads: [],
        totalCount,
        pagination: {
          page,
          pageSize,
          totalPages,
          hasNextPage: page < totalPages,
          nextPageToken: messagesResponse.data.nextPageToken || undefined,
        },
      };
    } catch (error: any) {
      // Check if this is an authentication error that can be resolved with token refresh
      if (this.isAuthenticationError(error) && currentAccount.oauth?.refreshToken) {
        try {
          console.log("🔑 Refreshing OAuth token...");
          currentAccount = await this.refreshGmailToken(currentAccount);
          console.log("✅ Token refresh successful, retrying fetch...");

          // Retry the operation with refreshed token
          logger.info(`Token refreshed successfully, retrying Gmail fetch for ${currentAccount.emailAddress}`);
          return await this.fetchFromGmailAPIDirect(currentAccount, options);
        } catch (refreshError: any) {
          console.log("❌ Token refresh failed:", refreshError.message);
          logger.error(`Token refresh failed for account ${currentAccount.emailAddress}:`, refreshError);

          // Update account status to reflect the authentication failure
          await this.updateAccountError(
            currentAccount,
            `Authentication failed: ${refreshError.message}. Please re-authenticate this account.`
          );

          throw new Error(`Gmail authentication failed: ${refreshError.message}. Please re-authenticate this account.`);
        }
      }

      // Update account with the error
      console.log("💾 Updating account with error status");
      await this.updateAccountError(currentAccount, error.message);

      throw new Error(`Gmail API error: ${error.message}`);
    }
  }

  /**
   * Direct IMAP fetching without database storage
   */
  private static async fetchFromIMAPDirect(
    emailAccount: IEmailAccount,
    options: DirectEmailFetchOptions
  ): Promise<DirectEmailFetchResult> {
    return new Promise((resolve) => {
      try {
        const imap = new Imap({
          user: emailAccount.incomingServer.username,
          password: emailAccount.incomingServer.password,
          host: emailAccount.incomingServer.host,
          port: emailAccount.incomingServer.port,
          tls: emailAccount.incomingServer.security === "ssl",
          tlsOptions: { rejectUnauthorized: false },
        });

        const emails: DirectEmailData[] = [];
        let totalCount = 0;

        imap.once("ready", () => {
          const folder = options.folder || "INBOX";
          imap.openBox(folder, true, (err: any, box: any) => {
            if (err) {
              resolve({
                success: false,
                emails: [],
                threads: [],
                totalCount: 0,
                pagination: {
                  page: options.page || 1,
                  pageSize: options.pageSize || this.DEFAULT_PAGE_SIZE,
                  totalPages: 0,
                  hasNextPage: false,
                },
                error: err.message,
              });
              return;
            }

            totalCount = box.messages.total;

            // Build search criteria
            const searchCriteria = this.buildIMAPSearchCriteria(options);

            // Calculate pagination
            const pageSize = Math.min(options.pageSize || this.DEFAULT_PAGE_SIZE, this.MAX_PAGE_SIZE);
            const page = options.page || 1;
            const startIndex = Math.max(1, totalCount - page * pageSize + 1);
            const endIndex = Math.max(1, totalCount - (page - 1) * pageSize);

            imap.search(searchCriteria, (err: any, results: any) => {
              if (err) {
                resolve({
                  success: false,
                  emails: [],
                  threads: [],
                  totalCount: 0,
                  pagination: {
                    page,
                    pageSize,
                    totalPages: 0,
                    hasNextPage: false,
                  },
                  error: err.message,
                });
                return;
              }

              // Get the emails for the current page
              const pageResults = results.slice(startIndex - 1, endIndex);

              if (pageResults.length === 0) {
                resolve({
                  success: true,
                  emails: [],
                  threads: [],
                  totalCount,
                  pagination: {
                    page,
                    pageSize,
                    totalPages: Math.ceil(totalCount / pageSize),
                    hasNextPage: page < Math.ceil(totalCount / pageSize),
                  },
                });
                return;
              }

              const fetch = imap.fetch(pageResults, {
                bodies: options.includeBody ? "" : "HEADER",
                struct: true,
              });

              fetch.on("message", (msg: any, seqno: any) => {
                let headers: any = {};
                let body = "";

                msg.on("body", (stream: any, info: any) => {
                  let buffer = "";
                  stream.on("data", (chunk: any) => {
                    buffer += chunk.toString("ascii");
                  });
                  stream.once("end", () => {
                    if (options.includeBody) {
                      body = buffer;
                    } else {
                      headers = Imap.parseHeader(buffer);
                    }
                  });
                });

                msg.once("end", () => {
                  if (options.includeBody) {
                    // Parse the full message
                    simpleParser(body).then((parsed: any) => {
                      const email: DirectEmailData = {
                        messageId: `imap_${seqno}_${Date.now()}`,
                        threadId: `imap_thread_${seqno}`,
                        subject: parsed.subject || "",
                        from: {
                          email: Array.isArray(parsed.from?.value)
                            ? parsed.from.value[0]?.address || ""
                            : parsed.from?.value?.address || "",
                          name: Array.isArray(parsed.from?.value)
                            ? parsed.from.value[0]?.name || ""
                            : parsed.from?.value?.name || "",
                        },
                        to: Array.isArray(parsed.to?.value)
                          ? parsed.to.value.map((to: any) => ({
                              email: to.address || "",
                              name: to.name || "",
                            }))
                          : parsed.to?.value
                            ? [{ email: parsed.to.value.address || "", name: parsed.to.value.name || "" }]
                            : [],
                        cc: Array.isArray(parsed.cc?.value)
                          ? parsed.cc.value.map((cc: any) => ({
                              email: cc.address || "",
                              name: cc.name || "",
                            }))
                          : parsed.cc?.value
                            ? [{ email: parsed.cc.value.address || "", name: parsed.cc.value.name || "" }]
                            : [],
                        date: parsed.date || new Date(),
                        textContent: parsed.text || "",
                        htmlContent: parsed.html || "",
                        isRead: true, // IMAP emails are considered read when fetched
                        uid: seqno,
                        snippet: parsed.text?.substring(0, 200) || "",
                      };
                      emails.push(email);
                    });
                  } else {
                    // Just headers
                    const email: DirectEmailData = {
                      messageId: `imap_${seqno}_${Date.now()}`,
                      subject: headers.subject?.[0] || "",
                      from: {
                        email: headers.from?.[0] || "",
                        name: "",
                      },
                      to: headers.to?.map((to: string) => ({ email: to, name: "" })) || [],
                      date: new Date(headers.date?.[0] || Date.now()),
                      isRead: true,
                      uid: seqno,
                      snippet: "",
                    };
                    emails.push(email);
                  }
                });
              });

              fetch.once("error", (err: any) => {
                logger.error("IMAP fetch error:", err);
                resolve({
                  success: false,
                  emails: [],
                  threads: [],
                  totalCount: 0,
                  pagination: {
                    page,
                    pageSize,
                    totalPages: 0,
                    hasNextPage: false,
                  },
                  error: err.message,
                });
              });

              fetch.once("end", () => {
                imap.end();
                resolve({
                  success: true,
                  emails,
                  threads: [],
                  totalCount,
                  pagination: {
                    page,
                    pageSize,
                    totalPages: Math.ceil(totalCount / pageSize),
                    hasNextPage: page < Math.ceil(totalCount / pageSize),
                  },
                });
              });
            });
          });
        });

        imap.once("error", (err: any) => {
          logger.error(`IMAP error for ${emailAccount.emailAddress}:`, err);
          resolve({
            success: false,
            emails: [],
            threads: [],
            totalCount: 0,
            pagination: {
              page: options.page || 1,
              pageSize: options.pageSize || this.DEFAULT_PAGE_SIZE,
              totalPages: 0,
              hasNextPage: false,
            },
            error: err.message,
          });
        });

        imap.connect();
      } catch (error: any) {
        resolve({
          success: false,
          emails: [],
          threads: [],
          totalCount: 0,
          pagination: {
            page: options.page || 1,
            pageSize: options.pageSize || this.DEFAULT_PAGE_SIZE,
            totalPages: 0,
            hasNextPage: false,
          },
          error: error.message,
        });
      }
    });
  }

  /**
   * Direct Outlook API fetching without database storage
   */
  private static async fetchFromOutlookAPIDirect(
    emailAccount: IEmailAccount,
    options: DirectEmailFetchOptions
  ): Promise<DirectEmailFetchResult> {
    try {
      // Implementation for Outlook API direct fetching
      // This would be similar to Gmail but using Microsoft Graph API
      throw new Error("Outlook API direct fetching not yet implemented");
    } catch (error: any) {
      throw new Error(`Outlook API error: ${error.message}`);
    }
  }

  /**
   * Parse Gmail message data for direct display
   */
  private static async parseGmailMessageDirect(
    messageData: any,
    emailAccount: IEmailAccount
  ): Promise<DirectEmailData> {
    const headers = messageData.payload?.headers || [];
    const getHeader = (name: string) =>
      headers.find((h: any) => h.name.toLowerCase() === name.toLowerCase())?.value || "";

    const subject = getHeader("subject");
    const from = getHeader("from");
    const to = getHeader("to");
    const cc = getHeader("cc");
    const date = getHeader("date");
    const messageId = getHeader("message-id");
    const inReplyTo = getHeader("in-reply-to");
    const references = getHeader("references");

    // Extract email content
    let textContent = "";
    let htmlContent = "";
    let snippet = messageData.snippet || "";

    if (messageData.payload?.parts) {
      for (const part of messageData.payload.parts) {
        if (part.mimeType === "text/plain" && part.body?.data) {
          textContent = Buffer.from(part.body.data, "base64").toString();
        } else if (part.mimeType === "text/html" && part.body?.data) {
          htmlContent = Buffer.from(part.body.data, "base64").toString();
        }
      }
    } else if (messageData.payload?.body?.data) {
      if (messageData.payload.mimeType === "text/plain") {
        textContent = Buffer.from(messageData.payload.body.data, "base64").toString();
      } else if (messageData.payload.mimeType === "text/html") {
        htmlContent = Buffer.from(messageData.payload.body.data, "base64").toString();
      }
    }

    // Parse sender and recipients
    const parseEmailAddress = (emailStr: string) => {
      const match = emailStr.match(/(.*?)\s*<(.+?)>/);
      if (match) {
        return { name: match[1].trim(), email: match[2].trim() };
      }
      return { name: "", email: emailStr.trim() };
    };

    const fromParsed = parseEmailAddress(from);
    const toParsed = to.split(",").map(parseEmailAddress);
    const ccParsed = cc ? cc.split(",").map(parseEmailAddress) : [];

    // Extract labels and category
    const labels = messageData.labelIds || [];
    const category = this.determineEmailCategory(labels, subject, textContent);

    return {
      messageId: messageId || messageData.id,
      threadId: messageData.threadId,
      subject,
      from: fromParsed,
      to: toParsed,
      cc: ccParsed,
      date: new Date(date),
      textContent,
      htmlContent,
      snippet,
      isRead: !labels.includes("UNREAD"),
      category,
      labels,
      inReplyTo,
      references: references ? references.split(/\s+/) : [],
    };
  }

  /**
   * Build Gmail search query
   */
  private static buildGmailQuery(options: DirectEmailFetchOptions): string {
    const queryParts: string[] = [];

    if (options.query) {
      queryParts.push(options.query);
    }

    if (options.since) {
      queryParts.push(`after:${options.since.toISOString().split("T")[0]}`);
    }

    if (options.before) {
      queryParts.push(`before:${options.before.toISOString().split("T")[0]}`);
    }

    return queryParts.join(" ");
  }

  /**
   * Build IMAP search criteria
   */
  private static buildIMAPSearchCriteria(options: DirectEmailFetchOptions): any[] {
    const criteria: any[] = ["ALL"];

    if (options.since) {
      criteria.push(["SINCE", options.since]);
    }

    if (options.before) {
      criteria.push(["BEFORE", options.before]);
    }

    if (options.query) {
      // Simple text search in subject and body
      criteria.push(["OR", ["SUBJECT", options.query], ["BODY", options.query]]);
    }

    return criteria;
  }

  /**
   * Determine email category based on labels and content
   */
  private static determineEmailCategory(labels: string[], subject: string, textContent: string): string {
    // Gmail categories
    if (labels.includes("CATEGORY_PROMOTIONS")) return "promotions";
    if (labels.includes("CATEGORY_SOCIAL")) return "social";
    if (labels.includes("CATEGORY_UPDATES")) return "updates";
    if (labels.includes("CATEGORY_FORUMS")) return "forums";
    if (labels.includes("CATEGORY_PERSONAL")) return "primary";

    // Custom categorization based on content
    const content = `${subject} ${textContent}`.toLowerCase();

    if (content.includes("order") || content.includes("purchase") || content.includes("receipt")) {
      return "primary";
    }

    if (content.includes("newsletter") || content.includes("promotion") || content.includes("sale")) {
      return "promotions";
    }

    if (content.includes("social") || content.includes("facebook") || content.includes("twitter")) {
      return "social";
    }

    if (content.includes("update") || content.includes("notification") || content.includes("alert")) {
      return "updates";
    }

    return "primary";
  }

  /**
   * Normalize and validate options
   */
  private static normalizeOptions(options: DirectEmailFetchOptions): DirectEmailFetchOptions {
    return {
      page: Math.max(1, options.page || 1),
      pageSize: Math.min(Math.max(1, options.pageSize || this.DEFAULT_PAGE_SIZE), this.MAX_PAGE_SIZE),
      folder: options.folder || "INBOX",
      includeBody: options.includeBody !== false,
      markAsRead: options.markAsRead || false,
      sortBy: options.sortBy || "date",
      sortOrder: options.sortOrder || "desc",
      ...options,
    };
  }

  /**
   * Get Gmail OAuth client
   */
  private static async getGmailAuthClient(emailAccount: IEmailAccount) {
    try {
      if (!emailAccount.oauth?.refreshToken) {
        throw new Error("No refresh token available for Gmail authentication");
      }

      const oauth2Client = new google.auth.OAuth2(
        process.env.GOOGLE_CLIENT_ID,
        process.env.GOOGLE_CLIENT_SECRET,
        process.env.GOOGLE_REDIRECT_URI
      );

      // Decrypt tokens
      const decryptedRefreshToken = EmailOAuthService.decryptData(emailAccount.oauth.refreshToken);
      const decryptedAccessToken = emailAccount.oauth?.accessToken
        ? EmailOAuthService.decryptData(emailAccount.oauth.accessToken)
        : null;

      // Check if we have a valid access token and if it's expired
      let shouldRefreshToken = false;

      if (decryptedAccessToken && emailAccount.oauth?.tokenExpiry) {
        const now = new Date();
        const expiryDate = new Date(emailAccount.oauth.tokenExpiry);
        const timeUntilExpiry = expiryDate.getTime() - now.getTime();

        // Refresh token if it expires in less than 5 minutes (300,000 ms)
        shouldRefreshToken = timeUntilExpiry < 300000;

        logger.info(
          `Token expiry check for ${emailAccount.emailAddress}: expires in ${Math.round(timeUntilExpiry / 1000)}s, should refresh: ${shouldRefreshToken}`
        );
      } else if (!decryptedAccessToken) {
        // No access token, need to refresh
        shouldRefreshToken = true;
        logger.info(`No access token available for ${emailAccount.emailAddress}, will refresh`);
      }

      if (shouldRefreshToken) {
        // Only refresh when necessary
        logger.info(`Refreshing access token for ${emailAccount.emailAddress}`);

        // Set credentials with refresh token
        oauth2Client.setCredentials({
          refresh_token: decryptedRefreshToken,
        });

        try {
          const { credentials } = await oauth2Client.refreshAccessToken();

          if (credentials.access_token) {
            // Update the account with the new access token
            const expiryDate = credentials.expiry_date ? new Date(credentials.expiry_date) : undefined;
            await this.updateAccessToken(emailAccount, credentials.access_token, expiryDate);

            oauth2Client.setCredentials({
              access_token: credentials.access_token,
              refresh_token: decryptedRefreshToken,
            });

            logger.info(`Successfully refreshed Gmail access token for ${emailAccount.emailAddress}`);
          } else {
            throw new Error("Failed to obtain access token from refresh token");
          }
        } catch (refreshError: any) {
          logger.error(`Failed to refresh Gmail access token for ${emailAccount.emailAddress}:`, refreshError);

          // If refresh fails, try to use existing access token if available
          if (decryptedAccessToken) {
            oauth2Client.setCredentials({
              access_token: decryptedAccessToken,
              refresh_token: decryptedRefreshToken,
            });

            logger.warn(`Using existing access token for ${emailAccount.emailAddress} (refresh failed)`);
          } else {
            throw new Error(`Gmail authentication failed: ${refreshError.message}`);
          }
        }
      } else {
        // Use existing valid access token
        logger.info(`Using existing valid access token for ${emailAccount.emailAddress}`);

        oauth2Client.setCredentials({
          access_token: decryptedAccessToken,
          refresh_token: decryptedRefreshToken,
        });
      }

      return oauth2Client;
    } catch (error: any) {
      logger.error(`Gmail authentication error for ${emailAccount.emailAddress}:`, error);
      throw new Error(`Gmail authentication failed: ${error.message}`);
    }
  }

  /**
   * Update access token in the email account
   */
  private static async updateAccessToken(emailAccount: IEmailAccount, newAccessToken: string, expiryDate?: Date) {
    try {
      // Encrypt the new access token
      const encryptedAccessToken = EmailOAuthService.encryptData(newAccessToken);

      // Update the account with the new encrypted access token and expiry
      const { EmailAccountModel } = await import("../models/email-account.model");
      await EmailAccountModel.updateOne(
        { _id: emailAccount._id },
        {
          $set: {
            "oauth.accessToken": encryptedAccessToken,
            "oauth.tokenExpiry": expiryDate || new Date(Date.now() + 3600000), // Default 1 hour if no expiry provided
          },
        }
      );

      // Update the local object
      if (emailAccount.oauth) {
        emailAccount.oauth.accessToken = encryptedAccessToken;
        emailAccount.oauth.tokenExpiry = expiryDate || new Date(Date.now() + 3600000);
      }

      logger.info(`Updated access token for ${emailAccount.emailAddress}`);
    } catch (error: any) {
      logger.error(`Failed to update access token for ${emailAccount.emailAddress}:`, error);
      // Don't throw here as the main operation can still proceed
    }
  }

  /**
   * Utility delay function for rate limiting
   */
  private static delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Check if the error is an authentication error (e.g., 401 Unauthorized)
   */
  private static isAuthenticationError(error: any): boolean {
    return error.response?.status === 401 || error.response?.status === 403;
  }

  /**
   * Refresh the Gmail OAuth token and update the account
   */
  private static async refreshGmailToken(emailAccount: IEmailAccount): Promise<IEmailAccount> {
    try {
      if (!emailAccount.oauth?.refreshToken) {
        throw new Error("No refresh token available for Gmail authentication");
      }

      const oauth2Client = new google.auth.OAuth2(
        process.env.GOOGLE_CLIENT_ID,
        process.env.GOOGLE_CLIENT_SECRET,
        process.env.GOOGLE_REDIRECT_URI
      );

      // Decrypt refresh token
      const decryptedRefreshToken = EmailOAuthService.decryptData(emailAccount.oauth.refreshToken);

      // Set credentials with refresh token
      oauth2Client.setCredentials({
        refresh_token: decryptedRefreshToken,
      });

      // Try to get a fresh access token
      const { credentials } = await oauth2Client.refreshAccessToken();

      if (credentials.access_token) {
        // Update the account with the new access token
        await this.updateAccessToken(emailAccount, credentials.access_token);

        oauth2Client.setCredentials({
          access_token: credentials.access_token,
          refresh_token: decryptedRefreshToken,
        });

        logger.info(`Successfully refreshed Gmail access token for ${emailAccount.emailAddress}`);
      } else {
        throw new Error("Failed to obtain access token from refresh token");
      }

      return emailAccount;
    } catch (error: any) {
      logger.error(`Failed to refresh Gmail access token for ${emailAccount.emailAddress}:`, error);
      throw new Error(`Gmail authentication failed: ${error.message}`);
    }
  }

  /**
   * Update account status to reflect an error
   */
  private static async updateAccountError(emailAccount: IEmailAccount, errorMessage: string) {
    try {
      const { EmailAccountModel } = await import("../models/email-account.model");
      await EmailAccountModel.updateOne(
        { _id: emailAccount._id },
        {
          $set: {
            status: "error",
            errorMessage: errorMessage,
          },
        }
      );
      logger.error(`Account ${emailAccount.emailAddress} status updated to 'error' due to: ${errorMessage}`);
    } catch (error: any) {
      logger.error(`Failed to update account error status for ${emailAccount.emailAddress}:`, error);
    }
  }

  /**
   * Update account status to reflect a successful fetch
   */
  private static async updateAccountSuccess(emailAccount: IEmailAccount) {
    try {
      const { EmailAccountModel } = await import("../models/email-account.model");
      await EmailAccountModel.updateOne(
        { _id: emailAccount._id },
        {
          $set: {
            status: "active",
            errorMessage: "",
          },
        }
      );
      logger.info(`Account ${emailAccount.emailAddress} status updated to 'active' after successful fetch`);
    } catch (error: any) {
      logger.error(`Failed to update account success status for ${emailAccount.emailAddress}:`, error);
    }
  }

  /**
   * Group emails by thread for conversation view
   */
  private static groupEmailsByThread(emails: DirectEmailData[]): DirectEmailThread[] {
    const threadMap = new Map<string, DirectEmailThread>();

    emails.forEach((email) => {
      const threadId = email.threadId || email.messageId;

      if (!threadMap.has(threadId)) {
        // Create new thread
        const participants = new Set<string>();
        participants.add(email.from.email);
        email.to.forEach((recipient) => participants.add(recipient.email));

        threadMap.set(threadId, {
          threadId,
          subject: email.subject,
          participants: Array.from(participants).map((email) => ({ email })),
          messageCount: 1,
          unreadCount: email.isRead ? 0 : 1,
          firstMessageAt: email.date,
          lastMessageAt: email.date,
          status: "active",
          category: email.category,
          labels: email.labels,
          emails: [email],
        });
      } else {
        // Add to existing thread
        const thread = threadMap.get(threadId)!;
        thread.messageCount++;
        if (!email.isRead) thread.unreadCount++;
        if (email.date > thread.lastMessageAt) {
          thread.lastMessageAt = email.date;
          thread.subject = email.subject; // Use most recent subject
        }
        if (email.date < thread.firstMessageAt) {
          thread.firstMessageAt = email.date;
        }

        // Add new participants
        email.to.forEach((recipient) => {
          const exists = thread.participants.some((p) => p.email === recipient.email);
          if (!exists) {
            thread.participants.push({ email: recipient.email, name: recipient.name });
          }
        });

        thread.emails.push(email);
      }
    });

    // Sort threads by last message date (newest first)
    return Array.from(threadMap.values()).sort(
      (a, b) => new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime()
    );
  }
}
