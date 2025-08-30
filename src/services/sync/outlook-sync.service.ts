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

      // Create Microsoft Graph client with proper authentication
      const graphClient = Client.init({
        authProvider: (done) => {
          // Microsoft Graph accepts opaque access tokens (not JWT format)
          // This is normal behavior for Microsoft Graph API
          done(null, decryptedAccessToken);
        },
      });

      // Fetch messages from Microsoft Graph and group by conversationId
      const messagesResponse = await graphClient
        .api("/me/messages")
        .top(options.limit || 500) // Increased limit to get more messages for better grouping
        .orderby("receivedDateTime desc")
        .select(
          "id,conversationId,subject,from,toRecipients,ccRecipients,receivedDateTime,isRead,bodyPreview,hasAttachments,importance,flag"
        )
        .get();

      const messages = messagesResponse.value || [];
      console.log(`📧 [Outlook] Found ${messages.length} messages`);

      // Debug: Check conversationId values
      const conversationIds = [...new Set(messages.map((m) => m.conversationId).filter(Boolean))];
      console.log(`📧 [Outlook] Unique conversationIds found: ${conversationIds.length}`);
      console.log(`📧 [Outlook] Sample conversationIds:`, conversationIds.slice(0, 5));

      // Group messages by conversationId to create threads
      const conversationMap = new Map<string, any[]>();
      const subjectMap = new Map<string, string[]>(); // Track subjects per conversation

      for (const message of messages) {
        const convId = message.conversationId;
        if (!convId) {
          console.log(`⚠️ [Outlook] Message ${message.id} has no conversationId, skipping`);
          continue;
        }

        if (!conversationMap.has(convId)) {
          conversationMap.set(convId, []);
          subjectMap.set(convId, []);
        }
        conversationMap.get(convId)!.push(message);

        // Track subjects for debugging
        const subject = message.subject || "No Subject";
        if (!subjectMap.get(convId)!.includes(subject)) {
          subjectMap.get(convId)!.push(subject);
        }
      }

      console.log(`📧 [Outlook] Grouped into ${conversationMap.size} conversations (threads)`);

      // Debug: Log conversation grouping details
      conversationMap.forEach((messages, conversationId) => {
        const subjects = subjectMap.get(conversationId) || [];
        console.log(
          `📧 [Outlook] Conversation ${conversationId}: ${messages.length} messages, Subjects: [${subjects.join(", ")}]`
        );
      });

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
            accountId: account._id?.toString() || account._id,

            // Store only essential metadata, not full message content
            rawOutlookData: {
              conversationId,
              messageIds: conversationMessages.map((msg) => msg.id), // Only store message IDs
              messageCount: conversationMessages.length,
              lastMessageId: lastMessage.id,
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
          console.log(
            `💾 [Outlook] Saving thread for conversationId: ${conversationId}, messageCount: ${conversationMessages.length}`
          );

          const existingThread = await OutlookThreadModel.findOne({
            conversationId,
            accountId: account._id?.toString() || account._id,
          });

          let savedThread: IOutlookThread;
          if (existingThread) {
            console.log(`🔄 [Outlook] Updating existing thread for conversationId: ${conversationId}`);
            // Update existing thread with raw data
            Object.assign(existingThread, outlookThreadData);
            savedThread = await existingThread.save();
          } else {
            console.log(`🆕 [Outlook] Creating new thread for conversationId: ${conversationId}`);
            // Create new thread with raw data
            savedThread = await OutlookThreadModel.create(outlookThreadData);
            newCount++;
          }

          console.log(`✅ [Outlook] Saved thread: ${savedThread._id}, messageCount: ${savedThread.messageCount}`);
          processedThreads.push(savedThread);
        } catch (threadError) {
          console.error("❌ [Outlook] Error processing conversation:", conversationId, threadError);
          // Continue with other conversations
        }
      }

      console.log(`✅ [Outlook] Processed ${processedThreads.length} threads, ${newCount} new (raw data)`);

      // Final summary
      const threadCounts = processedThreads.map((t) => t.messageCount);
      console.log(`📊 [Outlook] Thread message counts:`, threadCounts);
      console.log(
        `📊 [Outlook] Average messages per thread: ${threadCounts.reduce((a, b) => a + b, 0) / threadCounts.length || 0}`
      );

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
    const filter: any = { accountId: accountId.toString() };

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

  /**
   * Fetch emails on-demand when user opens a thread
   * Returns actual email content from Microsoft Graph API without storing in database
   */
  static async getThreadEmails(
    account: IEmailAccount,
    conversationId: string
  ): Promise<{
    success: boolean;
    emails?: any[];
    error?: string;
  }> {
    try {
      console.log(`🔍 [Outlook] Fetching emails on-demand for conversation: ${conversationId}`);

      if (!account.oauth?.accessToken) {
        throw new Error("No OAuth access token available for Outlook");
      }

      // Import Microsoft Graph client
      const { Client } = await import("@microsoft/microsoft-graph-client");

      // Decrypt access token
      const { EmailOAuthService } = await import("@/services/emailOAuth.service");
      const decryptedAccessToken = EmailOAuthService.decryptData(account.oauth.accessToken);

      // Create Microsoft Graph client with proper authentication
      const graphClient = Client.init({
        authProvider: (done) => {
          // Microsoft Graph accepts opaque access tokens (not JWT format)
          // This is normal behavior for Microsoft Graph API
          done(null, decryptedAccessToken);
        },
      });

      // Fetch all messages in the conversation
      console.log(`🔍 [Outlook] Fetching messages for conversationId: ${conversationId}`);

      // Try a more targeted approach to avoid complex filter issues
      // Use a simpler filter without complex ordering
      let messages: any[] = [];

      try {
        // First attempt: Try with a simple filter
        const messagesResponse = await graphClient
          .api("/me/messages")
          .filter(`conversationId eq '${conversationId}'`)
          .select(
            "id,conversationId,subject,from,toRecipients,ccRecipients,bccRecipients,receivedDateTime,sentDateTime,isRead,body,bodyPreview,hasAttachments,importance,flag"
          )
          .get();

        messages = messagesResponse.value || [];
        console.log(`📧 [Outlook] Found ${messages.length} messages using simple filter`);
      } catch (filterError: any) {
        console.log(`⚠️ [Outlook] Simple filter failed, trying alternative approach:`, filterError.message);

        // Fallback: Get recent messages and filter client-side
        const messagesResponse = await graphClient
          .api("/me/messages")
          .top(500) // Get recent messages
          .orderby("receivedDateTime desc")
          .select(
            "id,conversationId,subject,from,toRecipients,ccRecipients,bccRecipients,receivedDateTime,sentDateTime,isRead,body,bodyPreview,hasAttachments,importance,flag"
          )
          .get();

        const allMessages = messagesResponse.value || [];
        messages = allMessages.filter((message: any) => message.conversationId === conversationId);
        console.log(`📧 [Outlook] Found ${messages.length} messages using fallback approach`);
      }

      console.log(`📧 [Outlook] Found ${messages.length} messages for conversation ${conversationId}`);

      if (messages.length === 0) {
        console.log(`⚠️ [Outlook] No messages found for conversationId: ${conversationId}`);
        return {
          success: false,
          error: "No messages found in conversation",
        };
      }

      // Transform Microsoft Graph messages to our format
      const emails = messages.map((message) => {
        const fromHeader = message.from?.emailAddress;
        const toRecipients = message.toRecipients || [];
        const ccRecipients = message.ccRecipients || [];
        const bccRecipients = message.bccRecipients || [];

        // Extract text and HTML content
        let textContent = "";
        let htmlContent = "";

        if (message.body) {
          if (message.body.contentType === "text") {
            textContent = message.body.content || "";
          } else if (message.body.contentType === "html") {
            htmlContent = message.body.content || "";
          }
        }

        // Fallback to bodyPreview if no content found
        if (!textContent && !htmlContent && message.bodyPreview) {
          textContent = message.bodyPreview;
        }

        return {
          _id: message.id,
          messageId: message.id,
          threadId: conversationId,
          direction: fromHeader?.address === account.emailAddress ? "outbound" : "inbound",
          subject: message.subject || "No Subject",
          textContent: textContent || message.bodyPreview || "",
          htmlContent: htmlContent,
          from: {
            email: fromHeader?.address || "",
            name: fromHeader?.name || "",
          },
          to: toRecipients.map((recipient: any) => ({
            email: recipient.emailAddress?.address || "",
            name: recipient.emailAddress?.name || "",
          })),
          cc: ccRecipients.map((recipient: any) => ({
            email: recipient.emailAddress?.address || "",
            name: recipient.emailAddress?.name || "",
          })),
          bcc: bccRecipients.map((recipient: any) => ({
            email: recipient.emailAddress?.address || "",
            name: recipient.emailAddress?.name || "",
          })),
          receivedAt: new Date(message.receivedDateTime),
          sentAt: message.sentDateTime ? new Date(message.sentDateTime) : new Date(message.receivedDateTime),
          isRead: message.isRead || false,
          isReplied: false,
          isForwarded: false,
          isArchived: false,
          isSpam: false,
          attachments: message.hasAttachments ? [] : [], // Will be populated if needed
        };
      });

      console.log(`✅ [Outlook] Fetched ${emails.length} emails on-demand for conversation: ${conversationId}`);

      // Sort emails chronologically (oldest first)
      const sortedEmails = emails.sort((a, b) => new Date(a.receivedAt).getTime() - new Date(b.receivedAt).getTime());

      return {
        success: true,
        emails: sortedEmails,
      };
    } catch (error: any) {
      console.error("❌ [Outlook] Error fetching emails on-demand:", error);

      // Provide more specific error messages for common issues
      let errorMessage = error.message;
      if (error.code === "InefficientFilter") {
        errorMessage = "The email filter is too complex. Please try again or contact support.";
      } else if (error.statusCode === 401) {
        errorMessage = "Authentication failed. Please reconnect your Outlook account.";
      } else if (error.statusCode === 403) {
        errorMessage = "Access denied. Please check your Outlook account permissions.";
      } else if (error.statusCode === 429) {
        errorMessage = "Rate limit exceeded. Please try again in a few minutes.";
      }

      return {
        success: false,
        error: errorMessage,
      };
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
