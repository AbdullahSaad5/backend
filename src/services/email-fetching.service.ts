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

export interface FetchedEmail {
  messageId: string;
  threadId?: string;
  subject: string;
  from: { email: string; name?: string };
  to: { email: string; name?: string }[];
  cc?: { email: string; name?: string }[];
  bcc?: { email: string; name?: string }[];
  date: Date;
  textContent?: string;
  htmlContent?: string;
  attachments?: any[];
  headers?: any[];
  isRead: boolean;
  uid?: number;
  flags?: string[];
}

export interface EmailFetchResult {
  success: boolean;
  emails: FetchedEmail[];
  totalCount: number;
  newCount: number;
  error?: string;
}

export interface EmailFetchOptions {
  folder?: string;
  limit?: number;
  since?: Date;
  markAsRead?: boolean;
  includeBody?: boolean;
}

export class EmailFetchingService {
  /**
   * Refresh OAuth token for Gmail account
   */
  private static async refreshGmailToken(emailAccount: IEmailAccount): Promise<IEmailAccount> {
    try {
      if (!emailAccount.oauth?.refreshToken) {
        throw new Error("No refresh token available");
      }

      const oauth2Client = new google.auth.OAuth2(
        process.env.GOOGLE_CLIENT_ID,
        process.env.GOOGLE_CLIENT_SECRET,
        process.env.GOOGLE_REDIRECT_URI
      );

      oauth2Client.setCredentials({
        refresh_token: emailAccount.oauth.refreshToken,
      });

      // Get new access token
      const { credentials } = await oauth2Client.refreshAccessToken();

      if (!credentials.access_token) {
        throw new Error("Failed to refresh access token");
      }

      // Update account with new token
      const updatedAccount = await EmailAccountModel.findByIdAndUpdate(
        emailAccount._id,
        {
          $set: {
            "oauth.accessToken": credentials.access_token,
            "oauth.tokenExpiresAt": credentials.expiry_date ? new Date(credentials.expiry_date) : undefined,
            connectionStatus: "connected",
            "stats.lastError": null,
          },
        },
        { new: true }
      );

      if (!updatedAccount) {
        throw new Error("Failed to update account with new token");
      }

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
    try {
      logger.info(`Starting email fetch for account: ${emailAccount.emailAddress}`);

      // Check account status
      if (!emailAccount.isActive || emailAccount.status === "error") {
        throw new Error(`Email account is not active or has errors`);
      }

      let result: EmailFetchResult;

      // Route to appropriate fetching method based on account type
      switch (emailAccount.accountType) {
        case "gmail":
          if (emailAccount.oauth) {
            result = await this.fetchFromGmailAPI(emailAccount, options);
          } else {
            result = await this.fetchFromIMAP(emailAccount, options);
          }
          break;

        case "outlook":
          if (emailAccount.oauth) {
            result = await this.fetchFromOutlookAPI(emailAccount, options);
          } else {
            result = await this.fetchFromIMAP(emailAccount, options);
          }
          break;

        case "imap":
        case "exchange":
        case "custom":
        default:
          result = await this.fetchFromIMAP(emailAccount, options);
          break;
      }

      // Store fetched emails in database
      if (result.success && result.emails.length > 0) {
        await this.storeEmailsInDatabase(result.emails, emailAccount);
      }

      // Update account stats
      await this.updateAccountStats(emailAccount, result);

      logger.info(`Email fetch completed for ${emailAccount.emailAddress}: ${result.newCount} new emails`);
      return result;
    } catch (error: any) {
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
   * Fetch emails using IMAP protocol
   */
  private static async fetchFromIMAP(
    emailAccount: IEmailAccount,
    options: EmailFetchOptions
  ): Promise<EmailFetchResult> {
    return new Promise((resolve) => {
      try {
        const imap = this.createIMAPConnection(emailAccount);
        const emails: FetchedEmail[] = [];
        let totalCount = 0;

        imap.once("ready", () => {
          const folder = options.folder || "INBOX";

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
            const searchCriteria = this.buildSearchCriteria(options);

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
              const limit = options.limit || 50;
              const limitedResults = results.slice(-limit); // Get most recent

              const fetchOptions: any = {
                bodies:
                  options.includeBody !== false
                    ? ""
                    : "HEADER.FIELDS (FROM TO SUBJECT DATE MESSAGE-ID REFERENCES IN-REPLY-TO)",
                struct: true,
                markSeen: options.markAsRead || false,
              };

              const fetch = imap.fetch(limitedResults, fetchOptions);
              let processedCount = 0;

              fetch.on("message", (msg: any, seqno: any) => {
                let emailData: any = {};
                let body = "";

                msg.on("body", (stream: any, info: any) => {
                  if (options.includeBody !== false) {
                    stream.on("data", (chunk: any) => {
                      body += chunk.toString("utf8");
                    });
                  } else {
                    // Parse headers only
                    stream.on("data", (chunk: any) => {
                      body += chunk.toString("utf8");
                    });
                  }
                });

                msg.once("attributes", (attrs: any) => {
                  emailData.uid = attrs.uid;
                  emailData.flags = attrs.flags;
                  emailData.date = attrs.date;
                  emailData.isRead = attrs.flags.includes("\\Seen");
                });

                msg.once("end", async () => {
                  try {
                    const parsed = await simpleParser(body);

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
   * Fetch emails using Gmail API
   */
  private static async fetchFromGmailAPI(
    emailAccount: IEmailAccount,
    options: EmailFetchOptions
  ): Promise<EmailFetchResult> {
    let currentAccount = emailAccount;

    try {
      if (!currentAccount.oauth?.accessToken) {
        throw new Error("Gmail OAuth access token not available");
      }

      const oauth2Client = new google.auth.OAuth2(
        process.env.GOOGLE_CLIENT_ID,
        process.env.GOOGLE_CLIENT_SECRET,
        process.env.GOOGLE_REDIRECT_URI
      );

      oauth2Client.setCredentials({
        access_token: currentAccount.oauth.accessToken,
        refresh_token: currentAccount.oauth.refreshToken,
      });

      const gmail = google.gmail({ version: "v1", auth: oauth2Client });

      // Build query for Gmail API
      let query = "";
      if (options.since) {
        const sinceStr = Math.floor(options.since.getTime() / 1000);
        query += `after:${sinceStr} `;
      }
      if (options.folder && options.folder !== "INBOX") {
        query += `in:${options.folder.toLowerCase()} `;
      }

      // List messages
      const listResponse = await gmail.users.messages.list({
        userId: "me",
        q: query.trim(),
        maxResults: options.limit || 50,
      });

      if (!listResponse.data.messages || listResponse.data.messages.length === 0) {
        return {
          success: true,
          emails: [],
          totalCount: 0,
          newCount: 0,
        };
      }

      // Fetch detailed message data
      const emails: FetchedEmail[] = [];
      const messagePromises = listResponse.data.messages.map(async (message: any) => {
        try {
          const messageResponse = await gmail.users.messages.get({
            userId: "me",
            id: message.id!,
            format: "full",
          });

          const msg = messageResponse.data;
          const headers = msg.payload?.headers || [];

          return this.parseGmailMessage(msg, emailAccount);
        } catch (error: any) {
          logger.error(`Error fetching Gmail message ${message.id}:`, error);
          return null;
        }
      });

      const fetchedMessages = await Promise.all(messagePromises);
      const validEmails = fetchedMessages.filter((email) => email !== null) as FetchedEmail[];

      return {
        success: true,
        emails: validEmails,
        totalCount: listResponse.data.resultSizeEstimate || validEmails.length,
        newCount: validEmails.filter((e) => !e.isRead).length,
      };
    } catch (error: any) {
      logger.error("Gmail API fetch error:", error);

      // Check if it's an authentication error
      if (
        error.code === 401 ||
        error.message?.includes("invalid_grant") ||
        error.message?.includes("Invalid credentials")
      ) {
        logger.warn(
          `Gmail authentication error for account ${currentAccount.emailAddress}, attempting token refresh...`
        );

        try {
          // Attempt to refresh the token
          currentAccount = await this.refreshGmailToken(currentAccount);

          // Retry the operation with refreshed token
          logger.info(`Token refreshed successfully, retrying Gmail fetch for ${currentAccount.emailAddress}`);
          return await this.fetchFromGmailAPI(currentAccount, options);
        } catch (refreshError: any) {
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
    options: EmailFetchOptions
  ): Promise<EmailFetchResult> {
    try {
      if (!emailAccount.oauth?.accessToken) {
        throw new Error("Outlook OAuth access token not available");
      }

      const graphClient = Client.init({
        authProvider: {
          getAccessToken: async () => {
            return emailAccount.oauth!.accessToken!;
          },
        },
      });

      // Build query parameters
      let queryParams: any = {
        $top: options.limit || 50,
        $orderby: "receivedDateTime desc",
      };

      if (options.since) {
        queryParams.$filter = `receivedDateTime ge ${options.since.toISOString()}`;
      }

      // Determine folder
      let folderPath = "me/mailFolders/inbox";
      if (options.folder && options.folder.toLowerCase() !== "inbox") {
        folderPath = `me/mailFolders/${options.folder.toLowerCase()}`;
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

        // Create thread if needed
        const threadId = await this.ensureThreadExists(email, emailAccount);

        // Create email document
        const emailDoc = new EmailModel({
          messageId: email.messageId,
          threadId,
          accountId: emailAccount._id,
          direction: "inbound",
          type: "general",
          status: "received",
          subject: email.subject,
          textContent: email.textContent,
          htmlContent: email.htmlContent,
          from: email.from,
          to: email.to,
          cc: email.cc,
          bcc: email.bcc,
          headers: email.headers,
          attachments: email.attachments,
          receivedAt: email.date,
          isRead: email.isRead,
          readAt: email.isRead ? new Date() : undefined,
        });

        await emailDoc.save();
        logger.debug(`Stored email: ${email.subject}`);
      } catch (error: any) {
        logger.error(`Error storing email ${email.messageId}:`, error);
      }
    }
  }

  /**
   * Ensure thread exists and return thread ID
   */
  private static async ensureThreadExists(email: FetchedEmail, emailAccount: IEmailAccount): Promise<string> {
    let threadId = email.threadId;

    if (!threadId) {
      // Generate thread ID from subject
      const normalizedSubject = email.subject.replace(/^(Re:|Fwd?:|RE:|FWD?:)\s*/gi, "").trim();
      threadId = `thread_${normalizedSubject.replace(/[^a-zA-Z0-9]/g, "_").toLowerCase()}_${crypto.randomUUID().slice(0, 8)}`;
    }

    // Check if thread exists
    let thread = await EmailThreadModel.findOne({ threadId });

    if (!thread) {
      // Create new thread
      const participants = [email.from, ...email.to];
      if (email.cc) participants.push(...email.cc);

      thread = new EmailThreadModel({
        threadId,
        subject: email.subject.replace(/^(Re:|Fwd?:|RE:|FWD?:)\s*/gi, "").trim(),
        participants: participants.filter(
          (p, index, self) => index === self.findIndex((participant) => participant.email === p.email)
        ),
        messageCount: 1,
        lastMessageAt: email.date,
        status: "active",
      });

      await thread.save();
    } else {
      // Update existing thread
      thread.messageCount += 1;
      thread.lastMessageAt = email.date;

      // Add new participants if any
      const newParticipants = [email.from, ...email.to];
      if (email.cc) newParticipants.push(...email.cc);

      newParticipants.forEach((participant) => {
        if (!thread!.participants.some((p: any) => p.email === participant.email)) {
          thread!.participants.push(participant);
        }
      });

      await thread.save();
    }

    return threadId;
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
    const criteria = ["ALL"];

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

    return {
      messageId: msg.id!,
      threadId: msg.threadId,
      subject: getHeader("Subject") || "(No Subject)",
      from: {
        email: getHeader("From")?.match(/<(.+)>/)?.[1] || getHeader("From") || "",
        name: getHeader("From")
          ?.match(/^(.+)<.+>$/)?.[1]
          ?.trim(),
      },
      to: this.parseAddressHeader(getHeader("To")),
      cc: this.parseAddressHeader(getHeader("Cc")),
      date: new Date(parseInt(msg.internalDate!)),
      textContent: this.extractTextFromGmailPayload(msg.payload),
      htmlContent: this.extractHtmlFromGmailPayload(msg.payload),
      isRead: !msg.labelIds?.includes("UNREAD"),
      headers: headers.map((h: any) => ({ name: h.name, value: h.value })),
    };
  }

  private static parseOutlookMessage(msg: any, emailAccount: IEmailAccount): FetchedEmail {
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
      textContent: msg.body?.contentType === "text" ? msg.body.content : undefined,
      htmlContent: msg.body?.contentType === "html" ? msg.body.content : undefined,
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

  private static extractTextFromGmailPayload(payload: any): string | undefined {
    // Implementation for extracting text content from Gmail payload
    // This would need to handle multipart messages, etc.
    return undefined; // Simplified for now
  }

  private static extractHtmlFromGmailPayload(payload: any): string | undefined {
    // Implementation for extracting HTML content from Gmail payload
    return undefined; // Simplified for now
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
}
