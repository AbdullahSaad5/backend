import { IEmailAccount } from "../models/email-account.model";
import { logger } from "../utils/logger.util";
import { google } from "googleapis";
import { Client } from "@microsoft/microsoft-graph-client";
import Imap from "imap";
import { simpleParser } from "mailparser";
import { EmailOAuthService } from "./emailOAuth.service";

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

export interface DirectEmailFetchResult {
  success: boolean;
  emails: DirectEmailData[];
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
}

export interface DirectEmailFetchOptions {
  folder?: string;
  page?: number;
  pageSize?: number;
  since?: Date;
  before?: Date;
  query?: string; // Search query
  labelIds?: string[]; // Gmail labels
  includeBody?: boolean;
  markAsRead?: boolean;
  sortBy?: "date" | "from" | "subject" | "size";
  sortOrder?: "asc" | "desc";
}

export class DirectEmailFetchingService {
  private static readonly DEFAULT_PAGE_SIZE = 20;
  private static readonly MAX_PAGE_SIZE = 100;
  private static readonly RATE_LIMIT_DELAY = 1000; // 1 second between requests

  /**
   * Fetch emails directly from email provider without storing in database
   */
  static async fetchEmailsDirectly(
    emailAccount: IEmailAccount,
    options: DirectEmailFetchOptions = {}
  ): Promise<DirectEmailFetchResult> {
    try {
      logger.info(`Starting direct email fetch for account: ${emailAccount.emailAddress}`);

      // Validate and set default options
      const fetchOptions = this.normalizeOptions(options);

      // Check account status
      if (!emailAccount.isActive || emailAccount.status === "error") {
        throw new Error(`Email account is not active or has errors`);
      }

      // Check OAuth configuration for Gmail accounts
      if (emailAccount.accountType === "gmail" && emailAccount.oauth) {
        if (!emailAccount.oauth.refreshToken) {
          throw new Error("Gmail account is missing refresh token. Please re-authenticate the account.");
        }

        if (!emailAccount.oauth.clientId || !emailAccount.oauth.clientSecret) {
          throw new Error("Gmail account is missing OAuth client configuration. Please check your Google OAuth setup.");
        }
      }

      let result: DirectEmailFetchResult;

      // Route to appropriate fetching method based on account type
      switch (emailAccount.accountType) {
        case "gmail":
          if (emailAccount.oauth) {
            result = await this.fetchFromGmailAPIDirect(emailAccount, fetchOptions);
          } else {
            result = await this.fetchFromIMAPDirect(emailAccount, fetchOptions);
          }
          break;

        case "outlook":
          if (emailAccount.oauth) {
            result = await this.fetchFromOutlookAPIDirect(emailAccount, fetchOptions);
          } else {
            result = await this.fetchFromIMAPDirect(emailAccount, fetchOptions);
          }
          break;

        default:
          // Fallback to IMAP for other account types
          result = await this.fetchFromIMAPDirect(emailAccount, fetchOptions);
          break;
      }

      return result;
    } catch (error: any) {
      logger.error(`Direct email fetch failed for ${emailAccount.emailAddress}:`, error);

      // Provide user-friendly error messages
      let userMessage = "Failed to fetch emails";

      if (error.message.includes("authentication")) {
        userMessage = "Authentication failed. Please re-authenticate your email account.";
      } else if (error.message.includes("quota")) {
        userMessage = "API quota exceeded. Please try again later.";
      } else if (error.message.includes("network")) {
        userMessage = "Network error. Please check your internet connection.";
      } else if (error.message.includes("Gmail API error")) {
        userMessage = "Gmail API error. Please check your account permissions.";
      }

      return {
        success: false,
        emails: [],
        totalCount: 0,
        pagination: {
          page: options.page || 1,
          pageSize: options.pageSize || this.DEFAULT_PAGE_SIZE,
          totalPages: 0,
          hasNextPage: false,
        },
        error: userMessage,
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
    try {
      const gmail = google.gmail({ version: "v1", auth: await this.getGmailAuthClient(emailAccount) });

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

          const email = await this.parseGmailMessageDirect(messageResponse.data, emailAccount);
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

      // Decrypt refresh token
      const decryptedRefreshToken = EmailOAuthService.decryptData(emailAccount.oauth.refreshToken);

      // Set credentials with refresh token
      oauth2Client.setCredentials({
        refresh_token: decryptedRefreshToken,
      });

      // Try to get a fresh access token
      try {
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
      } catch (refreshError: any) {
        logger.error(`Failed to refresh Gmail access token for ${emailAccount.emailAddress}:`, refreshError);

        // If refresh fails, try to use existing access token if available
        if (emailAccount.oauth?.accessToken) {
          const decryptedAccessToken = EmailOAuthService.decryptData(emailAccount.oauth.accessToken);
          oauth2Client.setCredentials({
            access_token: decryptedAccessToken,
            refresh_token: decryptedRefreshToken,
          });

          logger.warn(`Using existing access token for ${emailAccount.emailAddress} (refresh failed)`);
        } else {
          throw new Error(`Gmail authentication failed: ${refreshError.message}`);
        }
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
  private static async updateAccessToken(emailAccount: IEmailAccount, newAccessToken: string) {
    try {
      // Encrypt the new access token
      const encryptedAccessToken = EmailOAuthService.encryptData(newAccessToken);

      // Update the account with the new encrypted access token
      // Note: We need to use the model to update, not the document instance
      const { EmailAccountModel } = await import("../models/email-account.model");
      await EmailAccountModel.updateOne(
        { _id: emailAccount._id },
        {
          $set: {
            "oauth.accessToken": encryptedAccessToken,
          },
        }
      );

      // Update the local object
      if (emailAccount.oauth) {
        emailAccount.oauth.accessToken = encryptedAccessToken;
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
}
