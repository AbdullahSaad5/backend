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
        throw new Error("No OAuth access token available for Gmail");
      }

      const oauth2Client = new google.auth.OAuth2(
        process.env.GOOGLE_CLIENT_ID,
        process.env.GOOGLE_CLIENT_SECRET,
        process.env.GOOGLE_REDIRECT_URI
      );

      // Decrypt access token
      const { EmailOAuthService } = await import("@/services/emailOAuth.service");
      const decryptedAccessToken = EmailOAuthService.decryptData(account.oauth.accessToken);

      oauth2Client.setCredentials({
        access_token: decryptedAccessToken,
      });

      const gmail = google.gmail({ version: "v1", auth: oauth2Client });

      // Get threads list
      const threadsResponse = await gmail.users.threads.list({
        userId: "me",
        q: options.folder === "SENT" ? "in:sent" : "in:inbox",
        maxResults: options.limit || 100,
      });

      const threads = threadsResponse.data.threads || [];
      console.log(`📧 [Gmail] Found ${threads.length} threads`);

      const processedThreads: IGmailThread[] = [];
      let newCount = 0;

      // Process each thread - save raw data directly
      for (const thread of threads) {
        if (!thread.id) continue;

        try {
          // Get thread details
          const threadDetails = await gmail.users.threads.get({
            userId: "me",
            id: thread.id,
          });

          const messages = threadDetails.data.messages || [];
          if (messages.length === 0) continue;

          // Extract basic metadata for quick access
          const firstMessage = messages[0];
          const lastMessage = messages[messages.length - 1];
          const subject = this.extractHeaderValue(firstMessage.payload?.headers, "Subject") || "No Subject";
          const normalizedSubject = this.normalizeSubject(subject);

          // Extract participants
          const participants = this.extractParticipants(messages);

          // Create Gmail thread data
          const gmailThreadData: Partial<IGmailThread> = {
            threadId: thread.id,
            accountId: account._id,

            // Store raw Gmail data
            rawGmailData: {
              threadId: thread.id,
              historyId: thread.historyId,
              messages: messages.map((msg) => ({
                id: msg.id!,
                threadId: msg.threadId!,
                labelIds: msg.labelIds || [],
                snippet: msg.snippet || "",
                sizeEstimate: msg.sizeEstimate || 0,
                internalDate: msg.internalDate || Date.now().toString(),
                payload: msg.payload,
              })),
            },

            // Computed metadata for quick access
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
            status: "active",
            folder: options.folder || "INBOX",
            category: "primary",
            threadType: "conversation",
            isPinned: false,
            totalSize: messages.reduce((sum, m) => sum + (m.sizeEstimate || 0), 0),

            // Latest email metadata
            latestEmailFrom: {
              email: this.extractHeaderValue(lastMessage.payload?.headers, "From") || "",
              name: this.extractSenderName(this.extractHeaderValue(lastMessage.payload?.headers, "From")),
            },
            latestEmailTo: this.parseEmailAddresses(this.extractHeaderValue(lastMessage.payload?.headers, "To")),
            latestEmailPreview: lastMessage.snippet || "",
          };

          // Save or update thread metadata
          const existingThread = await GmailThreadModel.findOne({
            threadId: thread.id,
            accountId: account._id,
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

          processedThreads.push(savedThread);
        } catch (threadError) {
          console.error("❌ [Gmail] Error processing thread:", thread.id, threadError);
          // Continue with other threads
        }
      }

      console.log(`✅ [Gmail] Processed ${processedThreads.length} threads, ${newCount} new (raw data)`);

      return {
        success: true,
        threads: processedThreads,
        totalCount: processedThreads.length,
        newCount,
        syncStatus: "completed",
      };
    } catch (error: any) {
      console.error("❌ [Gmail] Error fetching thread metadata:", error);
      return {
        success: false,
        threads: [],
        totalCount: 0,
        newCount: 0,
        error: error.message,
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

    return GmailThreadModel.find(filter)
      .sort({ lastActivity: -1 })
      .limit(options.limit || 20)
      .skip(options.offset || 0)
      .lean();
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
