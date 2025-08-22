// Enhanced Email Integration Service
// Provides advanced features for email unification, threading, and sync

class EnhancedEmailIntegrationService {
  // ADVANCED THREAD MANAGEMENT METHODS

  // Smart conversation grouping across providers
  static generateUnifiedConversationId(email: any, provider: string): string {
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
  static generateConversationIdFromReferences(email: any): string {
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
  static mapToUniversalCategory(providerCategory: string, provider: string): string {
    const categoryMap: { [key: string]: { [key: string]: string | ((label: string) => string) } } = {
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
  static determineEnhancedCategory(email: any, provider: string, folderContext?: string): string {
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
  static trackSyncState(email: any, provider: string, existingEmail?: any): any {
    const syncState: any = {
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
        syncState.conflicts.push(conflict);
        syncState.syncMethod = "conflict_resolution";
      }
    }

    return syncState;
  }

  // Detect conflicts between email versions
  static detectConflict(newEmail: any, existingEmail: any, provider: string): any[] | null {
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
  static createEnhancedDraftEmail(emailData: any, provider: string, threadContext?: any): any {
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
        toRecipients: draft.to.map((addr: any) => ({
          emailAddress: { address: addr.email, name: addr.name },
        })),
        ccRecipients: draft.cc.map((addr: any) => ({
          emailAddress: { address: addr.email, name: addr.name },
        })),
        bccRecipients: draft.bcc.map((addr: any) => ({
          emailAddress: { address: addr.email, name: addr.name },
        })),
        ...(draft.inReplyTo && { inReplyTo: draft.inReplyTo }),
        ...(draft.references.length > 0 && { references: draft.references }),
      };
    }

    return draft;
  }

  // Enhanced reply creation with proper threading
  static createReplyEmail(originalEmail: any, replyData: any, provider: string): any {
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
  static generateReplySubject(originalSubject: string): string {
    if (originalSubject.startsWith("Re:")) {
      return originalSubject;
    }
    return `Re: ${originalSubject}`;
  }

  // Build references chain for proper threading
  static buildReferencesChain(email: any): string[] {
    const references = email.references || [];
    if (email.messageId) {
      return [...references, email.messageId];
    }
    return references;
  }

  // Extract reply recipients (exclude sender from recipients)
  static extractReplyRecipients(email: any): any[] {
    const allRecipients = [...(email.to || []), ...(email.cc || [])];

    // Remove the sender from recipients
    return allRecipients.filter((recipient) => recipient.email !== email.from?.email);
  }

  // Utility methods for enhanced functionality

  static hashString(str: string): string {
    let hash = 0;
    if (str.length === 0) return hash.toString();
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash).toString(36);
  }

  static arraysEqual(a: any[], b: any[]): boolean {
    if (a.length !== b.length) return false;
    return a.every((val, index) => val === b[index]);
  }

  // Enhanced thread unification with advanced features
  static unifyEnhancedThread(rawThread: any, provider: string, emails?: any[]): any {
    // Create base thread structure
    const baseThread = {
      id: rawThread.id,
      threadId: provider === "gmail" ? rawThread.id : rawThread.conversationId,
      subject: this.extractThreadSubject(rawThread, provider),
      participants: this.extractThreadParticipants(rawThread, provider),
      messageCount: provider === "gmail" ? rawThread.messages?.length : rawThread.messages?.length || 1,
      hasUnread: this.hasUnreadInThread(rawThread, provider),
      isImportant: this.isThreadImportant(rawThread, provider),
      isFlagged: this.isThreadFlagged(rawThread, provider),
      firstMessageDate: this.getThreadFirstDate(rawThread, provider),
      lastActivity: this.getThreadLastActivity(rawThread, provider),
      category: this.determineThreadCategory(rawThread, provider),
      labels: this.extractThreadLabels(rawThread, provider),
      messages: emails || rawThread.messages || [],
      syncStatus: {
        lastSynced: new Date().toISOString(),
        provider: provider,
        historyId: provider === "gmail" ? rawThread.historyId : null,
      },
      originalData: rawThread,
    };

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

  // Check if conversation involves multiple participants
  static isGroupConversation(thread: any, provider: string): boolean {
    const participants = this.extractThreadParticipants(thread, provider);
    return participants.length > 2;
  }

  // Get total participant count
  static getParticipantCount(thread: any, provider: string): number {
    const participants = this.extractThreadParticipants(thread, provider);
    return participants.length;
  }

  // Check for external participants
  static hasExternalParticipants(thread: any, provider: string): boolean {
    // This would need domain checking logic
    return false; // Placeholder
  }

  // Determine conversation type
  static determineConversationType(thread: any, provider: string): string {
    const subject = this.extractThreadSubject(thread, provider);
    const messageCount = thread.messages?.length || 0;

    if (messageCount === 1) return "notification";
    if (subject.toLowerCase().includes("meeting") || subject.toLowerCase().includes("call")) return "meeting";
    if (subject.toLowerCase().includes("order") || subject.toLowerCase().includes("purchase")) return "business";
    return "conversation";
  }

  // Calculate sync quality score
  static calculateSyncQuality(thread: any, provider: string): string {
    // Placeholder implementation
    return "high";
  }

  // Estimate next sync time
  static estimateNextSync(thread: any, provider: string): string {
    const now = new Date();
    const lastSync = new Date(thread.syncStatus?.lastSynced || now);
    const estimatedNext = new Date(lastSync.getTime() + 15 * 60 * 1000); // 15 minutes
    return estimatedNext.toISOString();
  }

  // Calculate average response time
  static calculateAverageResponseTime(thread: any, provider: string): number {
    // Placeholder implementation
    return 0;
  }

  // Calculate engagement level
  static calculateEngagementLevel(thread: any, provider: string): string {
    const messageCount = thread.messages?.length || 0;
    if (messageCount > 10) return "high";
    if (messageCount > 5) return "medium";
    return "low";
  }

  // Calculate priority score
  static calculatePriorityScore(thread: any, provider: string): number {
    let score = 0;

    if (this.isThreadImportant(thread, provider)) score += 3;
    if (this.isThreadFlagged(thread, provider)) score += 2;
    if (thread.messageCount > 5) score += 1;

    return score;
  }

  // Helper methods for thread processing
  static extractThreadParticipants(threadData: any, provider: string): any[] {
    if (!threadData) return [];

    if (provider === "gmail") {
      const participants = new Set<string>();
      threadData.messages?.forEach((msg: any) => {
        const headers = this.getGmailHeaders(msg.payload);
        const from = this.parseEmailAddress(headers["From"] || "");
        const to = this.parseEmailAddresses(headers["To"] || "");

        if (from.email) participants.add(JSON.stringify(from));
        to.forEach((recipient: any) => {
          if (recipient.email) participants.add(JSON.stringify(recipient));
        });
      });

      return Array.from(participants).map((p: string) => JSON.parse(p));
    }

    if (provider === "outlook") {
      // Outlook doesn't provide thread-level participant data
      // Would need to aggregate from individual messages
      return [];
    }

    return [];
  }

  static hasUnreadInThread(threadData: any, provider: string): boolean {
    if (!threadData) return false;

    if (provider === "gmail") {
      return threadData.messages?.some((msg: any) => msg.labelIds?.includes("UNREAD")) || false;
    }

    if (provider === "outlook") {
      return threadData.messages?.some((msg: any) => !msg.isRead) || false;
    }

    return false;
  }

  static getThreadLastActivity(threadData: any, provider: string): string | null {
    if (!threadData) return null;

    if (provider === "gmail") {
      const messages = threadData.messages || [];
      if (messages.length === 0) return null;

      const lastMessage = messages[messages.length - 1];
      return new Date(parseInt(lastMessage.internalDate)).toISOString();
    }

    if (provider === "outlook") {
      const messages = threadData.messages || [];
      if (messages.length === 0) return null;

      return messages.reduce((latest: any, msg: any) => {
        const msgDate = new Date(msg.receivedDateTime);
        return msgDate > new Date(latest) ? msg.receivedDateTime : latest;
      }, messages[0].receivedDateTime);
    }

    return null;
  }

  static getThreadFirstDate(thread: any, provider: string): string {
    if (provider === "gmail") {
      const firstMessage = thread.messages?.[0];
      if (firstMessage?.internalDate) {
        return new Date(parseInt(firstMessage.internalDate)).toISOString();
      }
    }
    if (provider === "outlook") {
      const firstMessage = thread.messages?.[0];
      if (firstMessage?.receivedDateTime) {
        return firstMessage.receivedDateTime;
      }
    }
    return new Date().toISOString();
  }

  static isThreadImportant(thread: any, provider: string): boolean {
    if (provider === "gmail") {
      return thread.messages?.some((msg: any) => msg.labelIds?.includes("IMPORTANT")) || false;
    }
    if (provider === "outlook") {
      return thread.messages?.some((msg: any) => msg.importance === "high") || false;
    }
    return false;
  }

  static isThreadFlagged(thread: any, provider: string): boolean {
    if (provider === "gmail") {
      return thread.messages?.some((msg: any) => msg.labelIds?.includes("STARRED")) || false;
    }
    if (provider === "outlook") {
      return thread.messages?.some((msg: any) => msg.flag?.flagStatus === "flagged") || false;
    }
    return false;
  }

  static extractThreadSubject(thread: any, provider: string): string {
    if (provider === "gmail") {
      return thread.messages?.[0]?.payload?.headers?.find((h: any) => h.name === "Subject")?.value || "(No Subject)";
    }
    if (provider === "outlook") {
      return thread.messages?.[0]?.subject || "(No Subject)";
    }
    return "(No Subject)";
  }

  static determineThreadCategory(thread: any, provider: string): string {
    if (provider === "gmail") {
      const firstMessage = thread.messages?.[0];
      if (firstMessage?.labelIds) {
        return this.determineEnhancedCategory(firstMessage, provider);
      }
    }
    if (provider === "outlook") {
      const firstMessage = thread.messages?.[0];
      if (firstMessage) {
        return this.determineEnhancedCategory(firstMessage, provider);
      }
    }
    return "OTHER";
  }

  static extractThreadLabels(thread: any, provider: string): string[] {
    if (provider === "gmail") {
      const allLabels = new Set<string>();
      thread.messages?.forEach((msg: any) => {
        if (msg.labelIds) {
          msg.labelIds.forEach((label: string) => allLabels.add(label));
        }
      });
      return Array.from(allLabels);
    }
    if (provider === "outlook") {
      const allLabels = new Set<string>();
      thread.messages?.forEach((msg: any) => {
        if (msg.categories) {
          msg.categories.forEach((category: string) => allLabels.add(category));
        }
      });
      return Array.from(allLabels);
    }
    return [];
  }

  // Gmail-specific helper methods
  static getGmailHeaders(payload: any): { [key: string]: string } {
    const headers: { [key: string]: string } = {};
    if (payload.headers) {
      payload.headers.forEach((header: any) => {
        headers[header.name] = header.value;
      });
    }
    return headers;
  }

  static parseEmailAddress(emailStr: string): { name: string; email: string } {
    if (!emailStr) return { name: "", email: "" };
    const match = emailStr.match(/^(.*?)\s*<(.+?)>$/) || [null, "", emailStr];
    return {
      name: match[1]?.replace(/"/g, "").trim() || "",
      email: match[2]?.trim() || emailStr,
    };
  }

  static parseEmailAddresses(emailStr: string): any[] {
    if (!emailStr) return [];
    return emailStr.split(",").map((addr: string) => this.parseEmailAddress(addr.trim()));
  }

  static formatEmailAddresses(addresses: any[]): string {
    return addresses.map((addr: any) => (addr.name ? `"${addr.name}" <${addr.email}>` : addr.email)).join(", ");
  }

  // Version extraction methods
  static extractVersion(email: any, provider: string): string | null {
    if (provider === "gmail") {
      return email.historyId || null;
    }
    if (provider === "outlook") {
      return email["@odata.etag"] || null;
    }
    return null;
  }

  static extractETag(email: any, provider: string): string | null {
    if (provider === "outlook") {
      return email["@odata.etag"] || null;
    }
    return null;
  }

  static extractChangeKey(email: any, provider: string): string | null {
    if (provider === "outlook") {
      return email.changeKey || null;
    }
    return null;
  }
}

module.exports = EnhancedEmailIntegrationService;
