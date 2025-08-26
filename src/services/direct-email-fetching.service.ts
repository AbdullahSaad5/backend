import { IEmailAccount } from "@/models/email-account.model";
import { logger } from "@/utils/logger.util";
import { google } from "googleapis";
import { Client } from "@microsoft/microsoft-graph-client";
import Imap from "imap";
import { simpleParser } from "mailparser";
import { EmailOAuthService } from "./emailOAuth.service";
import { getStoredGmailAuthClient } from "@/utils/gmail-helpers.util";

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

      // Check account status - be more lenient for OAuth accounts
      if (emailAccount.oauth) {
        // For OAuth accounts, only block if they are inactive
        if (emailAccount.status === "inactive") {
          const errorMsg = `Email account is inactive`;
          logger.warn(`${errorMsg} for account: ${emailAccount.emailAddress}`);
          throw new Error(errorMsg);
        }
        // For OAuth accounts with errors, log but continue
        if (emailAccount.status === "error") {
          logger.warn(`Account ${emailAccount.emailAddress} has errors but attempting to fetch anyway`);
        }
      } else {
        // For non-OAuth accounts, use stricter checking
        if (!emailAccount.isActive || emailAccount.status === "error") {
          const errorMsg = `Email account is not active or has errors`;
          logger.warn(`${errorMsg} for account: ${emailAccount.emailAddress}`);
          throw new Error(errorMsg);
        }
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

        // For single emails (not part of threads), keep them in the emails array
        // For emails that are part of threads, remove them from the emails array
        const threadEmailIds = new Set<string>();
        result.threads.forEach((thread) => {
          thread.emails.forEach((email) => {
            threadEmailIds.add(email.messageId);
          });
        });

        // Keep only single emails (not part of any thread) in the emails array
        result.emails = result.emails.filter((email) => !threadEmailIds.has(email.messageId));
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
   * Fetch a specific message from Outlook using its ID
   */
  static async fetchOutlookMessageById(
    emailAccount: IEmailAccount,
    messageId: string
  ): Promise<DirectEmailData | null> {
    try {
      logger.info(`Fetching Outlook message with ID: ${messageId} for account: ${emailAccount.emailAddress}`);

      // Check if account supports Outlook
      if (emailAccount.accountType !== "outlook" && emailAccount.accountType !== "exchange") {
        throw new Error(`Account ${emailAccount.emailAddress} does not support Outlook API`);
      }

      // Check account status
      if (emailAccount.status === "inactive") {
        throw new Error(`Account ${emailAccount.emailAddress} is inactive`);
      }

      // Get access token
      const accessToken = await this.getOutlookAccessToken(emailAccount);
      if (!accessToken) {
        throw new Error("Failed to get Outlook access token");
      }

      // Create Microsoft Graph client
      const graphClient = Client.init({
        authProvider: (done) => {
          done(null, accessToken);
        },
      });

      // Build the endpoint for fetching a specific message
      const endpoint = `/me/messages/${messageId}`;

      // Define the fields to select for the message
      // const queryParams = {
      //   $select:
      //     "id,subject,from,toRecipients,ccRecipients,bccRecipients,receivedDateTime,isRead,body,bodyPreview,conversationId,hasAttachments,importance,flag,webLink,inReplyTo,references,replyTo",
      // };

      // Build query string
      // const queryString = new URLSearchParams(queryParams).toString();
      // const fullEndpoint = `${endpoint}?${queryString}`;

      const fullEndpoint = endpoint;
      logger.info(`Outlook API endpoint: ${fullEndpoint}`);

      // Fetch the specific message from Microsoft Graph
      const response = await graphClient.api(fullEndpoint).get();

      if (!response) {
        logger.warn(`Message with ID ${messageId} not found in Outlook API`);
        return null;
      }

      // Parse the message to match the expected frontend format
      const parsedEmail = await this.parseOutlookMessageDirect(response, emailAccount);

      logger.info(`Successfully fetched Outlook message: ${parsedEmail.subject}`);

      return parsedEmail;
    } catch (error: any) {
      logger.error(`Error fetching Outlook message with ID ${messageId}:`, error);

      // Update account status if there's an authentication error
      if (error.message.includes("authentication") || error.message.includes("token")) {
        await this.updateAccountError(emailAccount, `Authentication failed: ${error.message}`);
      }

      throw new Error(`Failed to fetch Outlook message: ${error.message}`);
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
            format: options.includeBody ? "full" : "metadata", // Use full format only if includeBody is true
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
      // Check if this is an authentication error that requires re-authentication
      if (error.message.includes("Gmail authentication expired") || error.message.includes("invalid_grant")) {
        logger.error(`Gmail authentication error for ${currentAccount.emailAddress}: ${error.message}`);

        // Update account status to reflect the authentication failure
        await this.updateAccountError(currentAccount, error.message);

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
          error: error.message,
          requiresReauth: true,
        };
      }

      // Update account with the error
      console.log("💾 Updating account with error status");
      await this.updateAccountError(currentAccount, error.message);

      throw new Error(error.message);
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
      logger.info(`Starting Outlook API direct fetch for ${emailAccount.emailAddress}`);

      // Get access token
      const accessToken = await this.getOutlookAccessToken(emailAccount);
      if (!accessToken) {
        throw new Error("Failed to get Outlook access token");
      }

      // Create Microsoft Graph client
      const graphClient = Client.init({
        authProvider: (done) => {
          done(null, accessToken);
        },
      });

      // Build query parameters
      const queryParams: any = {
        $top: options.pageSize || 50,
        $skip: ((options.page || 1) - 1) * (options.pageSize || 50),
        $orderby: "receivedDateTime desc",
        $select:
          "id,subject,from,toRecipients,ccRecipients,bccRecipients,receivedDateTime,isRead,body,bodyPreview,conversationId,hasAttachments,importance,flag,webLink",
      };

      // Add folder filter if specified
      let endpoint = "/me/messages";
      if (options.folder && options.folder !== "INBOX") {
        // Map folder names to Microsoft Graph folder IDs
        const folderMap: { [key: string]: string } = {
          SENT: "sentitems",
          DRAFTS: "drafts",
          ARCHIVE: "archive",
          SPAM: "junkemail",
          TRASH: "deleteditems",
        };

        const folderId = folderMap[options.folder.toUpperCase()];
        if (folderId) {
          endpoint = `/me/mailFolders/${folderId}/messages`;
        }
      }

      // Add date filter if specified
      if (options.since) {
        queryParams.$filter = `receivedDateTime ge ${options.since.toISOString()}`;
      }

      // Build query string
      const queryString = new URLSearchParams(queryParams).toString();
      const fullEndpoint = `${endpoint}?${queryString}`;

      logger.info(`Outlook API endpoint: ${fullEndpoint}`);

      // Fetch messages from Microsoft Graph
      const response = await graphClient.api(fullEndpoint).get();

      if (!response || !response.value) {
        logger.warn("No messages found in Outlook API response");
        return {
          success: true,
          emails: [],
          threads: [],
          totalCount: 0,
          pagination: {
            page: options.page || 1,
            pageSize: options.pageSize || 50,
            totalPages: 0,
            hasNextPage: false,
          },
        };
      }

      // Parse messages
      const emails: DirectEmailData[] = [];
      for (const message of response.value) {
        try {
          const parsedEmail = await this.parseOutlookMessageDirect(message, emailAccount);
          emails.push(parsedEmail);
        } catch (parseError) {
          logger.error("Error parsing Outlook message:", parseError);
          continue;
        }
      }

      // Get total count for pagination
      const countResponse = await graphClient.api("/me/messages/$count").get();
      const totalCount = parseInt(countResponse) || 0;

      const totalPages = Math.ceil(totalCount / (options.pageSize || 50));
      const hasNextPage = (options.page || 1) < totalPages;

      logger.info(`Outlook API fetch completed: ${emails.length} emails fetched`);

      return {
        success: true,
        emails,
        threads: [], // Add empty threads array
        totalCount,
        pagination: {
          page: options.page || 1,
          pageSize: options.pageSize || 50,
          totalPages,
          hasNextPage,
        },
      };
    } catch (error: any) {
      logger.error("Outlook API direct fetch error:", error);
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

    // Extract email content - handle complex Gmail message structures
    let textContent = "";
    let htmlContent = "";
    let snippet = messageData.snippet || "";

    // Helper function to extract content from a part
    const extractContentFromPart = (part: any): { text: string; html: string } => {
      let text = "";
      let html = "";

      if (part.body?.data) {
        const content = Buffer.from(part.body.data, "base64").toString();
        if (part.mimeType === "text/plain") {
          text = content;
        } else if (part.mimeType === "text/html") {
          html = content;
        }
      }

      // Recursively check nested parts
      if (part.parts) {
        for (const subPart of part.parts) {
          const subContent = extractContentFromPart(subPart);
          text += subContent.text;
          html += subContent.html;
        }
      }

      return { text, html };
    };

    // Extract content from the main payload
    if (messageData.payload) {
      const content = extractContentFromPart(messageData.payload);
      textContent = content.text;
      htmlContent = content.html;
    }

    // If no content found, try alternative approaches
    if (!textContent && !htmlContent) {
      // Try to get content from the snippet if available
      if (snippet && !textContent) {
        textContent = snippet;
      }

      // Log the payload structure for debugging
      logger.info("Gmail message payload structure:", {
        hasPayload: !!messageData.payload,
        payloadMimeType: messageData.payload?.mimeType,
        hasParts: !!messageData.payload?.parts,
        partsCount: messageData.payload?.parts?.length || 0,
        hasBody: !!messageData.payload?.body,
        bodyDataLength: messageData.payload?.body?.data?.length || 0,
      });
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
      messageId: (messageId || messageData.id).replace(/^<|>$/g, ""),
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
   * Parse Outlook message data for direct display
   */
  private static async parseOutlookMessageDirect(
    messageData: any,
    emailAccount: IEmailAccount
  ): Promise<DirectEmailData> {
    const headers: any = {};
    let textContent = "";
    let htmlContent = "";
    let snippet = messageData.bodyPreview || "";

    if (messageData.body) {
      console.log("📧 Outlook message body content type:", messageData.body.contentType);
      console.log("📧 Outlook message body content length:", messageData.body.content?.length || 0);

      if (messageData.body.contentType === "text/plain") {
        textContent = messageData.body.content || "";
        console.log("📧 Extracted text content length:", textContent.length);
      } else if (messageData.body.contentType === "text/html" || messageData.body.contentType === "html") {
        htmlContent = messageData.body.content || "";
        console.log("📧 Extracted HTML content length:", htmlContent.length);
      }
    }

    // Parse sender and recipients
    const from = messageData.from?.emailAddress || messageData.from;
    const to = messageData.toRecipients?.map((r: any) => ({ email: r.emailAddress || r.address }));
    const cc = messageData.ccRecipients?.map((r: any) => ({ email: r.emailAddress || r.address }));
    const bcc = messageData.bccRecipients?.map((r: any) => ({ email: r.emailAddress || r.address }));

    // Extract threading information
    const conversationId = messageData.conversationId;
    const inReplyTo = messageData.inReplyTo;
    const references = messageData.references || [];

    // Determine if this is a reply
    const isReply = this.isOutlookReply(messageData.subject, inReplyTo, references);

    // Extract thread ID (use conversationId for Outlook)
    const threadId = conversationId || this.generateOutlookThreadId(messageData);

    // Extract labels and category
    const labels = messageData.flag?.flagStatus || messageData.importance || messageData.categories || [];
    const category = this.determineEmailCategory(labels, messageData.subject, textContent);

    const parsedEmail = {
      messageId: messageData.id,
      threadId,
      subject: messageData.subject,
      from: {
        email: from.emailAddress || from.address || "",
        name: from.name || "",
      },
      to: to || [],
      cc: cc || [],
      bcc: bcc || [],
      date: new Date(messageData.receivedDateTime),
      textContent,
      htmlContent,
      snippet,
      isRead: messageData.isRead,
      category,
      labels,
      inReplyTo,
      references,
      parentMessageId: messageData.replyTo?.id,
      // Add Outlook-specific fields
      // conversationId,
      // isReply,
    };

    console.log("📧 Parsed email result:", {
      messageId: parsedEmail.messageId,
      subject: parsedEmail.subject,
      textContentLength: parsedEmail.textContent?.length || 0,
      htmlContentLength: parsedEmail.htmlContent?.length || 0,
      hasTextContent: !!parsedEmail.textContent,
      hasHtmlContent: !!parsedEmail.htmlContent,
    });

    return parsedEmail;
  }

  /**
   * Check if Outlook message is a reply
   */
  private static isOutlookReply(subject: string, inReplyTo: string, references: string[]): boolean {
    // Check subject for reply indicators
    const replyPatterns = [/^re:\s*/i, /^re\[.*?\]:\s*/i, /^re\s*\(.*?\):\s*/i];

    const hasReplySubject = replyPatterns.some((pattern) => pattern.test(subject));

    // Check for threading headers
    const hasThreadingHeaders = inReplyTo || (references && references.length > 0);

    return Boolean(hasReplySubject || hasThreadingHeaders);
  }

  /**
   * Generate thread ID for Outlook messages when conversationId is not available
   */
  private static generateOutlookThreadId(messageData: any): string {
    // Try to generate a consistent thread ID based on subject and sender
    const subject = messageData.subject || "";
    const fromEmail = messageData.from?.emailAddress?.address || messageData.from?.address || "";

    if (subject && fromEmail) {
      // Remove reply prefixes and normalize subject
      const cleanSubject = subject
        .replace(/^(re:|fwd?:|re\[.*?\]:|re\s*\(.*?\):)\s*/gi, "")
        .trim()
        .toLowerCase();

      // Create a hash-like thread ID
      const threadKey = `${cleanSubject}_${fromEmail}`;
      return `outlook_thread_${this.hashString(threadKey)}`;
    }

    // Fallback to message ID
    return `outlook_thread_${messageData.id || Date.now()}`;
  }

  /**
   * Simple string hashing function
   */
  private static hashString(str: string): string {
    let hash = 0;
    if (str.length === 0) return hash.toString();

    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32-bit integer
    }

    return Math.abs(hash).toString(36);
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
   * Get Gmail OAuth client using centralized helper
   */
  private static async getGmailAuthClient(emailAccount: IEmailAccount) {
    const result = await getStoredGmailAuthClient(emailAccount);

    if (!result.success) {
      throw new Error(result.error || "Gmail authentication failed");
    }

    return result.oauth2Client;
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

      // Check if this is an invalid_grant error (refresh token expired/revoked)
      if (error.message.includes("invalid_grant") || error.code === 400) {
        // Update account status to indicate re-authentication is needed
        await this.updateAccountError(
          emailAccount,
          "Gmail authentication expired. Please re-authenticate your account."
        );

        throw new Error("Gmail authentication expired. Please re-authenticate your account.");
      }

      throw new Error(`Gmail authentication failed: ${error.message}`);
    }
  }

  /**
   * Get Outlook access token
   */
  private static async getOutlookAccessToken(emailAccount: IEmailAccount): Promise<string | null> {
    try {
      if (!emailAccount.oauth?.refreshToken) {
        throw new Error("No refresh token available for Outlook authentication");
      }

      // Import the EmailOAuthService for decryption
      const { EmailOAuthService } = await import("@/services/emailOAuth.service");

      // Decrypt refresh token and client secret
      const decryptedRefreshToken = EmailOAuthService.decryptData(emailAccount.oauth.refreshToken);
      const decryptedClientSecret = EmailOAuthService.decryptData(emailAccount.oauth.clientSecret);

      // Exchange refresh token for new access token using Microsoft OAuth
      const tokenResponse = await fetch("https://login.microsoftonline.com/common/oauth2/v2.0/token", {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          client_id: emailAccount.oauth.clientId || "",
          client_secret: decryptedClientSecret,
          refresh_token: decryptedRefreshToken,
          grant_type: "refresh_token",
          scope:
            "https://graph.microsoft.com/User.Read https://graph.microsoft.com/Mail.Read https://graph.microsoft.com/Mail.ReadWrite https://graph.microsoft.com/Mail.Send offline_access",
        }),
      });

      if (!tokenResponse.ok) {
        const errorData = await tokenResponse.text();
        logger.error("Outlook token refresh failed:", errorData);
        throw new Error("Failed to refresh Outlook access token");
      }

      const tokens = await tokenResponse.json();

      if (tokens.access_token) {
        logger.info(`Successfully refreshed Outlook access token for ${emailAccount.emailAddress}`);
        return tokens.access_token;
      } else {
        throw new Error("No access token received from Microsoft OAuth");
      }
    } catch (error: any) {
      logger.error(`Failed to get Outlook access token for ${emailAccount.emailAddress}:`, error);
      throw new Error(`Outlook authentication failed: ${error.message}`);
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

    // Only return threads that have multiple messages (actual conversations)
    // Single emails should be handled separately as individual emails
    const actualThreads = Array.from(threadMap.values()).filter((thread) => thread.messageCount > 1);

    // Sort threads by last message date (newest first)
    return actualThreads.sort((a, b) => new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime());
  }

  /**
   * Fetch Gmail message by ID
   */
  static async fetchGmailMessageById(emailAccount: IEmailAccount, messageId: string): Promise<DirectEmailData | null> {
    return this.fetchGmailMessageWithRetry(emailAccount, messageId, 0);
  }

  /**
   * Fetch Gmail message with automatic token refresh retry
   */
  private static async fetchGmailMessageWithRetry(
    emailAccount: IEmailAccount,
    messageId: string,
    retryCount: number
  ): Promise<DirectEmailData | null> {
    const MAX_RETRIES = 1; // Only retry once with refreshed token

    try {
      // Clean the messageId - remove angle brackets if present and handle special characters
      let cleanMessageId = messageId.replace(/^<|>$/g, "");

      // Handle URL-encoded characters that might be in the messageId
      try {
        cleanMessageId = decodeURIComponent(cleanMessageId);
      } catch (e) {
        // If decodeURIComponent fails, use the original cleaned messageId
        logger.warn(`Failed to decode messageId: ${cleanMessageId}, using as-is`);
      }

      logger.info(
        `Fetching Gmail message with ID: ${cleanMessageId} (original: ${messageId}) for account: ${emailAccount.emailAddress} (attempt ${retryCount + 1})`
      );

      // Validate messageId format for Gmail API
      if (!cleanMessageId || cleanMessageId.length === 0) {
        throw new Error("Invalid messageId: empty or null");
      }

      // Gmail message IDs should not contain spaces or special characters that would cause issues
      if (cleanMessageId.includes(" ") || cleanMessageId.includes("\n") || cleanMessageId.includes("\r")) {
        cleanMessageId = cleanMessageId.replace(/[\s\n\r]/g, "");
      }

      // Check if account supports Gmail
      if (emailAccount.accountType !== "gmail") {
        throw new Error(`Account ${emailAccount.emailAddress} does not support Gmail API`);
      }

      // Check account status
      if (emailAccount.status === "inactive") {
        throw new Error(`Account ${emailAccount.emailAddress} is inactive`);
      }

      // Get Gmail auth client (will auto-refresh if needed)
      const gmail = google.gmail({ version: "v1", auth: await this.getGmailAuthClient(emailAccount) });

      // If the provided ID looks like an RFC822 Message-ID (contains '@'),
      // resolve it to Gmail's internal message id via rfc822msgid search.
      let gmailMessageId = cleanMessageId;
      const looksLikeRfc822Id = /@/.test(cleanMessageId);
      if (looksLikeRfc822Id) {
        // Gmail expects the RFC822 id wrapped in angle brackets for the search
        const wrapped =
          cleanMessageId.startsWith("<") && cleanMessageId.endsWith(">") ? cleanMessageId : `<${cleanMessageId}>`;

        const listResp = await gmail.users.messages.list({
          userId: "me",
          q: `rfc822msgid:${wrapped}`,
          maxResults: 1,
        });

        const matched = listResp.data.messages && listResp.data.messages[0]?.id;
        if (!matched) {
          throw new Error(`No Gmail message found for RFC822 Message-ID ${wrapped}`);
        }
        gmailMessageId = matched;
        logger.info(`Resolved RFC822 Message-ID to Gmail ID: ${gmailMessageId}`);
      }

      // Fetch the specific message from Gmail API
      // According to Gmail API docs: https://developers.google.com/gmail/api/reference/rest/v1/users.messages/get
      const response = await gmail.users.messages.get({
        userId: "me",
        id: gmailMessageId,
        format: "full", // Get full message with body
        metadataHeaders: ["Subject", "From", "To", "Cc", "Date", "Message-ID", "In-Reply-To", "References"],
      });

      if (!response.data) {
        logger.warn(`Message with ID ${messageId} not found in Gmail API`);
        return null;
      }

      // Parse the Gmail message
      const parsedEmail = await this.parseGmailMessageDirect(response.data, emailAccount);

      logger.info(`Successfully fetched Gmail message: ${parsedEmail.subject}`);
      logger.info(`Gmail API response structure:`, {
        hasPayload: !!response.data.payload,
        payloadMimeType: response.data.payload?.mimeType,
        hasParts: !!response.data.payload?.parts,
        partsCount: response.data.payload?.parts?.length || 0,
        hasBody: !!response.data.payload?.body,
        bodyData: !!response.data.payload?.body?.data,
        bodySize: response.data.payload?.body?.size,
        snippet: response.data.snippet?.substring(0, 100) + "...",
      });
      logger.info(`Full Gmail API response data:`, JSON.stringify(response.data, null, 2));

      return parsedEmail;
    } catch (error: any) {
      logger.error(`Error fetching Gmail message with ID ${messageId} (attempt ${retryCount + 1}):`, error);

      // Check if this is an authentication error that requires re-authentication
      const isAuthError =
        error.message.includes("Gmail authentication expired") ||
        error.message.includes("invalid_grant") ||
        error.message.includes("authentication") ||
        error.message.includes("token") ||
        error.message.includes("unauthorized") ||
        error.code === 401;

      if (isAuthError) {
        logger.error(`Gmail authentication error for ${emailAccount.emailAddress}: ${error.message}`);
        await this.updateAccountError(emailAccount, `Authentication failed: ${error.message}`);
        throw new Error(`Gmail authentication failed: ${error.message}`);
      }

      throw new Error(`Failed to fetch Gmail message: ${error.message}`);
    }
  }

  /**
   * Fetch email from database (for accounts that don't support direct API fetching)
   */
  static async fetchEmailFromDatabase(emailAccount: IEmailAccount, messageId: string): Promise<DirectEmailData | null> {
    try {
      logger.info(`Fetching email from database with ID: ${messageId} for account: ${emailAccount.emailAddress}`);

      // Import the Email model
      const { EmailModel } = await import("../models/email.model");

      // Find the email in the database
      const email = await EmailModel.findOne({
        messageId: messageId,
        accountId: emailAccount._id,
      });

      if (!email) {
        logger.warn(`Email with messageId ${messageId} not found in database`);
        return null;
      }

      // Convert database email to DirectEmailData format
      const directEmailData: DirectEmailData = {
        messageId: email.messageId,
        threadId: email.threadId,
        subject: email.subject,
        from: email.from,
        to: email.to,
        cc: email.cc || [],
        bcc: email.bcc || [],
        date: email.receivedAt,
        textContent: email.textContent,
        htmlContent: email.htmlContent,
        snippet: email.textContent?.substring(0, 200) || "",
        isRead: email.isRead,
        category: email.category || "general",
        labels: email.labels || [],
        inReplyTo: email.inReplyTo,
        references: email.references || [],
        parentMessageId: email.parentMessageId,
      };

      logger.info(`Successfully fetched email from database: ${directEmailData.subject}`);

      return directEmailData;
    } catch (error: any) {
      logger.error(`Error fetching email from database with ID ${messageId}:`, error);
      throw new Error(`Failed to fetch email from database: ${error.message}`);
    }
  }
}
