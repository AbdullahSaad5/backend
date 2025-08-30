import { google } from "googleapis";
import { IEmailAccount } from "@/models/email-account.model";
import { GmailThreadModel, IGmailThread } from "@/models/gmail-thread.model";

export interface GmailSyncOptions {
  folder?: string;
  limit?: number;
  since?: Date;
  fetchAll?: boolean;
}

export interface GmailSyncResult {
  success: boolean;
  threads: IGmailThread[];
  totalCount: number;
  newCount: number;
  error?: string;
  syncStatus?: string;
}

export class GmailSyncService {
  /**
   * Fetch and save Gmail thread metadata directly without parsing
   */
  static async syncThreads(account: IEmailAccount, options: GmailSyncOptions = {}): Promise<GmailSyncResult> {
    try {
      console.log("🔄 [Gmail] Fetching raw thread metadata for:", account.emailAddress);

      if (!account.oauth?.accessToken) {
        console.error("❌ [Gmail] No OAuth access token available for:", account.emailAddress);
        throw new Error("No OAuth access token available for Gmail");
      }

      if (!account.oauth?.refreshToken) {
        console.error("❌ [Gmail] No OAuth refresh token available for:", account.emailAddress);
        throw new Error("No OAuth refresh token available for Gmail");
      }

      const oauth2Client = new google.auth.OAuth2(
        process.env.GOOGLE_CLIENT_ID,
        process.env.GOOGLE_CLIENT_SECRET,
        process.env.GOOGLE_REDIRECT_URI
      );

      // Get decrypted access token using the proper method
      const { EmailOAuthService } = await import("@/services/emailOAuth.service");
      const decryptedAccessToken = EmailOAuthService.getDecryptedAccessToken(account);

      if (!decryptedAccessToken) {
        console.error("❌ [Gmail] Failed to decrypt access token for:", account.emailAddress);
        throw new Error("Failed to decrypt OAuth access token");
      }

      // Also set refresh token for automatic token refresh
      const decryptedRefreshToken = account.oauth.refreshToken
        ? EmailOAuthService.decryptData(account.oauth.refreshToken)
        : null;

      if (!decryptedRefreshToken) {
        console.error("❌ [Gmail] Failed to decrypt refresh token for:", account.emailAddress);
        throw new Error("Failed to decrypt OAuth refresh token");
      }

      console.log("✅ [Gmail] Successfully decrypted OAuth tokens for:", account.emailAddress);

      oauth2Client.setCredentials({
        access_token: decryptedAccessToken,
        refresh_token: decryptedRefreshToken,
      });

      // Use centralized token refresh logic
      try {
        const refreshResult = await EmailOAuthService.refreshAndUpdateTokens(account);
        if (refreshResult.success && refreshResult.accessToken) {
          console.log("🔄 [Gmail] Token refreshed via centralized method for:", account.emailAddress);
          oauth2Client.setCredentials({
            access_token: refreshResult.accessToken,
            refresh_token: decryptedRefreshToken,
          });
        }
      } catch (refreshError: any) {
        console.warn("⚠️ [Gmail] Centralized token refresh failed for:", account.emailAddress, refreshError.message);
        // Continue with existing token - it might still work
      }

      const gmail = google.gmail({ version: "v1", auth: oauth2Client });

      // Get threads list with error handling
      console.log("🔍 [Gmail] Fetching threads from Gmail API...");
      const threadsResponse = await gmail.users.threads.list({
        userId: "me",
        q: options.folder === "SENT" ? "in:sent" : "in:inbox",
        maxResults: options.limit || 100,
      });

      const threads = threadsResponse.data.threads || [];
      console.log(`📧 [Gmail] Successfully fetched ${threads.length} threads from Gmail API`);

      const processedThreads: IGmailThread[] = [];
      let newCount = 0;

      // Process each thread - get essential metadata for frontend display
      // Call users.threads.get to get important metadata (but not full message content)
      for (const thread of threads) {
        if (!thread.id) continue;

        try {
          // Get thread details to extract essential metadata for frontend
          console.log(`🔍 [Gmail] Fetching metadata for thread: ${thread.id}`);
          const threadDetails = await gmail.users.threads.get({
            userId: "me",
            id: thread.id,
            format: "metadata", // Only get metadata, not full content
            metadataHeaders: ["From", "To", "Subject", "Date"], // Only essential headers
          });

          const messages = threadDetails.data.messages || [];
          if (messages.length === 0) continue;

          // Extract essential metadata from the first and last messages
          const firstMessage = messages[0];
          const lastMessage = messages[messages.length - 1];

          // Extract subject from first message
          const subject = this.extractHeaderValue(firstMessage.payload?.headers || [], "Subject") || "No Subject";
          const normalizedSubject = this.normalizeSubject(subject);

          // Extract participants (from/to) from messages
          const participants = this.extractParticipants(messages || []);

          // Extract latest email metadata
          const latestFrom = this.extractHeaderValue(lastMessage.payload?.headers || [], "From") || "";
          const latestTo = this.extractHeaderValue(lastMessage.payload?.headers || [], "To") || "";

          // Create Gmail thread data with essential metadata
          const gmailThreadData: Partial<IGmailThread> = {
            threadId: thread.id,
            accountId: account._id?.toString() || "",

            // Store essential metadata from threads.get
            rawGmailData: {
              threadId: thread.id || "",
              historyId: thread.historyId || "",
              messageIds: messages.map((msg) => msg.id || ""), // Store message IDs
              messageCount: messages.length,
              labelIds: messages.flatMap((msg) => msg.labelIds || []),
            },

            // Essential metadata for frontend display
            subject,
            normalizedSubject,
            participants,
            messageCount: messages.length,
            unreadCount: messages.filter((m) => m.labelIds?.includes("UNREAD")).length,
            isStarred: messages.some((m) => m.labelIds?.includes("STARRED")),
            hasAttachments: messages.some((m) => m.payload?.parts?.some((p) => p.filename && p.filename.length > 0)),
            firstMessageAt: new Date(parseInt(firstMessage.internalDate || Date.now().toString())),
            lastMessageAt: new Date(parseInt(lastMessage.internalDate || Date.now().toString())),
            lastActivity: new Date(parseInt(lastMessage.internalDate || Date.now().toString())),
            status: "active",
            folder: options.folder || "INBOX",
            category: "primary",
            threadType: "conversation",
            isPinned: false,
            totalSize: messages.reduce((sum, m) => sum + (m.sizeEstimate || 0), 0),

            // Latest email metadata for frontend
            latestEmailFrom: {
              email: this.parseEmailAddress(latestFrom)?.email || account.emailAddress,
              name: this.parseEmailAddress(latestFrom)?.name || this.extractSenderName(latestFrom),
            },
            latestEmailTo: this.parseEmailAddresses(latestTo),
            latestEmailPreview: lastMessage.snippet || "",
          };

          // Save or update thread metadata
          const existingThread = await GmailThreadModel.findOne({
            threadId: thread.id,
            accountId: account._id?.toString(),
          });

          let savedThread: IGmailThread;
          if (existingThread) {
            // Update existing thread with raw data
            Object.assign(existingThread, gmailThreadData);
            savedThread = await existingThread.save();
          } else {
            // Create new thread with raw data
            savedThread = await GmailThreadModel.create(gmailThreadData);
            newCount++;
          }

          // Don't store individual emails - they will be fetched on-demand when thread is opened

          processedThreads.push(savedThread);
        } catch (threadError) {
          console.error("❌ [Gmail] Error processing thread:", thread.id, threadError);
          // Continue with other threads
        }
      }

      console.log(`✅ [Gmail] Processed ${processedThreads.length} threads, ${newCount} new (thread metadata only)`);

      return {
        success: true,
        threads: processedThreads,
        totalCount: processedThreads.length,
        newCount,
        syncStatus: "completed",
      };
    } catch (error: any) {
      console.error("❌ [Gmail] Error fetching thread metadata for:", account.emailAddress, error);

      // Provide more specific error messages
      let errorMessage = error.message;
      if (error.code === 401) {
        errorMessage = "OAuth token expired or invalid. Please re-authenticate your Gmail account.";
      } else if (error.code === 403) {
        errorMessage = "Gmail API access forbidden. Please check your OAuth permissions.";
      } else if (error.code === 429) {
        errorMessage = "Gmail API rate limit exceeded. Please try again later.";
      }

      return {
        success: false,
        threads: [],
        totalCount: 0,
        newCount: 0,
        error: errorMessage,
        syncStatus: "failed",
      };
    }
  }

  /**
   * Get Gmail threads for an account with filtering
   */
  static async getThreads(
    accountId: string,
    options: {
      folder?: string;
      limit?: number;
      offset?: number;
      unreadOnly?: boolean;
    } = {}
  ): Promise<IGmailThread[]> {
    const filter: any = { accountId };

    if (options.folder) {
      filter.folder = options.folder;
    }

    if (options.unreadOnly) {
      filter.unreadCount = { $gt: 0 };
    }

    const threads = await GmailThreadModel.find(filter)
      .sort({ lastActivity: -1 })
      .limit(options.limit || 20)
      .skip(options.offset || 0)
      .lean();

    return threads as unknown as IGmailThread[];
  }

  /**
   * Fetch emails on-demand when user opens a thread
   * Returns actual email content from Gmail API without storing in database
   */
  static async getThreadEmails(
    account: IEmailAccount,
    threadId: string
  ): Promise<{
    success: boolean;
    emails?: any[];
    error?: string;
  }> {
    try {
      console.log(`🔍 [Gmail] Fetching emails on-demand for thread: ${threadId}`);

      if (!account.oauth?.accessToken) {
        throw new Error("No OAuth access token available for Gmail");
      }

      const oauth2Client = new google.auth.OAuth2(
        process.env.GOOGLE_CLIENT_ID,
        process.env.GOOGLE_CLIENT_SECRET,
        process.env.GOOGLE_REDIRECT_URI
      );

      // Get decrypted access token
      const { EmailOAuthService } = await import("@/services/emailOAuth.service");
      const decryptedAccessToken = EmailOAuthService.getDecryptedAccessToken(account);

      if (!decryptedAccessToken) {
        throw new Error("Failed to decrypt OAuth access token");
      }

      oauth2Client.setCredentials({
        access_token: decryptedAccessToken,
      });

      const gmail = google.gmail({ version: "v1", auth: oauth2Client });

      // Fetch full thread details with complete message content
      const threadDetails = await gmail.users.threads.get({
        userId: "me",
        id: threadId,
        format: "full", // Get full message content
      });

      const messages = threadDetails.data.messages || [];
      if (messages.length === 0) {
        throw new Error("No messages found in thread");
      }

      // Transform Gmail messages to our format
      const emails = messages.map((message, index) => {
        const headers = message.payload?.headers || [];
        const fromHeader = this.extractHeaderValue(headers, "From") || "";
        const toHeader = this.extractHeaderValue(headers, "To") || "";
        const subjectHeader = this.extractHeaderValue(headers, "Subject") || "No Subject";
        const dateHeader = this.extractHeaderValue(headers, "Date") || "";

        // Extract text and HTML content with proper multipart handling
        let textContent = "";
        let htmlContent = "";

        // Helper function to recursively parse message parts
        const extractContentFromParts = (parts: any[]): void => {
          if (!parts) return;

          for (const part of parts) {
            if (part.mimeType === "text/plain" && part.body?.data) {
              textContent = Buffer.from(part.body.data, "base64").toString();
            } else if (part.mimeType === "text/html" && part.body?.data) {
              htmlContent = Buffer.from(part.body.data, "base64").toString();
            } else if (part.mimeType?.startsWith("multipart/") && part.parts) {
              // Recursively handle nested multipart
              extractContentFromParts(part.parts);
            }
          }
        };

        // Check if message has direct body content
        if (message.payload?.body?.data) {
          const mimeType = message.payload?.mimeType || "text/plain";
          const content = Buffer.from(message.payload.body.data, "base64").toString();

          if (mimeType === "text/html") {
            htmlContent = content;
          } else {
            textContent = content;
          }
        }

        // Process parts if available
        if (message.payload?.parts) {
          extractContentFromParts(message.payload.parts);
        }

        // Fallback to snippet if no content found
        if (!textContent && !htmlContent && message.snippet) {
          textContent = message.snippet;
        }

        // Determine direction and properly map from/to fields
        const isOutbound = fromHeader.includes(account.emailAddress);
        const direction = isOutbound ? "outbound" : "inbound";

        // Debug logging for email field mapping
        console.log(`📧 [Gmail] Email field mapping for message ${message.id}:`, {
          fromHeader,
          toHeader,
          accountEmail: account.emailAddress,
          isOutbound,
          direction,
          parsedFrom: this.parseEmailAddress(fromHeader),
          parsedTo: this.parseEmailAddresses(toHeader),
        });

        return {
          _id: message.id, // Use Gmail message ID as _id
          messageId: message.id,
          threadId: threadId,
          direction,
          subject: subjectHeader,
          textContent: textContent || message.snippet || "",
          htmlContent: htmlContent,
          // For outbound emails: from = sender (user), to = recipients
          // For inbound emails: from = sender (external), to = recipients
          from: {
            email: this.parseEmailAddress(fromHeader)?.email || fromHeader,
            name: this.parseEmailAddress(fromHeader)?.name,
          },
          to: this.parseEmailAddresses(toHeader),
          cc: this.parseEmailAddresses(this.extractHeaderValue(headers, "Cc") || ""),
          bcc: this.parseEmailAddresses(this.extractHeaderValue(headers, "Bcc") || ""),
          receivedAt: new Date(parseInt(message.internalDate || Date.now().toString())),
          sentAt: new Date(parseInt(message.internalDate || Date.now().toString())),
          isRead: !message.labelIds?.includes("UNREAD"),
          isReplied: false,
          isForwarded: false,
          isArchived: false,
          isSpam: message.labelIds?.includes("SPAM") || false,
          attachments:
            message.payload?.parts
              ?.filter((part) => part.filename && part.filename.length > 0)
              .map((part) => ({
                fileName: part.filename,
                fileSize: part.body?.size || 0,
                fileType: part.mimeType,
                contentId: part.body?.attachmentId,
              })) || [],
        };
      });

      console.log(`✅ [Gmail] Fetched ${emails.length} emails on-demand for thread: ${threadId}`);

      return {
        success: true,
        emails: emails.sort((a, b) => new Date(a.receivedAt).getTime() - new Date(b.receivedAt).getTime()),
      };
    } catch (error: any) {
      console.error("❌ [Gmail] Error fetching emails on-demand:", error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Fetch full thread details when user opens a specific thread
   * This is the ONLY place where gmail.users.threads.get is called
   */
  static async getThreadDetails(
    account: IEmailAccount,
    threadId: string
  ): Promise<{
    success: boolean;
    thread?: any;
    error?: string;
  }> {
    try {
      console.log(`🔍 [Gmail] Fetching full details for thread: ${threadId}`);

      if (!account.oauth?.accessToken) {
        throw new Error("No OAuth access token available for Gmail");
      }

      const oauth2Client = new google.auth.OAuth2(
        process.env.GOOGLE_CLIENT_ID,
        process.env.GOOGLE_CLIENT_SECRET,
        process.env.GOOGLE_REDIRECT_URI
      );

      // Get decrypted access token using the proper method
      const { EmailOAuthService } = await import("@/services/emailOAuth.service");
      const decryptedAccessToken = EmailOAuthService.getDecryptedAccessToken(account);

      if (!decryptedAccessToken) {
        throw new Error("Failed to decrypt OAuth access token");
      }

      oauth2Client.setCredentials({
        access_token: decryptedAccessToken,
      });

      const gmail = google.gmail({ version: "v1", auth: oauth2Client });

      // NOW we call gmail.users.threads.get for full details
      const threadDetails = await gmail.users.threads.get({
        userId: "me",
        id: threadId,
      });

      const messages = threadDetails.data.messages || [];
      if (messages.length === 0) {
        throw new Error("No messages found in thread");
      }

      // Extract full metadata from the detailed response
      const firstMessage = messages[0];
      const lastMessage = messages[messages.length - 1];
      const subject = this.extractHeaderValue(firstMessage.payload?.headers || [], "Subject") || "No Subject";
      const normalizedSubject = this.normalizeSubject(subject);
      const participants = this.extractParticipants(messages || []);

      // Update the thread in database with full details
      const { GmailThreadModel } = await import("@/models/gmail-thread.model");
      const updatedThread = await GmailThreadModel.findOneAndUpdate(
        { threadId, accountId: account._id?.toString() },
        {
          $set: {
            subject,
            normalizedSubject,
            participants,
            messageCount: messages.length,
            unreadCount: messages.filter((m) => m.labelIds?.includes("UNREAD")).length,
            isStarred: messages.some((m) => m.labelIds?.includes("STARRED")),
            hasAttachments: messages.some(
              (m) =>
                m.payload?.parts?.some((p) => p.filename && p.filename.length > 0) ||
                (m.payload?.filename && m.payload.filename.length > 0)
            ),
            firstMessageAt: new Date(parseInt(firstMessage.internalDate || Date.now().toString())),
            lastMessageAt: new Date(parseInt(lastMessage.internalDate || Date.now().toString())),
            lastActivity: new Date(parseInt(lastMessage.internalDate || Date.now().toString())),
            totalSize: messages.reduce((sum, m) => sum + (m.sizeEstimate || 0), 0),
            latestEmailFrom: {
              email: this.extractHeaderValue(lastMessage.payload?.headers || [], "From") || "",
              name: this.extractSenderName(this.extractHeaderValue(lastMessage.payload?.headers || [], "From") || ""),
            },
            latestEmailTo: this.parseEmailAddresses(
              this.extractHeaderValue(lastMessage.payload?.headers || [], "To") || ""
            ),
            latestEmailPreview: lastMessage.snippet || "",
            "rawGmailData.messageIds": messages.map((msg) => msg.id || ""),
            "rawGmailData.messageCount": messages.length,
            "rawGmailData.labelIds": messages.flatMap((msg) => msg.labelIds || []),
          },
        },
        { new: true }
      );

      console.log(`✅ [Gmail] Thread details updated for: ${threadId}`);

      return {
        success: true,
        thread: updatedThread,
      };
    } catch (error: any) {
      console.error("❌ [Gmail] Error fetching thread details:", error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  // Helper methods
  private static extractHeaderValue(headers: any[], name: string): string | undefined {
    const header = headers?.find((h) => h.name?.toLowerCase() === name.toLowerCase());
    return header?.value;
  }

  private static normalizeSubject(subject: string): string {
    return subject
      .replace(/^(Re:|Fwd?:|RE:|FWD?:|FW:|fw:)\s*/gi, "") // Remove Re:/Fwd: prefixes
      .replace(/^\[.*?\]\s*/g, "") // Remove [tag] prefixes
      .trim()
      .toLowerCase();
  }

  private static extractParticipants(messages: any[]): Array<{ email: string; name?: string }> {
    const participants = new Map<string, { email: string; name?: string }>();

    messages.forEach((message) => {
      const headers = message.payload?.headers || [];

      // Extract from
      const from = this.extractHeaderValue(headers, "From");
      if (from) {
        const parsed = this.parseEmailAddress(from);
        if (parsed?.email) {
          participants.set(parsed.email, parsed);
        }
      }

      // Extract to
      const to = this.extractHeaderValue(headers, "To");
      if (to) {
        const parsed = this.parseEmailAddresses(to);
        parsed.forEach((p) => {
          if (p.email) {
            participants.set(p.email, p);
          }
        });
      }
    });

    return Array.from(participants.values());
  }

  private static parseEmailAddress(emailStr: string): { email: string; name?: string } | null {
    if (!emailStr) return null;

    const match = emailStr.match(/(?:"?([^"]*)"?\s)?<?([^>]+)>?/);
    if (match) {
      return {
        name: match[1]?.trim() || undefined,
        email: match[2]?.trim() || "",
      };
    }
    return { email: emailStr.trim(), name: undefined };
  }

  private static parseEmailAddresses(emailStr: string): Array<{ email: string; name?: string }> {
    if (!emailStr) return [];

    return emailStr
      .split(",")
      .map((addr) => this.parseEmailAddress(addr.trim()))
      .filter(Boolean) as Array<{ email: string; name?: string }>;
  }

  private static extractSenderName(fromHeader?: string): string | undefined {
    if (!fromHeader) return undefined;
    const parsed = this.parseEmailAddress(fromHeader);
    return parsed?.name;
  }
}
