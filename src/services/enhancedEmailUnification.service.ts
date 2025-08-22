// Enhanced Email Unification System
// Extends existing emailUnificationService with advanced features

interface EmailAddress {
  email: string;
  name?: string;
}

interface ThreadData {
  syncStatus?: any;
  messages?: any[];
  messageCount?: number;
}

type ProviderType = "gmail" | "outlook";

class EnhancedEmailUnificationServiceExtended {
  // ADVANCED THREAD MANAGEMENT METHODS

  // Smart conversation grouping across providers
  static generateUnifiedConversationId(email: any, provider: ProviderType) {
    if (provider === "gmail") {
      return email.threadId;
    }
    if (provider === "outlook") {
      return email.conversationId;
    }

    // Fallback: generate from message references
    return this.generateConversationIdFromReferences(email);
  }

  // Generate conversation ID from RFC 2822 message references
  static generateConversationIdFromReferences(email: any) {
    const references = email.references || [];
    const inReplyTo = email.inReplyTo;

    if (inReplyTo) {
      return `conv_${this.hashString(inReplyTo)}`;
    }

    if (references.length > 0) {
      return `conv_${this.hashString(references[0])}`;
    }

    // No threading info - use subject hash
    return `conv_${this.hashString(email.subject || email.messageId)}`;
  }

  // ENHANCED CATEGORY SYSTEM

  // Universal category mapping for all providers
  static mapToUniversalCategory(providerCategory: string, provider: ProviderType) {
    const categoryMap: Record<ProviderType, Record<string, string | ((label: string) => string)>> = {
      gmail: {
        INBOX: "INBOX",
        SENT: "SENT",
        DRAFT: "DRAFT",
        TRASH: "TRASH",
        SPAM: "SPAM",
        IMPORTANT: "IMPORTANT",
        STARRED: "STARRED",
        ARCHIVE: "ARCHIVE",
        // Custom labels get prefixed
        default: (label: string) => `CUSTOM:${label}`,
      },
      outlook: {
        inbox: "INBOX",
        sentitems: "SENT",
        drafts: "DRAFT",
        deleteditems: "TRASH",
        junkemail: "SPAM",
        archive: "ARCHIVE",
        // Custom folders get prefixed
        default: (folder: string) => `CUSTOM:${folder}`,
      },
    };

    const providerMap = categoryMap[provider];
    if (!providerMap) return "OTHER";

    const normalizedCategory = providerCategory?.toLowerCase();

    // Check exact matches first
    for (const [key, value] of Object.entries(providerMap)) {
      if (key !== "default" && key.toLowerCase() === normalizedCategory) {
        return value as string;
      }
    }

    // Use default mapping for custom categories
    if (providerMap.default) {
      return (providerMap.default as (label: string) => string)(providerCategory);
    }

    return "OTHER";
  }

  // Enhanced category determination with provider-specific logic
  static determineEnhancedCategory(email: any, provider: ProviderType, folderContext: string | null) {
    if (provider === "gmail") {
      const labels = email.labelIds || [];

      // Map Gmail labels to universal categories
      if (labels.includes("INBOX")) return "INBOX";
      if (labels.includes("SENT")) return "SENT";
      if (labels.includes("DRAFT")) return "DRAFT";
      if (labels.includes("TRASH")) return "TRASH";
      if (labels.includes("SPAM")) return "SPAM";
      if (labels.includes("IMPORTANT")) return "IMPORTANT";
      if (labels.includes("STARRED")) return "STARRED";
      if (labels.includes("CATEGORY_PERSONAL")) return "PERSONAL";
      if (labels.includes("CATEGORY_SOCIAL")) return "SOCIAL";
      if (labels.includes("CATEGORY_PROMOTIONS")) return "PROMOTIONS";
      if (labels.includes("CATEGORY_UPDATES")) return "UPDATES";
      if (labels.includes("CATEGORY_FORUMS")) return "FORUMS";

      // Custom labels
      const customLabels = labels.filter(
        (label: string) =>
          !["INBOX", "SENT", "DRAFT", "TRASH", "SPAM", "IMPORTANT", "STARRED"].includes(label) &&
          !label.startsWith("CATEGORY_")
      );

      if (customLabels.length > 0) {
        return `CUSTOM:${customLabels[0]}`;
      }

      return "OTHER";
    }

    if (provider === "outlook") {
      if (folderContext) {
        return this.mapToUniversalCategory(folderContext, "outlook");
      }

      if (email.isDraft) return "DRAFT";
      if (email.parentFolderId === "SentItems") return "SENT";
      if (email.parentFolderId === "DeletedItems") return "TRASH";
      if (email.parentFolderId === "JunkEmail") return "SPAM";
      if (email.parentFolderId === "Archive") return "ARCHIVE";

      return "INBOX";
    }

    return "OTHER";
  }

  // ENHANCED SYNC STATUS TRACKING

  // Track sync state with conflict resolution
  static trackSyncState(email: any, provider: ProviderType, existingEmail: any = null) {
    const syncState = {
      lastSynced: new Date().toISOString(),
      provider: provider,
      version: this.extractVersion(email, provider),
      etag: this.extractETag(email, provider),
      changeKey: this.extractChangeKey(email, provider),
      syncMethod: "incremental",
      conflicts: [],
    };

    // Conflict detection and resolution
    if (existingEmail) {
      const conflict = this.detectConflict(email, existingEmail, provider);
      if (conflict) {
        syncState.conflicts.push(conflict as never);
        syncState.syncMethod = "conflict_resolution";
      }
    }

    return syncState;
  }

  static extractVersion(email: any, provider: ProviderType): string {
    if (provider === "gmail") {
      return email.internalDate || email.historyId || "unknown";
    }
    if (provider === "outlook") {
      return email.changeKey || email.id || "unknown";
    }
    return "unknown";
  }

  static extractETag(email: any, provider: ProviderType): string {
    if (provider === "gmail") {
      return email.etag || "unknown";
    }
    if (provider === "outlook") {
      return email.etag || "unknown";
    }
    return "unknown";
  }

  static extractChangeKey(email: any, provider: ProviderType): string {
    if (provider === "outlook") {
      return email.changeKey || "unknown";
    }
    return "unknown";
  }

  // Detect conflicts between email versions
  static detectConflict(newEmail: any, existingEmail: any, provider: ProviderType) {
    const conflicts: any[] = [];

    // Check for content conflicts
    if (newEmail.subject !== existingEmail.subject) {
      conflicts.push({
        field: "subject",
        oldValue: existingEmail.subject,
        newValue: newEmail.subject,
        resolution: "newer_wins",
      });
    }

    // Check for status conflicts
    if (newEmail.isRead !== existingEmail.isRead) {
      conflicts.push({
        field: "isRead",
        oldValue: existingEmail.isRead,
        newValue: newEmail.isRead,
        resolution: "newer_wins",
      });
    }

    // Check for label conflicts
    const oldLabels = new Set(existingEmail.labels || []);
    const newLabels = new Set(newEmail.labels || []);

    if (!this.arraysEqual(Array.from(oldLabels), Array.from(newLabels))) {
      conflicts.push({
        field: "labels",
        oldValue: Array.from(oldLabels),
        newValue: Array.from(newLabels),
        resolution: "merge",
      });
    }

    return conflicts.length > 0 ? conflicts : null;
  }

  // DIRECT EMAIL OPERATIONS ENHANCEMENT

  // Enhanced draft creation with thread context
  static createEnhancedDraftEmail(emailData: any, provider: ProviderType, threadContext: any = null) {
    const draft = {
      subject: emailData.subject || "",
      body: emailData.body || "",
      to: emailData.to || [],
      cc: emailData.cc || [],
      bcc: emailData.bcc || [],
      attachments: emailData.attachments || [],
      threadId: emailData.threadId || threadContext?.threadId || null,
      isDraft: true,
      inReplyTo: emailData.inReplyTo || null,
      references: emailData.references || [],
    };

    if (provider === "gmail") {
      return {
        message: {
          threadId: draft.threadId,
          payload: {
            headers: [
              { name: "To", value: this.formatEmailAddresses(draft.to) },
              { name: "Cc", value: this.formatEmailAddresses(draft.cc) },
              { name: "Bcc", value: this.formatEmailAddresses(draft.bcc) },
              { name: "Subject", value: draft.subject },
              ...(draft.inReplyTo ? [{ name: "In-Reply-To", value: draft.inReplyTo }] : []),
              ...(draft.references.length > 0 ? [{ name: "References", value: draft.references.join(" ") }] : []),
            ],
            body: {
              data: Buffer.from(draft.body).toString("base64"),
            },
          },
        },
      };
    }

    if (provider === "outlook") {
      return {
        subject: draft.subject,
        body: {
          contentType: "HTML",
          content: draft.body,
        },
        toRecipients: draft.to.map((addr: EmailAddress) => ({
          emailAddress: { address: addr.email, name: addr.name },
        })),
        ccRecipients: draft.cc.map((addr: EmailAddress) => ({
          emailAddress: { address: addr.email, name: addr.name },
        })),
        bccRecipients: draft.bcc.map((addr: EmailAddress) => ({
          emailAddress: { address: addr.email, name: addr.name },
        })),
        ...(draft.inReplyTo && { inReplyTo: draft.inReplyTo }),
        ...(draft.references.length > 0 && { references: draft.references }),
      };
    }
  }

  static formatEmailAddresses(addresses: EmailAddress[]): string {
    return addresses.map((addr) => (addr.name ? `${addr.name} <${addr.email}>` : addr.email)).join(", ");
  }

  // Enhanced reply creation with proper threading
  static createReplyEmail(originalEmail: any, replyData: any, provider: ProviderType) {
    const reply = {
      subject: this.generateReplySubject(originalEmail.subject),
      body: replyData.body || "",
      to: replyData.to || this.extractReplyRecipients(originalEmail),
      cc: replyData.cc || [],
      bcc: replyData.bcc || [],
      attachments: replyData.attachments || [],
      threadId: originalEmail.threadId,
      inReplyTo: originalEmail.messageId,
      references: this.buildReferencesChain(originalEmail),
    };

    return this.createEnhancedDraftEmail(reply, provider, { threadId: originalEmail.threadId });
  }

  // Generate proper reply subject
  static generateReplySubject(originalSubject: string) {
    if (originalSubject.startsWith("Re:")) {
      return originalSubject;
    }
    return `Re: ${originalSubject}`;
  }

  // Build references chain for proper threading
  static buildReferencesChain(email: any) {
    const references = email.references || [];
    if (email.messageId) {
      return [...references, email.messageId];
    }
    return references;
  }

  // Extract reply recipients (exclude sender from recipients)
  static extractReplyRecipients(email: any): EmailAddress[] {
    const allRecipients = [...(email.to || []), ...(email.cc || [])];

    // Remove the sender from recipients
    return allRecipients.filter((recipient) => recipient.email !== email.from?.email);
  }

  // Utility methods for enhanced functionality

  static hashString(str: string) {
    let hash = 0;
    if (str.length === 0) return hash.toString();
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash).toString(36);
  }

  static arraysEqual(a: any[], b: any[]) {
    if (a.length !== b.length) return false;
    return a.every((val, index) => val === b[index]);
  }

  // Enhanced thread unification with advanced features
  static unifyEnhancedThread(rawThread: any, provider: ProviderType, emails: any = null) {
    const baseThread = this.unifyThread(rawThread, provider, emails);

    return {
      ...baseThread,
      // Enhanced threading metadata
      conversationMetadata: {
        isGroupConversation: this.isGroupConversation(rawThread, provider),
        participantCount: this.getParticipantCount(rawThread, provider),
        hasExternalParticipants: this.hasExternalParticipants(rawThread, provider),
        conversationType: this.determineConversationType(rawThread, provider),
      },
      // Enhanced sync information
      enhancedSyncStatus: {
        ...baseThread.syncStatus,
        lastConflictResolution: null,
        syncQuality: this.calculateSyncQuality(rawThread, provider),
        estimatedNextSync: this.estimateNextSync(rawThread, provider),
      },
      // Thread analytics
      analytics: {
        responseTime: this.calculateAverageResponseTime(rawThread, provider),
        engagementLevel: this.calculateEngagementLevel(rawThread, provider),
        priorityScore: this.calculatePriorityScore(rawThread, provider),
      },
    };
  }

  static unifyThread(rawThread: any, provider: ProviderType, emails: any): ThreadData {
    // Basic thread unification logic
    return {
      syncStatus: {
        lastSynced: new Date().toISOString(),
        provider: provider,
      },
      messages: emails || [],
      messageCount: emails?.length || 0,
    };
  }

  // Check if conversation involves multiple participants
  static isGroupConversation(thread: any, provider: ProviderType): boolean {
    const participants = this.extractThreadParticipants(thread, provider);
    return participants.length > 2;
  }

  static extractThreadParticipants(thread: any, provider: ProviderType): string[] {
    if (provider === "gmail") {
      return thread.messages?.map((msg: any) => msg.from?.email).filter(Boolean) || [];
    }
    if (provider === "outlook") {
      return thread.messages?.map((msg: any) => msg.from?.emailAddress?.address).filter(Boolean) || [];
    }
    return [];
  }

  // Get total participant count
  static getParticipantCount(thread: any, provider: ProviderType): number {
    const participants = this.extractThreadParticipants(thread, provider);
    return participants.length;
  }

  // Check for external participants
  static hasExternalParticipants(thread: any, provider: ProviderType): boolean {
    // This would need domain checking logic
    return false; // Placeholder
  }

  // Determine conversation type
  static determineConversationType(thread: any, provider: ProviderType): string {
    const subject = this.extractThreadSubject(thread, provider);
    const messageCount = thread.messages?.length || 0;

    if (messageCount === 1) return "notification";
    if (subject.toLowerCase().includes("meeting") || subject.toLowerCase().includes("call")) return "meeting";
    if (subject.toLowerCase().includes("order") || subject.toLowerCase().includes("purchase")) return "business";
    return "conversation";
  }

  static extractThreadSubject(thread: any, provider: ProviderType): string {
    if (provider === "gmail") {
      return thread.messages?.[0]?.subject || "No Subject";
    }
    if (provider === "outlook") {
      return thread.messages?.[0]?.subject || "No Subject";
    }
    return "No Subject";
  }

  // Calculate sync quality score
  static calculateSyncQuality(thread: any, provider: ProviderType): string {
    // Placeholder implementation
    return "high";
  }

  // Estimate next sync time
  static estimateNextSync(thread: any, provider: ProviderType): string {
    const now = new Date();
    const lastSync = new Date(thread.syncStatus?.lastSynced || now);
    const estimatedNext = new Date(lastSync.getTime() + 15 * 60 * 1000); // 15 minutes
    return estimatedNext.toISOString();
  }

  // Calculate average response time
  static calculateAverageResponseTime(thread: any, provider: ProviderType): number {
    // Placeholder implementation
    return 0;
  }

  // Calculate engagement level
  static calculateEngagementLevel(thread: any, provider: ProviderType): string {
    const messageCount = thread.messages?.length || 0;
    if (messageCount > 10) return "high";
    if (messageCount > 5) return "medium";
    return "low";
  }

  // Calculate priority score
  static calculatePriorityScore(thread: any, provider: ProviderType): number {
    let score = 0;

    if (this.isThreadImportant(thread, provider)) score += 3;
    if (this.isThreadFlagged(thread, provider)) score += 2;
    if (thread.messageCount > 5) score += 1;

    return score;
  }

  static isThreadImportant(thread: any, provider: ProviderType): boolean {
    if (provider === "gmail") {
      return thread.messages?.some((msg: any) => msg.labelIds?.includes("IMPORTANT")) || false;
    }
    if (provider === "outlook") {
      return thread.messages?.some((msg: any) => msg.importance === "high") || false;
    }
    return false;
  }

  static isThreadFlagged(thread: any, provider: ProviderType): boolean {
    if (provider === "gmail") {
      return thread.messages?.some((msg: any) => msg.labelIds?.includes("STARRED")) || false;
    }
    if (provider === "outlook") {
      return thread.messages?.some((msg: any) => msg.isFlagged) || false;
    }
    return false;
  }
}

export { EnhancedEmailUnificationServiceExtended };
