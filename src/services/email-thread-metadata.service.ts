import { IEmailAccount } from "@/models/email-account.model";
import { EmailThreadModel } from "@/models/email-thread.model";
import { google } from "googleapis";
import Imap from "imap";
import { simpleParser } from "mailparser";

export interface ThreadMetadata {
  threadId: string;
  subject: string;
  normalizedSubject: string;
  participants: { email: string; name?: string }[];
  messageCount: number;
  unreadCount: number;
  firstMessageAt: Date;
  lastMessageAt: Date;
  status: "active" | "closed" | "archived" | "spam";
  folder: string;
  category?: string;
  threadType: "conversation" | "notification" | "marketing" | "system";
  isStarred: boolean;
  isPinned: boolean;
  hasAttachments: boolean;
  totalSize: number;
  lastActivity: Date;
  latestEmailPreview?: string;
  latestEmailFrom?: { email: string; name?: string };
  latestEmailTo?: { email: string; name?: string }[];
}

export interface ThreadMetadataResult {
  success: boolean;
  threads: ThreadMetadata[];
  totalCount: number;
  newCount: number;
  error?: string;
  syncStatus?: string;
}

export class EmailThreadMetadataService {
  /**
   * Fetch and save raw Gmail thread metadata directly without parsing
   */
  static async fetchGmailThreadMetadata(
    account: IEmailAccount,
    options: {
      folder?: string;
      limit?: number;
      since?: Date;
      fetchAll?: boolean;
    } = {}
  ): Promise<ThreadMetadataResult> {
    try {
      console.log("🔄 Fetching raw Gmail thread metadata for:", account.emailAddress);

      if (!account.oauth?.accessToken) {
        throw new Error("No OAuth access token available");
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
      console.log(`📧 Found ${threads.length} Gmail threads`);

      const threadMetadata: ThreadMetadata[] = [];
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

          // Save raw Gmail thread data directly without parsing
          const rawThreadData = {
            threadId: thread.id,
            accountId: account._id,
            // Store raw Gmail data
            rawGmailData: {
              threadId: thread.id,
              historyId: thread.historyId,
              messages: messages.map((msg) => ({
                id: msg.id,
                threadId: msg.threadId,
                labelIds: msg.labelIds || [],
                snippet: msg.snippet,
                sizeEstimate: msg.sizeEstimate,
                internalDate: msg.internalDate,
                payload: msg.payload,
              })),
            },
            // Basic metadata for quick access
            messageCount: messages.length,
            unreadCount: messages.filter((m) => m.labelIds?.includes("UNREAD")).length,
            isStarred: messages.some((m) => m.labelIds?.includes("STARRED")),
            hasAttachments: messages.some(
              (m) =>
                m.payload?.parts?.some((p) => p.filename && p.filename.length > 0) ||
                (m.payload?.filename && m.payload.filename.length > 0)
            ),
            firstMessageAt: new Date(parseInt(messages[0].internalDate || Date.now().toString())),
            lastMessageAt: new Date(parseInt(messages[messages.length - 1].internalDate || Date.now().toString())),
            lastActivity: new Date(parseInt(messages[messages.length - 1].internalDate || Date.now().toString())),
            status: "active",
            folder: options.folder || "INBOX",
            threadType: "conversation",
            isPinned: false,
            totalSize: messages.reduce((sum, m) => sum + (m.sizeEstimate || 0), 0),
            // Placeholder fields for compatibility
            subject: "Raw Gmail Thread",
            normalizedSubject: "raw_gmail_thread",
            participants: [],
            category: "primary",
            latestEmailFrom: { email: "", name: "" },
            latestEmailTo: [],
            latestEmailPreview: "",
          };

          // Save or update thread metadata
          const existingThread = await EmailThreadModel.findOne({
            threadId: thread.id,
            accountId: account._id,
          });

          if (existingThread) {
            // Update existing thread with raw data
            Object.assign(existingThread, rawThreadData);
            await existingThread.save();
          } else {
            // Create new thread with raw data
            await EmailThreadModel.create(rawThreadData);
            newCount++;
          }

          // Add to result for frontend
          threadMetadata.push({
            threadId: thread.id,
            subject: "Raw Gmail Thread",
            normalizedSubject: "raw_gmail_thread",
            participants: [],
            messageCount: messages.length,
            unreadCount: messages.filter((m) => m.labelIds?.includes("UNREAD")).length,
            firstMessageAt: new Date(parseInt(messages[0].internalDate || Date.now().toString())),
            lastMessageAt: new Date(parseInt(messages[messages.length - 1].internalDate || Date.now().toString())),
            status: "active",
            folder: options.folder || "INBOX",
            category: "primary",
            threadType: "conversation",
            isStarred: messages.some((m) => m.labelIds?.includes("STARRED")),
            isPinned: false,
            hasAttachments: messages.some(
              (m) =>
                m.payload?.parts?.some((p) => p.filename && p.filename.length > 0) ||
                (m.payload?.filename && m.payload.filename.length > 0)
            ),
            totalSize: messages.reduce((sum, m) => sum + (m.sizeEstimate || 0), 0),
            lastActivity: new Date(parseInt(messages[messages.length - 1].internalDate || Date.now().toString())),
            latestEmailPreview: messages[messages.length - 1].snippet || "",
            latestEmailFrom: { email: "", name: "" },
            latestEmailTo: [],
          });
        } catch (threadError) {
          console.error("Error processing thread:", thread.id, threadError);
          // Continue with other threads
        }
      }

      console.log(`✅ Processed ${threadMetadata.length} threads, ${newCount} new (raw data)`);

      return {
        success: true,
        threads: threadMetadata,
        totalCount: threadMetadata.length,
        newCount,
        syncStatus: "completed",
      };
    } catch (error: any) {
      console.error("Error fetching Gmail thread metadata:", error);
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
   * Fetch and save only thread metadata from IMAP
   */
  static async fetchImapThreadMetadata(
    account: IEmailAccount,
    options: {
      folder?: string;
      limit?: number;
      since?: Date;
      fetchAll?: boolean;
    } = {}
  ): Promise<ThreadMetadataResult> {
    return new Promise((resolve) => {
      try {
        console.log("🔄 Fetching IMAP thread metadata for:", account.emailAddress);

        const imap = new Imap({
          user: account.incomingServer?.username || account.emailAddress,
          password: account.incomingServer?.password || "",
          host: account.incomingServer?.host || "",
          port: account.incomingServer?.port || 993,
          tls: account.incomingServer?.security === "ssl",
          tlsOptions: { rejectUnauthorized: false },
        });

        const threadMetadata: ThreadMetadata[] = [];
        let newCount = 0;

        imap.once("ready", () => {
          const folder = options.folder || "INBOX";
          imap.openBox(folder, false, (err, box) => {
            if (err) {
              console.error("Error opening mailbox:", err);
              resolve({
                success: false,
                threads: [],
                totalCount: 0,
                newCount: 0,
                error: err.message,
                syncStatus: "failed",
              });
              return;
            }

            // Get message count
            const messageCount = box.messages.total;
            const limit = Math.min(options.limit || 100, messageCount);

            // Fetch message headers in batches
            const fetchHeaders = (start: number, end: number) => {
              const range = `${start}:${end}`;
              const fetch = imap.fetch(range, {
                bodies: "",
                struct: true,
              });

              fetch.on("message", (msg, seqno) => {
                let buffer = "";
                msg.on("body", (stream) => {
                  stream.on("data", (chunk) => {
                    buffer += chunk.toString("utf8");
                  });
                });

                msg.once("end", async () => {
                  try {
                    const parsed = await simpleParser(buffer);

                    // Create thread metadata from parsed email
                    const threadData = await this.createThreadMetadataFromEmail(parsed, account);

                    if (threadData) {
                      // Save or update thread metadata
                      const existingThread = await EmailThreadModel.findOne({
                        threadId: threadData.threadId,
                        accountId: account._id,
                      });

                      if (existingThread) {
                        // Update existing thread
                        Object.assign(existingThread, threadData);
                        await existingThread.save();
                      } else {
                        // Create new thread
                        await EmailThreadModel.create({
                          ...threadData,
                          accountId: account._id,
                        });
                        newCount++;
                      }

                      threadMetadata.push(threadData);
                    }
                  } catch (parseError) {
                    console.error("Error parsing email:", parseError);
                  }
                });
              });

              fetch.once("error", (err) => {
                console.error("Fetch error:", err);
              });

              fetch.once("end", () => {
                // Continue with next batch or finish
                const nextStart = end + 1;
                if (nextStart <= limit) {
                  fetchHeaders(nextStart, Math.min(nextStart + 49, limit));
                } else {
                  // All batches complete
                  imap.end();
                }
              });
            };

            // Start fetching from the latest messages
            const start = Math.max(1, messageCount - limit + 1);
            fetchHeaders(start, messageCount);
          });
        });

        imap.once("error", (err: any) => {
          console.error("IMAP connection error:", err);
          resolve({
            success: false,
            threads: [],
            totalCount: 0,
            newCount: 0,
            error: err.message,
            syncStatus: "failed",
          });
        });

        imap.once("end", () => {
          console.log(`✅ IMAP thread metadata fetch completed: ${threadMetadata.length} threads, ${newCount} new`);
          resolve({
            success: true,
            threads: threadMetadata,
            totalCount: threadMetadata.length,
            newCount,
            syncStatus: "completed",
          });
        });

        imap.connect();
      } catch (error: any) {
        console.error("Error setting up IMAP connection:", error);
        resolve({
          success: false,
          threads: [],
          totalCount: 0,
          newCount: 0,
          error: error.message,
          syncStatus: "failed",
        });
      }
    });
  }

  /**
   * Create thread metadata from a parsed email
   */
  private static async createThreadMetadataFromEmail(
    parsed: any,
    account: IEmailAccount
  ): Promise<ThreadMetadata | null> {
    try {
      const subject = parsed.subject || "No Subject";
      const normalizedSubject = subject.replace(/^(Re:|Fwd?:|RE:|FWD?:)\s*/gi, "").trim();
      const threadId = `thread_${normalizedSubject.replace(/[^a-zA-Z0-9]/g, "_").toLowerCase()}_${Date.now()}`;

      const participants = [
        { email: parsed.from?.text || parsed.from?.value?.[0]?.address || "", name: parsed.from?.value?.[0]?.name },
        ...(parsed.to?.value || []).map((to: any) => ({ email: to.address, name: to.name })),
      ].filter((p) => p.email);

      return {
        threadId,
        subject,
        normalizedSubject,
        participants,
        messageCount: 1, // Will be updated when more emails in thread are found
        unreadCount: 0,
        firstMessageAt: parsed.date || new Date(),
        lastMessageAt: parsed.date || new Date(),
        status: "active",
        folder: "INBOX",
        category: this.determineCategory(subject, parsed.from?.text || ""),
        threadType: "conversation",
        isStarred: false,
        isPinned: false,
        hasAttachments: !!(parsed.attachments && parsed.attachments.length > 0),
        totalSize: parsed.text?.length || 0 + parsed.html?.length || 0,
        lastActivity: parsed.date || new Date(),
        latestEmailPreview: parsed.text?.substring(0, 200) || parsed.html?.substring(0, 200) || "",
        latestEmailFrom: { email: parsed.from?.text || "", name: parsed.from?.value?.[0]?.name },
        latestEmailTo: (parsed.to?.value || []).map((to: any) => ({ email: to.address, name: to.name })),
      };
    } catch (error) {
      console.error("Error creating thread metadata from email:", error);
      return null;
    }
  }

  /**
   * Extract participants from Gmail messages
   */
  private static extractParticipants(messages: any[]): { email: string; name?: string }[] {
    const participants = new Map<string, { email: string; name?: string }>();

    messages.forEach((message) => {
      const headers = message.payload?.headers || [];

      // Extract from
      const from = headers.find((h: any) => h.name === "From")?.value || "";
      if (from) {
        const parsed = this.parseEmailAddress(from);
        if (parsed?.email) {
          participants.set(parsed.email, parsed);
        }
      }

      // Extract to
      const to = headers.find((h: any) => h.name === "To")?.value || "";
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

  /**
   * Parse email address string
   */
  private static parseEmailAddress(emailStr: string): { email: string; name?: string } | null {
    const match = emailStr.match(/(?:"?([^"]*)"?\s)?<?([^>]+)>?/);
    if (match) {
      return {
        name: match[1]?.trim() || undefined,
        email: match[2]?.trim() || "",
      };
    }
    return { email: emailStr.trim(), name: undefined };
  }

  /**
   * Parse multiple email addresses
   */
  private static parseEmailAddresses(emailStr: string): { email: string; name?: string }[] {
    return emailStr
      .split(",")
      .map((addr) => this.parseEmailAddress(addr.trim()))
      .filter(Boolean) as { email: string; name?: string }[];
  }

  /**
   * Extract preview from Gmail message
   */
  private static extractPreview(message: any): string {
    try {
      const snippet = message.snippet || "";
      return snippet.substring(0, 200);
    } catch (error) {
      return "";
    }
  }

  /**
   * Determine email category based on subject and sender
   */
  private static determineCategory(subject: string, from: string): string {
    const lowerSubject = subject.toLowerCase();
    const lowerFrom = from.toLowerCase();

    if (lowerFrom.includes("noreply") || lowerFrom.includes("no-reply")) {
      return "notifications";
    }

    if (lowerSubject.includes("promo") || lowerSubject.includes("sale") || lowerSubject.includes("discount")) {
      return "promotions";
    }

    if (lowerSubject.includes("social") || lowerFrom.includes("facebook") || lowerFrom.includes("twitter")) {
      return "social";
    }

    if (lowerSubject.includes("update") || lowerSubject.includes("newsletter")) {
      return "updates";
    }

    return "primary";
  }
}
