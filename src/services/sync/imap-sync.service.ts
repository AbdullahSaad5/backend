import Imap from "imap";
import { simpleParser } from "mailparser";
import { IEmailAccount } from "@/models/email-account.model";
import { IMAPThreadModel, IIMAPThread } from "@/models/imap-thread.model";

export interface IMAPSyncOptions {
  folder?: string;
  limit?: number;
  since?: Date;
  fetchAll?: boolean;
}

export interface IMAPSyncResult {
  success: boolean;
  threads: IIMAPThread[];
  totalCount: number;
  newCount: number;
  error?: string;
  syncStatus?: string;
}

export class IMAPSyncService {
  /**
   * Fetch and save IMAP thread metadata
   */
  static async syncThreads(account: IEmailAccount, options: IMAPSyncOptions = {}): Promise<IMAPSyncResult> {
    return new Promise((resolve) => {
      try {
        console.log("🔄 [IMAP] Fetching thread metadata for:", account.emailAddress);

        const imap = new Imap({
          user: account.incomingServer?.username || account.emailAddress,
          password: account.incomingServer?.password || "",
          host: account.incomingServer?.host || "",
          port: account.incomingServer?.port || 993,
          tls: account.incomingServer?.security === "ssl",
          tlsOptions: { rejectUnauthorized: false },
        });

        const processedThreads: IIMAPThread[] = [];
        let newCount = 0;

        imap.once("ready", () => {
          const folder = options.folder || "INBOX";
          imap.openBox(folder, false, (err, box) => {
            if (err) {
              console.error("❌ [IMAP] Error opening mailbox:", err);
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
                      const existingThread = await IMAPThreadModel.findOne({
                        threadId: threadData.threadId,
                        accountId: account._id,
                      });

                      let savedThread: IIMAPThread;
                      if (existingThread) {
                        // Update existing thread
                        Object.assign(existingThread, threadData);
                        savedThread = await existingThread.save();
                      } else {
                        // Create new thread
                        savedThread = await IMAPThreadModel.create({
                          ...threadData,
                          accountId: account._id,
                        });
                        newCount++;
                      }

                      processedThreads.push(savedThread);
                    }
                  } catch (parseError) {
                    console.error("❌ [IMAP] Error parsing email:", parseError);
                  }
                });
              });

              fetch.once("error", (err) => {
                console.error("❌ [IMAP] Fetch error:", err);
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
          console.error("❌ [IMAP] Connection error:", err);
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
          console.log(`✅ [IMAP] Thread metadata fetch completed: ${processedThreads.length} threads, ${newCount} new`);
          resolve({
            success: true,
            threads: processedThreads,
            totalCount: processedThreads.length,
            newCount,
            syncStatus: "completed",
          });
        });

        imap.connect();
      } catch (error: any) {
        console.error("❌ [IMAP] Error setting up connection:", error);
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
   * Get IMAP threads for an account with filtering
   */
  static async getThreads(
    accountId: string,
    options: {
      folder?: string;
      limit?: number;
      offset?: number;
      unreadOnly?: boolean;
    } = {}
  ): Promise<IIMAPThread[]> {
    const filter: any = { accountId };

    if (options.folder) {
      filter.folder = options.folder;
    }

    if (options.unreadOnly) {
      filter.unreadCount = { $gt: 0 };
    }

    return IMAPThreadModel.find(filter)
      .sort({ lastActivity: -1 })
      .limit(options.limit || 20)
      .skip(options.offset || 0)
      .lean();
  }

  /**
   * Create thread metadata from a parsed email
   */
  private static async createThreadMetadataFromEmail(
    parsed: any,
    account: IEmailAccount
  ): Promise<Partial<IIMAPThread> | null> {
    try {
      const subject = parsed.subject || "No Subject";
      const normalizedSubject = this.normalizeSubject(subject);
      const threadId = `thread_${normalizedSubject.replace(/[^a-zA-Z0-9]/g, "_").toLowerCase()}_${Date.now()}`;

      const participants = [
        {
          email: parsed.from?.text || parsed.from?.value?.[0]?.address || "",
          name: parsed.from?.value?.[0]?.name,
        },
        ...(parsed.to?.value || []).map((to: any) => ({ email: to.address, name: to.name })),
      ].filter((p) => p.email);

      return {
        threadId,
        accountId: account._id,

        // Store raw IMAP data
        rawIMAPData: {
          threadId,
          messages: [
            {
              messageId: parsed.messageId || `${Date.now()}`,
              subject,
              from: parsed.from,
              to: parsed.to?.value || [],
              cc: parsed.cc?.value || [],
              date: parsed.date?.toISOString() || new Date().toISOString(),
              headers: parsed.headers || {},
              bodyPreview: parsed.text?.substring(0, 200) || parsed.html?.substring(0, 200) || "",
              hasAttachments: !!(parsed.attachments && parsed.attachments.length > 0),
              flags: [], // Will be populated from IMAP flags
            },
          ],
        },

        // Computed metadata
        subject,
        normalizedSubject,
        participants,
        messageCount: 1, // Will be updated when more emails in thread are found
        unreadCount: 0,
        isStarred: false,
        hasAttachments: !!(parsed.attachments && parsed.attachments.length > 0),
        firstMessageAt: parsed.date || new Date(),
        lastMessageAt: parsed.date || new Date(),
        lastActivity: parsed.date || new Date(),
        status: "active",
        folder: "INBOX",
        category: this.determineCategory(subject, parsed.from?.text || ""),
        threadType: "conversation",
        isPinned: false,
        totalSize: (parsed.text?.length || 0) + (parsed.html?.length || 0),

        // Latest email metadata
        latestEmailFrom: {
          email: parsed.from?.text || parsed.from?.value?.[0]?.address || "",
          name: parsed.from?.value?.[0]?.name,
        },
        latestEmailTo: (parsed.to?.value || []).map((to: any) => ({ email: to.address, name: to.name })),
        latestEmailPreview: parsed.text?.substring(0, 200) || parsed.html?.substring(0, 200) || "",
      };
    } catch (error) {
      console.error("❌ [IMAP] Error creating thread metadata from email:", error);
      return null;
    }
  }

  // Helper methods
  private static normalizeSubject(subject: string): string {
    return subject
      .replace(/^(Re:|Fwd?:|RE:|FWD?:|FW:|fw:)\s*/gi, "") // Remove Re:/Fwd: prefixes
      .replace(/^\[.*?\]\s*/g, "") // Remove [tag] prefixes
      .trim()
      .toLowerCase();
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
