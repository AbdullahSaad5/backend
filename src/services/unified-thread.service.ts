import { IEmailAccount } from "@/models/email-account.model";
import { GmailSyncService } from "@/services/sync/gmail-sync.service";
import { OutlookSyncService } from "@/services/sync/outlook-sync.service";
import { IMAPSyncService } from "@/services/sync/imap-sync.service";

export interface UnifiedThread {
  id: string;
  threadId: string;
  accountId: string;
  provider: "gmail" | "outlook" | "imap";
  subject: string;
  normalizedSubject: string;
  participants: Array<{
    email: string;
    name?: string;
  }>;
  messageCount: number;
  unreadCount: number;
  isStarred: boolean;
  hasAttachments: boolean;
  firstMessageAt: Date;
  lastMessageAt: Date;
  lastActivity: Date;
  status: "active" | "archived" | "spam";
  folder: string;
  category: string;
  threadType: "conversation" | "notification" | "marketing" | "system";
  isPinned: boolean;
  totalSize: number;
  latestEmailFrom: {
    email: string;
    name?: string;
  };
  latestEmailTo: Array<{
    email: string;
    name?: string;
  }>;
  latestEmailPreview: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface UnifiedSyncResult {
  success: boolean;
  threads: UnifiedThread[];
  totalCount: number;
  newCount: number;
  error?: string;
  syncStatus?: string;
  provider: string;
}

export class UnifiedThreadService {
  /**
   * Sync threads for any provider
   */
  static async syncThreads(
    account: IEmailAccount,
    options: {
      folder?: string;
      limit?: number;
      since?: Date;
      fetchAll?: boolean;
    } = {}
  ): Promise<UnifiedSyncResult> {
    try {
      let result: any;
      let provider: string;

      // Route to appropriate sync service based on account type
      switch (account.accountType) {
        case "gmail":
          if (account.oauth) {
            console.log(`🔄 [Unified] Using Gmail sync service for: ${account.emailAddress}`);
            result = await GmailSyncService.syncThreads(account, options);
            provider = "gmail";
          } else {
            console.log(`🔄 [Unified] Using IMAP sync service for Gmail: ${account.emailAddress}`);
            result = await IMAPSyncService.syncThreads(account, options);
            provider = "imap";
          }
          break;

        case "outlook":
          if (account.oauth) {
            console.log(`🔄 [Unified] Using Outlook sync service for: ${account.emailAddress}`);
            result = await OutlookSyncService.syncThreads(account, options);
            provider = "outlook";
          } else {
            console.log(`🔄 [Unified] Using IMAP sync service for Outlook: ${account.emailAddress}`);
            result = await IMAPSyncService.syncThreads(account, options);
            provider = "imap";
          }
          break;

        case "imap":
        case "exchange":
        case "custom":
        default:
          console.log(`🔄 [Unified] Using IMAP sync service for: ${account.emailAddress}`);
          result = await IMAPSyncService.syncThreads(account, options);
          provider = "imap";
          break;
      }

      // Convert provider-specific threads to unified format
      const unifiedThreads = this.convertToUnifiedFormat(result.threads, provider as any);

      return {
        success: result.success,
        threads: unifiedThreads,
        totalCount: result.totalCount,
        newCount: result.newCount,
        error: result.error,
        syncStatus: result.syncStatus,
        provider,
      };
    } catch (error: any) {
      console.error("❌ [Unified] Error in thread sync:", error);
      return {
        success: false,
        threads: [],
        totalCount: 0,
        newCount: 0,
        error: error.message,
        syncStatus: "failed",
        provider: "unknown",
      };
    }
  }

  /**
   * Get threads for any provider with unified interface
   */
  static async getThreads(
    account: IEmailAccount,
    options: {
      folder?: string;
      limit?: number;
      offset?: number;
      unreadOnly?: boolean;
    } = {}
  ): Promise<UnifiedThread[]> {
    try {
      let threads: any[] = [];
      let provider: string;

      // Route to appropriate service based on account type
      switch (account.accountType) {
        case "gmail":
          if (account.oauth) {
            threads = await GmailSyncService.getThreads(account._id?.toString() || "", options);
            provider = "gmail";
          } else {
            threads = await IMAPSyncService.getThreads(account._id?.toString() || "", options);
            provider = "imap";
          }
          break;

        case "outlook":
          if (account.oauth) {
            threads = await OutlookSyncService.getThreads(account._id?.toString() || "", options);
            provider = "outlook";
          } else {
            threads = await IMAPSyncService.getThreads(account._id?.toString() || "", options);
            provider = "imap";
          }
          break;

        case "imap":
        case "exchange":
        case "custom":
        default:
          threads = await IMAPSyncService.getThreads(account._id?.toString() || "", options);
          provider = "imap";
          break;
      }

      // Convert to unified format
      return this.convertToUnifiedFormat(threads, provider as any);
    } catch (error: any) {
      console.error("❌ [Unified] Error getting threads:", error);
      return [];
    }
  }

  /**
   * Convert provider-specific threads to unified format
   */
  private static convertToUnifiedFormat(threads: any[], provider: "gmail" | "outlook" | "imap"): UnifiedThread[] {
    return threads.map((thread) => {
      let threadId: string;

      // Handle different thread ID fields
      switch (provider) {
        case "gmail":
          threadId = thread.threadId;
          break;
        case "outlook":
          threadId = thread.conversationId;
          break;
        case "imap":
          threadId = thread.threadId;
          break;
        default:
          threadId = thread.threadId || thread.conversationId || thread._id?.toString();
      }

      return {
        id: thread._id?.toString() || thread.id,
        threadId,
        accountId: thread.accountId?.toString(),
        provider,
        subject: thread.subject || "No Subject",
        normalizedSubject: thread.normalizedSubject || "",
        participants: thread.participants || [],
        messageCount: thread.messageCount || 0,
        unreadCount: thread.unreadCount || 0,
        isStarred: thread.isStarred || false,
        hasAttachments: thread.hasAttachments || false,
        firstMessageAt: thread.firstMessageAt || new Date(),
        lastMessageAt: thread.lastMessageAt || new Date(),
        lastActivity: thread.lastActivity || new Date(),
        status: thread.status || "active",
        folder: thread.folder || "INBOX",
        category: thread.category || "primary",
        threadType: thread.threadType || "conversation",
        isPinned: thread.isPinned || false,
        totalSize: thread.totalSize || 0,
        latestEmailFrom: thread.latestEmailFrom || { email: "", name: "" },
        latestEmailTo: thread.latestEmailTo || [],
        latestEmailPreview: thread.latestEmailPreview || "",
        createdAt: thread.createdAt || new Date(),
        updatedAt: thread.updatedAt || new Date(),
      };
    });
  }

  /**
   * Get thread count for an account
   */
  static async getThreadCount(
    account: IEmailAccount,
    options: {
      folder?: string;
      unreadOnly?: boolean;
    } = {}
  ): Promise<number> {
    try {
      const threads = await this.getThreads(account, { ...options, limit: 1 });
      // This is a simplified count - in production, you'd want to optimize this
      // by adding count methods to each sync service
      return threads.length;
    } catch (error: any) {
      console.error("❌ [Unified] Error getting thread count:", error);
      return 0;
    }
  }
}
