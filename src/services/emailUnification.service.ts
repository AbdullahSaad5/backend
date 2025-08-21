// Enhanced Email Unification System
// Handles threads, categorization, sync status, and direct email functionality

class EnhancedEmailUnificationService {
  // Enhanced unification with thread management and categorization
  static unifyEmail(rawEmail: any, provider: string, folderContext: string | null = null, threadData: any = null) {
    const unifiedEmail = {
      // Core identification
      id: rawEmail.id,
      messageId: this.extractMessageId(rawEmail, provider),
      threadId: this.extractThreadId(rawEmail, provider),
      conversationId: this.extractConversationId(rawEmail, provider),

      // Content fields
      subject: this.extractSubject(rawEmail, provider),
      from: this.extractSender(rawEmail, provider),
      to: this.extractRecipients(rawEmail, provider),
      cc: this.extractCCRecipients(rawEmail, provider),
      bcc: this.extractBCCRecipients(rawEmail, provider),
      replyTo: this.extractReplyTo(rawEmail, provider),

      // Body content
      bodyHtml: this.extractHtmlBody(rawEmail, provider),
      bodyText: this.extractTextBody(rawEmail, provider),
      snippet: this.extractSnippet(rawEmail, provider),

      // Dates and metadata
      receivedDate: this.extractDate(rawEmail, provider),
      sentDate: this.extractSentDate(rawEmail, provider),

      // Status flags
      isRead: this.extractReadStatus(rawEmail, provider),
      isDraft: this.extractDraftStatus(rawEmail, provider),
      isSent: this.extractSentStatus(rawEmail, provider, folderContext),
      isImportant: this.extractImportantStatus(rawEmail, provider),
      isFlagged: this.extractFlaggedStatus(rawEmail, provider),

      // Attachments
      hasAttachments: this.extractAttachmentStatus(rawEmail, provider),
      attachments: this.extractAttachments(rawEmail, provider),

      // Categories and labels
      category: this.determineCategory(rawEmail, provider, folderContext),
      labels: this.extractLabels(rawEmail, provider),
      folder: folderContext || this.extractFolder(rawEmail, provider),

      // Threading information
      threadInfo: {
        isThreadStart: this.isThreadStart(rawEmail, provider, threadData),
        threadLength: threadData?.messageCount || 1,
        threadParticipants: this.extractThreadParticipants(threadData, provider),
        hasUnread: this.hasUnreadInThread(threadData, provider),
        lastActivity: this.getThreadLastActivity(threadData, provider),
      },

      // Sync metadata
      syncStatus: {
        lastSynced: new Date().toISOString(),
        provider: provider,
        version: this.extractVersion(rawEmail, provider),
        etag: this.extractETag(rawEmail, provider),
        changeKey: this.extractChangeKey(rawEmail, provider),
      },

      // Provider-specific data
      providerData: {
        provider: provider,
        originalId: rawEmail.id,
        internalDate: this.extractInternalDate(rawEmail, provider),
        sizeBytes: this.extractSize(rawEmail, provider),
      },

      // Keep original for advanced operations
      originalData: rawEmail,
    };

    return unifiedEmail;
  }

  // Enhanced thread unification with advanced conversation grouping
  static unifyThread(rawThread: any, provider: string, emails: any[] | null = null) {
    return {
      id: rawThread.id,
      threadId: provider === "gmail" ? rawThread.id : rawThread.conversationId,
      subject: this.extractThreadSubject(rawThread, provider),
      participants: this.extractThreadParticipants(rawThread, provider),
      messageCount: provider === "gmail" ? rawThread.messages?.length : rawThread.messages?.length || 1,

      // Thread status
      hasUnread: this.hasUnreadInThread(rawThread, provider),
      isImportant: this.isThreadImportant(rawThread, provider),
      isFlagged: this.isThreadFlagged(rawThread, provider),

      // Dates
      firstMessageDate: this.getThreadFirstDate(rawThread, provider),
      lastActivity: this.getThreadLastActivity(rawThread, provider),

      // Categories
      category: this.determineThreadCategory(rawThread, provider),
      labels: this.extractThreadLabels(rawThread, provider),

      // Messages in thread (if requested)
      messages: emails ? emails.map((email: any) => this.unifyEmail(email, provider, null, rawThread)) : null,

      // Sync info
      syncStatus: {
        lastSynced: new Date().toISOString(),
        provider: provider,
        historyId: provider === "gmail" ? rawThread.historyId : null,
      },

      originalData: rawThread,
    };
  }

  // ADVANCED THREAD MANAGEMENT METHODS

  // Smart conversation grouping across providers
  static generateUnifiedConversationId(email: any, provider: string) {
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

  // Enhanced thread participant extraction
  static extractThreadParticipants(threadData: any, provider: string) {
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
  }

  // ENHANCED CATEGORY SYSTEM

  // Universal category mapping for all providers
  static mapToUniversalCategory(providerCategory: string, provider: string) {
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
  static determineCategory(email: any, provider: string, folderContext: string | null) {
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
  static trackSyncState(email: any, provider: string, existingEmail: any = null) {
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
  static detectConflict(newEmail: any, existingEmail: any, provider: string) {
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
  static createDraftEmail(emailData: any, provider: string, threadContext: any = null) {
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
  }

  // Enhanced reply creation with proper threading
  static createReplyEmail(originalEmail: any, replyData: any, provider: string) {
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

    return this.createDraftEmail(reply, provider, { threadId: originalEmail.threadId });
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
  static extractReplyRecipients(email: any) {
    const allRecipients = [...(email.to || []), ...(email.cc || [])];

    // Remove the sender from recipients
    return allRecipients.filter((recipient) => recipient.email !== email.from?.email);
  }

  // EXTRACTION METHODS (Enhanced)

  static extractMessageId(email: any, provider: string) {
    if (provider === "gmail") {
      const headers = this.getGmailHeaders(email.payload);
      return headers["Message-ID"] || email.id;
    }
    if (provider === "outlook") {
      return email.internetMessageId || email.id;
    }
  }

  static extractConversationId(email: any, provider: string) {
    if (provider === "gmail") {
      return email.threadId; // Gmail uses threadId as conversation identifier
    }
    if (provider === "outlook") {
      return email.conversationId;
    }
  }

  static extractSubject(email: any, provider: string) {
    if (provider === "gmail") {
      const headers = this.getGmailHeaders(email.payload);
      return headers["Subject"] || "(No Subject)";
    }
    if (provider === "outlook") {
      return email.subject || "(No Subject)";
    }
  }

  static extractSender(email: any, provider: string) {
    if (provider === "gmail") {
      const headers = this.getGmailHeaders(email.payload);
      const fromHeader = headers["From"] || "";
      return this.parseEmailAddress(fromHeader);
    }
    if (provider === "outlook") {
      return {
        name: email.from?.emailAddress?.name || "",
        email: email.from?.emailAddress?.address || "",
      };
    }
  }

  static extractRecipients(email: any, provider: string) {
    if (provider === "gmail") {
      const headers = this.getGmailHeaders(email.payload);
      const toHeader = headers["To"] || "";
      return this.parseEmailAddresses(toHeader);
    }
    if (provider === "outlook") {
      return (
        email.toRecipients?.map((recipient: any) => ({
          name: recipient.emailAddress?.name || "",
          email: recipient.emailAddress?.address || "",
        })) || []
      );
    }
  }

  static extractCCRecipients(email: any, provider: string) {
    if (provider === "gmail") {
      const headers = this.getGmailHeaders(email.payload);
      const ccHeader = headers["Cc"] || "";
      return this.parseEmailAddresses(ccHeader);
    }
    if (provider === "outlook") {
      return (
        email.ccRecipients?.map((recipient: any) => ({
          name: recipient.emailAddress?.name || "",
          email: recipient.emailAddress?.address || "",
        })) || []
      );
    }
  }

  static extractBCCRecipients(email: any, provider: string) {
    if (provider === "gmail") {
      const headers = this.getGmailHeaders(email.payload);
      const bccHeader = headers["Bcc"] || "";
      return this.parseEmailAddresses(bccHeader);
    }
    if (provider === "outlook") {
      return (
        email.bccRecipients?.map((recipient: any) => ({
          name: recipient.emailAddress?.name || "",
          email: recipient.emailAddress?.address || "",
        })) || []
      );
    }
  }

  static extractReplyTo(email: any, provider: string) {
    if (provider === "gmail") {
      const headers = this.getGmailHeaders(email.payload);
      const replyToHeader = headers["Reply-To"] || "";
      return this.parseEmailAddresses(replyToHeader);
    }
    if (provider === "outlook") {
      return (
        email.replyTo?.map((recipient: any) => ({
          name: recipient.emailAddress?.name || "",
          email: recipient.emailAddress?.address || "",
        })) || []
      );
    }
  }

  static extractHtmlBody(email: any, provider: string) {
    if (provider === "gmail") {
      return this.getGmailBody(email.payload, "text/html");
    }
    if (provider === "outlook") {
      return email.body?.contentType === "html" ? email.body.content : "";
    }
  }

  static extractTextBody(email: any, provider: string) {
    if (provider === "gmail") {
      return this.getGmailBody(email.payload, "text/plain");
    }
    if (provider === "outlook") {
      return email.body?.contentType === "text" ? email.body.content : this.htmlToText(email.body?.content || "");
    }
  }

  static extractDate(email: any, provider: string) {
    if (provider === "gmail") {
      return new Date(parseInt(email.internalDate)).toISOString();
    }
    if (provider === "outlook") {
      return email.receivedDateTime;
    }
  }

  static extractSentDate(email: any, provider: string) {
    if (provider === "gmail") {
      const headers = this.getGmailHeaders(email.payload);
      return headers["Date"]
        ? new Date(headers["Date"]).toISOString()
        : new Date(parseInt(email.internalDate)).toISOString();
    }
    if (provider === "outlook") {
      return email.sentDateTime || email.createdDateTime;
    }
  }

  static extractReadStatus(email: any, provider: string) {
    if (provider === "gmail") {
      return !email.labelIds?.includes("UNREAD");
    }
    if (provider === "outlook") {
      return email.isRead;
    }
  }

  static extractDraftStatus(email: any, provider: string) {
    if (provider === "gmail") {
      return email.labelIds?.includes("DRAFT") || false;
    }
    if (provider === "outlook") {
      return email.isDraft || false;
    }
  }

  static extractSentStatus(email: any, provider: string, folderContext: string | null) {
    if (provider === "gmail") {
      return email.labelIds?.includes("SENT") || false;
    }
    if (provider === "outlook") {
      return folderContext === "SentItems" || email.parentFolderId === "SentItems";
    }
  }

  static extractImportantStatus(email: any, provider: string) {
    if (provider === "gmail") {
      return email.labelIds?.includes("IMPORTANT") || false;
    }
    if (provider === "outlook") {
      return email.importance === "high";
    }
  }

  static extractFlaggedStatus(email: any, provider: string) {
    if (provider === "gmail") {
      return email.labelIds?.includes("STARRED") || false;
    }
    if (provider === "outlook") {
      return email.flag?.flagStatus === "flagged";
    }
  }

  static extractAttachmentStatus(email: any, provider: string) {
    if (provider === "gmail") {
      return this.hasGmailAttachments(email.payload);
    }
    if (provider === "outlook") {
      return email.hasAttachments || false;
    }
  }

  static extractAttachments(email: any, provider: string) {
    if (provider === "gmail") {
      return this.getGmailAttachments(email.payload);
    }
    if (provider === "outlook") {
      return (
        email.attachments?.map((att: any) => ({
          id: att.id,
          name: att.name,
          contentType: att.contentType,
          size: att.size,
          isInline: att.isInline,
        })) || []
      );
    }
  }

  static extractLabels(email: any, provider: string) {
    if (provider === "gmail") {
      return email.labelIds || [];
    }
    if (provider === "outlook") {
      return email.categories || [];
    }
  }

  static extractFolder(email: any, provider: string) {
    if (provider === "gmail") {
      // Gmail doesn't have folders, map labels to folder-like structure
      const labels = email.labelIds || [];
      if (labels.includes("INBOX")) return "Inbox";
      if (labels.includes("SENT")) return "Sent";
      if (labels.includes("DRAFT")) return "Drafts";
      if (labels.includes("TRASH")) return "Trash";
      return "Other";
    }
    if (provider === "outlook") {
      return email.parentFolderId || "Inbox";
    }
  }

  // THREAD-SPECIFIC METHODS

  static isThreadStart(email: any, provider: string, threadData: any) {
    if (provider === "gmail") {
      const headers = this.getGmailHeaders(email.payload);
      return !headers["In-Reply-To"] && !headers["References"];
    }
    if (provider === "outlook") {
      return !email.parentMessageId;
    }
  }

  static hasUnreadInThread(threadData: any, provider: string) {
    if (!threadData) return false;

    if (provider === "gmail") {
      return threadData.messages?.some((msg: any) => msg.labelIds?.includes("UNREAD")) || false;
    }

    if (provider === "outlook") {
      return threadData.messages?.some((msg: any) => !msg.isRead) || false;
    }
  }

  static getThreadLastActivity(threadData: any, provider: string) {
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
  }

  // SYNC AND VERSION METHODS

  static extractVersion(email: any, provider: string) {
    if (provider === "gmail") {
      return email.historyId || null;
    }
    if (provider === "outlook") {
      return email["@odata.etag"] || null;
    }
  }

  static extractETag(email: any, provider: string) {
    if (provider === "outlook") {
      return email["@odata.etag"] || null;
    }
    return null;
  }

  static extractChangeKey(email: any, provider: string) {
    if (provider === "outlook") {
      return email.changeKey || null;
    }
    return null;
  }

  static extractInternalDate(email: any, provider: string) {
    if (provider === "gmail") {
      return email.internalDate;
    }
    if (provider === "outlook") {
      return new Date(email.receivedDateTime).getTime().toString();
    }
  }

  static extractSize(email: any, provider: string) {
    if (provider === "gmail") {
      return email.sizeEstimate || 0;
    }
    if (provider === "outlook") {
      return email.bodyPreview?.length || 0; // Approximate
    }
  }

  // HELPER METHODS

  static getGmailHeaders(payload: any) {
    const headers: { [key: string]: string } = {};
    if (payload.headers) {
      payload.headers.forEach((header: any) => {
        headers[header.name] = header.value;
      });
    }
    return headers;
  }

  static getGmailBody(payload: any, mimeType: string) {
    const findPart = (part: any, type: string): string | null => {
      if (part.mimeType === type && part.body?.data) {
        return Buffer.from(part.body.data, "base64").toString();
      }

      if (part.parts) {
        for (const subPart of part.parts) {
          const result = findPart(subPart, type);
          if (result) return result;
        }
      }

      return null;
    };

    return findPart(payload, mimeType) || "";
  }

  static getGmailAttachments(payload: any) {
    const attachments: any[] = [];

    const findAttachments = (part: any) => {
      if (part.filename && part.filename !== "") {
        attachments.push({
          id: part.body?.attachmentId,
          filename: part.filename,
          mimeType: part.mimeType,
          size: part.body?.size || 0,
        });
      }

      if (part.parts) {
        part.parts.forEach(findAttachments);
      }
    };

    findAttachments(payload);
    return attachments;
  }

  static hasGmailAttachments(payload: any) {
    const checkParts = (part: any): boolean => {
      if (part.filename && part.filename !== "") return true;
      if (part.parts) return part.parts.some(checkParts);
      return false;
    };
    return checkParts(payload);
  }

  static parseEmailAddress(emailStr: string) {
    if (!emailStr) return { name: "", email: "" };
    const match = emailStr.match(/^(.*?)\s*<(.+?)>$/) || [null, "", emailStr];
    return {
      name: match[1]?.replace(/"/g, "").trim() || "",
      email: match[2]?.trim() || emailStr,
    };
  }

  static parseEmailAddresses(emailStr: string) {
    if (!emailStr) return [];
    return emailStr.split(",").map((addr: string) => this.parseEmailAddress(addr.trim()));
  }

  static htmlToText(html: string) {
    return html
      .replace(/<[^>]*>/g, "")
      .replace(/&nbsp;/g, " ")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&amp;/g, "&")
      .trim();
  }

  static extractThreadId(email: any, provider: string) {
    if (provider === "gmail") {
      return email.threadId;
    }
    if (provider === "outlook") {
      return email.conversationId;
    }
  }

  static extractSnippet(email: any, provider: string) {
    if (provider === "gmail") {
      return email.snippet || "";
    }
    if (provider === "outlook") {
      return email.bodyPreview || "";
    }
  }

  // MAIN UNIFICATION METHODS

  static unifyEmailArray(
    emailArray: any[],
    provider: string,
    folderContext: string | null = null,
    threadsData: any[] | null = null
  ) {
    return emailArray.map((email: any) => {
      const threadData = threadsData?.find((t: any) =>
        provider === "gmail" ? t.id === email.threadId : t.conversationId === email.conversationId
      );
      return this.unifyEmail(email, provider, folderContext, threadData);
    });
  }

  static unifyThreadsArray(threadsArray: any[], provider: string) {
    return threadsArray.map((thread: any) => this.unifyThread(thread, provider));
  }

  static formatEmailAddresses(addresses: any[]) {
    return addresses.map((addr: any) => (addr.name ? `"${addr.name}" <${addr.email}>` : addr.email)).join(", ");
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

  // Thread subject extraction
  static extractThreadSubject(thread: any, provider: string) {
    if (provider === "gmail") {
      return thread.messages?.[0]?.payload?.headers?.find((h: any) => h.name === "Subject")?.value || "(No Subject)";
    }
    if (provider === "outlook") {
      return thread.messages?.[0]?.subject || "(No Subject)";
    }
    return "(No Subject)";
  }

  // Thread category determination
  static determineThreadCategory(thread: any, provider: string) {
    if (provider === "gmail") {
      const firstMessage = thread.messages?.[0];
      if (firstMessage?.labelIds) {
        return this.determineCategory(firstMessage, provider, null);
      }
    }
    if (provider === "outlook") {
      const firstMessage = thread.messages?.[0];
      if (firstMessage) {
        return this.determineCategory(firstMessage, provider, null);
      }
    }
    return "OTHER";
  }

  // Thread labels extraction
  static extractThreadLabels(thread: any, provider: string) {
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

  // Thread importance check
  static isThreadImportant(thread: any, provider: string) {
    if (provider === "gmail") {
      return thread.messages?.some((msg: any) => msg.labelIds?.includes("IMPORTANT")) || false;
    }
    if (provider === "outlook") {
      return thread.messages?.some((msg: any) => msg.importance === "high") || false;
    }
    return false;
  }

  // Thread flagged check
  static isThreadFlagged(thread: any, provider: string) {
    if (provider === "gmail") {
      return thread.messages?.some((msg: any) => msg.labelIds?.includes("STARRED")) || false;
    }
    if (provider === "outlook") {
      return thread.messages?.some((msg: any) => msg.flag?.flagStatus === "flagged") || false;
    }
    return false;
  }

  // Thread first date
  static getThreadFirstDate(thread: any, provider: string) {
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
}
