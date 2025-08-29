import { IEmailAccount } from "@/models/email-account.model";
import { OutlookThreadModel, IOutlookThread } from "@/models/outlook-thread.model";

export interface OutlookSyncOptions {
  folder?: string;
  limit?: number;
  since?: Date;
  fetchAll?: boolean;
}

export interface OutlookSyncResult {
  success: boolean;
  threads: IOutlookThread[];
  totalCount: number;
  newCount: number;
  error?: string;
  syncStatus?: string;
}

export class OutlookSyncService {
  /**
   * Fetch and save Outlook thread metadata directly without parsing
   */
  static async syncThreads(account: IEmailAccount, options: OutlookSyncOptions = {}): Promise<OutlookSyncResult> {
    try {
      console.log("🔄 [Outlook] Fetching raw thread metadata for:", account.emailAddress);

      if (!account.oauth?.accessToken) {
        throw new Error("No OAuth access token available for Outlook");
      }

      // Import Microsoft Graph client
      const { Client } = await import("@microsoft/microsoft-graph-client");

      // Decrypt access token
      const { EmailOAuthService } = await import("@/services/emailOAuth.service");
      const decryptedAccessToken = EmailOAuthService.decryptData(account.oauth.accessToken);

      // Create Microsoft Graph client
      const graphClient = Client.init({
        authProvider: (done) => {
          done(null, decryptedAccessToken);
        },
      });

      // Fetch messages from Microsoft Graph and group by conversationId
      const messagesResponse = await graphClient
        .api("/me/messages")
        .top(options.limit || 100)
        .orderby("receivedDateTime desc")
        .select(
          "id,conversationId,subject,from,toRecipients,ccRecipients,receivedDateTime,isRead,bodyPreview,hasAttachments,importance,flag"
        )
        .get();

      const messages = messagesResponse.value || [];
      console.log(`📧 [Outlook] Found ${messages.length} messages`);

      // Group messages by conversationId to create threads
      const conversationMap = new Map<string, any[]>();
      for (const message of messages) {
        const convId = message.conversationId;
        if (!convId) continue;

        if (!conversationMap.has(convId)) {
          conversationMap.set(convId, []);
        }
        conversationMap.get(convId)!.push(message);
      }

      console.log(`📧 [Outlook] Grouped into ${conversationMap.size} conversations (threads)`);

      const processedThreads: IOutlookThread[] = [];
      let newCount = 0;

      // Process each conversation - save raw data directly
      for (const [conversationId, conversationMessages] of conversationMap.entries()) {
        if (conversationMessages.length === 0) continue;

        try {
          // Sort messages by date
          conversationMessages.sort(
            (a, b) => new Date(a.receivedDateTime).getTime() - new Date(b.receivedDateTime).getTime()
          );

          const firstMessage = conversationMessages[0];
          const lastMessage = conversationMessages[conversationMessages.length - 1];

          // Extract basic metadata
          const subject = firstMessage.subject || "No Subject";
          const normalizedSubject = this.normalizeSubject(subject);
          const participants = this.extractParticipants(conversationMessages);

          // Create Outlook thread data
          const outlookThreadData: Partial<IOutlookThread> = {
            conversationId,
            accountId: account._id,

            // Store raw Outlook data
            rawOutlookData: {
              conversationId,
              messages: conversationMessages.map((msg) => ({
                id: msg.id,
                conversationId: msg.conversationId,
                subject: msg.subject || "",
                from: msg.from,
                toRecipients: msg.toRecipients || [],
                ccRecipients: msg.ccRecipients || [],
                receivedDateTime: msg.receivedDateTime,
                isRead: msg.isRead || false,
                bodyPreview: msg.bodyPreview || "",
                hasAttachments: msg.hasAttachments || false,
                importance: msg.importance || "normal",
                flag: msg.flag,
              })),
            },

            // Computed metadata for quick access
            subject,
            normalizedSubject,
            participants,
            messageCount: conversationMessages.length,
            unreadCount: conversationMessages.filter((m) => !m.isRead).length,
            isStarred: conversationMessages.some((m) => m.flag?.flagStatus === "flagged"),
            hasAttachments: conversationMessages.some((m) => m.hasAttachments),
            firstMessageAt: new Date(firstMessage.receivedDateTime),
            lastMessageAt: new Date(lastMessage.receivedDateTime),
            lastActivity: new Date(lastMessage.receivedDateTime),
            status: "active",
            folder: options.folder || "INBOX",
            category: "primary",
            threadType: "conversation",
            isPinned: false,
            totalSize: 0, // Will be calculated if needed

            // Latest email metadata
            latestEmailFrom: {
              email: lastMessage.from?.emailAddress?.address || "",
              name: lastMessage.from?.emailAddress?.name || "",
            },
            latestEmailTo: (lastMessage.toRecipients || []).map((recipient: any) => ({
              email: recipient.emailAddress?.address || "",
              name: recipient.emailAddress?.name || "",
            })),
            latestEmailPreview: lastMessage.bodyPreview || "",
          };

          // Save or update thread metadata
          const existingThread = await OutlookThreadModel.findOne({
            conversationId,
            accountId: account._id,
          });

          let savedThread: IOutlookThread;
          if (existingThread) {
            // Update existing thread with raw data
            Object.assign(existingThread, outlookThreadData);
            savedThread = await existingThread.save();
          } else {
            // Create new thread with raw data
            savedThread = await OutlookThreadModel.create(outlookThreadData);
            newCount++;
          }

          processedThreads.push(savedThread);
        } catch (threadError) {
          console.error("❌ [Outlook] Error processing conversation:", conversationId, threadError);
          // Continue with other conversations
        }
      }

      console.log(`✅ [Outlook] Processed ${processedThreads.length} threads, ${newCount} new (raw data)`);

      return {
        success: true,
        threads: processedThreads,
        totalCount: processedThreads.length,
        newCount,
        syncStatus: "completed",
      };
    } catch (error: any) {
      console.error("❌ [Outlook] Error fetching thread metadata:", error);
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
   * Get Outlook threads for an account with filtering
   */
  static async getThreads(
    accountId: string,
    options: {
      folder?: string;
      limit?: number;
      offset?: number;
      unreadOnly?: boolean;
    } = {}
  ): Promise<IOutlookThread[]> {
    const filter: any = { accountId };

    if (options.folder) {
      filter.folder = options.folder;
    }

    if (options.unreadOnly) {
      filter.unreadCount = { $gt: 0 };
    }

    return OutlookThreadModel.find(filter)
      .sort({ lastActivity: -1 })
      .limit(options.limit || 20)
      .skip(options.offset || 0)
      .lean();
  }

  // Helper methods
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
      // Extract from
      if (message.from?.emailAddress) {
        const email = message.from.emailAddress.address;
        const name = message.from.emailAddress.name;
        if (email) {
          participants.set(email, { email, name });
        }
      }

      // Extract to recipients
      (message.toRecipients || []).forEach((recipient: any) => {
        if (recipient.emailAddress?.address) {
          const email = recipient.emailAddress.address;
          const name = recipient.emailAddress.name;
          participants.set(email, { email, name });
        }
      });

      // Extract cc recipients
      (message.ccRecipients || []).forEach((recipient: any) => {
        if (recipient.emailAddress?.address) {
          const email = recipient.emailAddress.address;
          const name = recipient.emailAddress.name;
          participants.set(email, { email, name });
        }
      });
    });

    return Array.from(participants.values());
  }
}
