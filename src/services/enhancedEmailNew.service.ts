// Enhanced Email Service - New Implementation
// Handles email fetching, threading, categorization, and sync with providers

const EnhancedEmailUnificationService = require("./emailUnification.service");
const EnhancedEmailIntegrationService = require("./enhancedEmailIntegration.service");

class EnhancedEmailServiceNew {
  private syncStatus: Map<string, any>;
  private threadCache: Map<string, any>;
  private conflictResolutionCache: Map<string, any>;

  constructor() {
    this.syncStatus = new Map(); // Track sync status per account
    this.threadCache = new Map(); // Cache thread data for performance
    this.conflictResolutionCache = new Map(); // Cache conflict resolutions
  }

  // MAIN EMAIL FETCHING WITH ENHANCED CATEGORIZATION
  async fetchEmailsForAccount(accountId: string, options: any = {}) {
    const {
      category = "inbox", // 'inbox', 'sent', 'drafts', 'all'
      maxResults = 50,
      pageToken = null,
      includeThreads = true,
      syncMode = "incremental", // 'full', 'incremental'
      useEnhancedUnification = true, // Use enhanced unification features
    } = options;

    try {
      const account = await this.getAccountById(accountId);
      if (!account) {
        throw new Error("Account not found");
      }

      let result;

      if (account.provider === "gmail" || account.type === "gmail") {
        result = await this.fetchGmailEmailsByCategory(account, category, {
          maxResults,
          pageToken,
          includeThreads,
          syncMode,
          useEnhancedUnification,
        });
      } else if (account.provider === "outlook" || account.type === "outlook") {
        result = await this.fetchOutlookEmailsByCategory(account, category, {
          maxResults,
          pageToken,
          includeThreads,
          syncMode,
          useEnhancedUnification,
        });
      } else {
        throw new Error("Unsupported email provider");
      }

      // Update sync status with enhanced tracking
      this.updateEnhancedSyncStatus(accountId, {
        lastSync: new Date().toISOString(),
        category: category,
        emailCount: result.emails.length,
        hasMore: result.hasMore,
        syncMode: syncMode,
        conflictsResolved: result.conflictsResolved || 0,
      });

      return {
        success: true,
        ...result,
        account: account.email,
        provider: account.provider,
        syncStatus: this.getEnhancedSyncStatus(accountId),
        enhancedFeatures: useEnhancedUnification,
      };
    } catch (error) {
      console.error("Error fetching unified emails:", error);
      return {
        success: false,
        emails: [],
        threads: [],
        error: error.message,
        syncStatus: this.getEnhancedSyncStatus(accountId),
      };
    }
  }

  // GMAIL IMPLEMENTATION WITH ENHANCED FEATURES
  async fetchGmailEmailsByCategory(account: any, category: string, options: any) {
    const { maxResults, pageToken, includeThreads, syncMode, useEnhancedUnification } = options;

    // Build Gmail query based on category
    const query = this.buildGmailQuery(category);
    const labelIds = this.getGmailLabelIds(category);

    try {
      let threads = [];
      let emails = [];
      let nextPageToken = null;
      let hasMore = false;
      let conflictsResolved = 0;

      if (includeThreads) {
        // Fetch threads first
        const threadsResponse = await this.gmailAPI.users.threads.list({
          userId: "me",
          q: query,
          labelIds: labelIds,
          maxResults: maxResults,
          pageToken: pageToken,
          auth: account.auth,
        });

        const threadsList = threadsResponse.data.threads || [];
        nextPageToken = threadsResponse.data.nextPageToken;
        hasMore = !!nextPageToken;

        // Fetch detailed thread data
        const threadPromises = threadsList.map(async (thread: any) => {
          const threadDetail = await this.gmailAPI.users.threads.get({
            userId: "me",
            id: thread.id,
            auth: account.auth,
          });
          return threadDetail.data;
        });

        const threadsData = await Promise.all(threadPromises);

        // Use enhanced unification if requested
        if (useEnhancedUnification) {
          threads = threadsData.map((threadData: any) => 
            EnhancedEmailIntegrationService.unifyEnhancedThread(threadData, "gmail")
          );
          
          // Extract all emails from threads with enhanced unification
          threadsData.forEach((threadData: any) => {
            if (threadData.messages) {
              threadData.messages.forEach((message: any) => {
                const unifiedEmail = EnhancedEmailUnificationService.unifyEmail(
                  message,
                  "gmail",
                  this.getCategoryFromLabels(message.labelIds),
                  threadData
                );
                
                // Check for conflicts and resolve them
                const conflictResolution = this.resolveEmailConflicts(unifiedEmail, account.id);
                if (conflictResolution.resolved) {
                  conflictsResolved++;
                }
                
                emails.push(conflictResolution.email);
              });
            }
          });
        } else {
          // Use standard unification
          threads = EnhancedEmailUnificationService.unifyThreadsArray(threadsData, "gmail");
          
          threadsData.forEach((threadData: any) => {
            if (threadData.messages) {
              threadData.messages.forEach((message: any) => {
                const unifiedEmail = EnhancedEmailUnificationService.unifyEmail(
                  message,
                  "gmail",
                  this.getCategoryFromLabels(message.labelIds),
                  threadData
                );
                emails.push(unifiedEmail);
              });
            }
          });
        }

        // Cache thread data
        threadsData.forEach((thread: any) => {
          this.threadCache.set(`gmail_${thread.id}`, thread);
        });
      } else {
        // Fetch messages directly (faster for large volumes)
        const messagesResponse = await this.gmailAPI.users.messages.list({
          userId: "me",
          q: query,
          labelIds: labelIds,
          maxResults: maxResults,
          pageToken: pageToken,
          auth: account.auth,
        });

        const messagesList = messagesResponse.data.messages || [];
        nextPageToken = messagesResponse.data.nextPageToken;
        hasMore = !!nextPageToken;

        // Fetch detailed message data
        const messagePromises = messagesList.map(async (message: any) => {
          const messageDetail = await this.gmailAPI.users.messages.get({
            userId: "me",
            id: message.id,
            format: "full",
            auth: account.auth,
          });
          return messageDetail.data;
        });

        const messagesData = await Promise.all(messagePromises);

        // Unify emails with enhanced features if requested
        if (useEnhancedUnification) {
          emails = EnhancedEmailUnificationService.unifyEmailArray(
            messagesData,
            "gmail",
            this.getCategoryFromLabels(messagesData[0]?.labelIds)
          );
        } else {
          emails = EnhancedEmailUnificationService.unifyEmailArray(
            messagesData,
            "gmail",
            this.getCategoryFromLabels(messagesData[0]?.labelIds)
          );
        }
      }

      // Sort by date (newest first)
      emails.sort((a: any, b: any) => new Date(b.receivedDate).getTime() - new Date(a.receivedDate).getTime());
      threads.sort((a: any, b: any) => new Date(b.lastActivity).getTime() - new Date(a.lastActivity).getTime());

      return {
        emails,
        threads,
        nextPageToken,
        hasMore,
        category,
        totalResults: emails.length,
        conflictsResolved,
      };
    } catch (error) {
      console.error("Gmail API error:", error);
      throw new Error(`Gmail fetch failed: ${error.message}`);
    }
  }

  // OUTLOOK IMPLEMENTATION WITH ENHANCED FEATURES
  async fetchOutlookEmailsByCategory(account: any, category: string, options: any) {
    const { maxResults, pageToken, includeThreads, syncMode, useEnhancedUnification } = options;

    try {
      let emails = [];
      let threads = [];
      let nextPageToken = null;
      let hasMore = false;
      let conflictsResolved = 0;

      // Determine folder for category
      const folderId = this.getOutlookFolderId(category);

      // Build Outlook query
      let url = `/me/mailFolders/${folderId}/messages`;
      let queryParams = [
        `$top=${maxResults}`,
        `$orderby=receivedDateTime desc`,
        `$expand=attachments($select=id,name,contentType,size,isInline)`,
      ];

      if (pageToken) {
        queryParams.push(`$skip=${pageToken}`);
      }

      // Add sync-specific parameters
      if (syncMode === "incremental") {
        const lastSync = this.getLastSyncTime(account.id, category);
        if (lastSync) {
          queryParams.push(`$filter=receivedDateTime gt ${lastSync}`);
        }
      }

      url += "?" + queryParams.join("&");

      const response = await this.outlookAPI.api(url).get();
      const messagesData = response.value || [];

      // Check for more results
      hasMore = response["@odata.nextLink"] ? true : false;
      nextPageToken = hasMore ? (pageToken || 0) + maxResults : null;

      // Unify emails with enhanced features if requested
      if (useEnhancedUnification) {
        emails = EnhancedEmailUnificationService.unifyEmailArray(messagesData, "outlook", category);
      } else {
        emails = EnhancedEmailUnificationService.unifyEmailArray(messagesData, "outlook", category);
      }

      if (includeThreads) {
        // Group emails by conversation ID for threading
        const conversationMap = new Map();

        emails.forEach((email: any) => {
          const convId = email.conversationId;
          if (!conversationMap.has(convId)) {
            conversationMap.set(convId, []);
          }
          conversationMap.get(convId).push(email);
        });

        // Create unified threads with enhanced features if requested
        threads = Array.from(conversationMap.entries()).map(([convId, threadEmails]: [string, any[]]) => {
          const sortedEmails = threadEmails.sort((a: any, b: any) => new Date(a.receivedDate).getTime() - new Date(b.receivedDate).getTime());

          const baseThread = {
            id: convId,
            threadId: convId,
            subject: sortedEmails[0].subject,
            participants: this.extractConversationParticipants(sortedEmails),
            messageCount: sortedEmails.length,
            hasUnread: sortedEmails.some((email: any) => !email.isRead),
            isImportant: sortedEmails.some((email: any) => email.isImportant),
            isFlagged: sortedEmails.some((email: any) => email.isFlagged),
            firstMessageDate: sortedEmails[0].receivedDate,
            lastActivity: sortedEmails[sortedEmails.length - 1].receivedDate,
            category: category,
            labels: [],
            messages: sortedEmails,
            syncStatus: {
              lastSynced: new Date().toISOString(),
              provider: "outlook",
            },
            originalData: { conversationId: convId, messageCount: sortedEmails.length },
          };

          // Apply enhanced unification if requested
          if (useEnhancedUnification) {
            return EnhancedEmailIntegrationService.unifyEnhancedThread(baseThread, "outlook", sortedEmails);
          }

          return baseThread;
        });

        // Sort threads by last activity
        threads.sort((a: any, b: any) => new Date(b.lastActivity).getTime() - new Date(a.lastActivity).getTime());
      }

      return {
        emails,
        threads,
        nextPageToken,
        hasMore,
        category,
        totalResults: emails.length,
        conflictsResolved,
      };
    } catch (error) {
      console.error("Outlook API error:", error);
      throw new Error(`Outlook fetch failed: ${error.message}`);
    }
  }

  // ENHANCED THREADING METHODS
  async fetchThreadById(accountId: string, threadId: string, provider: string, useEnhancedUnification = true) {
    try {
      const account = await this.getAccountById(accountId);

      // Check cache first
      const cacheKey = `${provider}_${threadId}`;
      if (this.threadCache.has(cacheKey)) {
        const cachedThread = this.threadCache.get(cacheKey);
        
        if (useEnhancedUnification) {
          return EnhancedEmailIntegrationService.unifyEnhancedThread(cachedThread, provider);
        }
        return EnhancedEmailUnificationService.unifyThread(cachedThread, provider);
      }

      let threadData;

      if (provider === "gmail") {
        const response = await this.gmailAPI.users.threads.get({
          userId: "me",
          id: threadId,
          auth: account.auth,
        });
        threadData = response.data;
      } else if (provider === "outlook") {
        // Fetch all messages in conversation
        const response = await this.outlookAPI
          .api(`/me/messages?$filter=conversationId eq '${threadId}'&$orderby=receivedDateTime asc`)
          .get();

        threadData = {
          conversationId: threadId,
          messages: response.value || [],
        };
      }

      // Cache the result
      this.threadCache.set(cacheKey, threadData);

      // Return enhanced or standard thread based on preference
      if (useEnhancedUnification) {
        return EnhancedEmailIntegrationService.unifyEnhancedThread(threadData, provider);
      }
      return EnhancedEmailUnificationService.unifyThread(threadData, provider);
    } catch (error) {
      console.error("Error fetching thread:", error);
      throw new Error(`Failed to fetch thread: ${error.message}`);
    }
  }

  // ENHANCED DIRECT EMAIL FUNCTIONALITY
  async sendEmail(accountId: string, emailData: any, useEnhancedUnification = true) {
    try {
      const account = await this.getAccountById(accountId);

      if (account.provider === "gmail") {
        return await this.sendGmailEmail(account, emailData, useEnhancedUnification);
      } else if (account.provider === "outlook") {
        return await this.sendOutlookEmail(account, emailData, useEnhancedUnification);
      }
    } catch (error) {
      console.error("Error sending email:", error);
      throw new Error(`Failed to send email: ${error.message}`);
    }
  }

  async sendGmailEmail(account: any, emailData: any, useEnhancedUnification = true) {
    let draftData;
    
    if (useEnhancedUnification) {
      draftData = EnhancedEmailIntegrationService.createEnhancedDraftEmail(emailData, "gmail");
    } else {
      draftData = EnhancedEmailUnificationService.createDraftEmail(emailData, "gmail");
    }

    const response = await this.gmailAPI.users.messages.send({
      userId: "me",
      requestBody: draftData,
      auth: account.auth,
    });

    return {
      success: true,
      messageId: response.data.id,
      threadId: response.data.threadId,
      provider: "gmail",
      enhancedFeatures: useEnhancedUnification,
    };
  }

  async sendOutlookEmail(account: any, emailData: any, useEnhancedUnification = true) {
    let draftData;
    
    if (useEnhancedUnification) {
      draftData = EnhancedEmailIntegrationService.createEnhancedDraftEmail(emailData, "outlook");
    } else {
      draftData = EnhancedEmailUnificationService.createDraftEmail(emailData, "outlook");
    }

    const response = await this.outlookAPI.api("/me/sendMail").post({
      message: draftData,
    });

    return {
      success: true,
      messageId: response.id,
      provider: "outlook",
      enhancedFeatures: useEnhancedUnification,
    };
  }

  // ENHANCED REPLY FUNCTIONALITY
  async replyToEmail(accountId: string, originalEmailId: string, replyData: any, useEnhancedUnification = true) {
    try {
      const account = await this.getAccountById(accountId);
      
      // Get the original email to extract threading information
      const originalEmail = await this.getEmailById(accountId, originalEmailId);
      if (!originalEmail) {
        throw new Error("Original email not found");
      }

      let replyEmailData;
      
      if (useEnhancedUnification) {
        replyEmailData = EnhancedEmailIntegrationService.createReplyEmail(
          originalEmail, 
          replyData, 
          account.provider
        );
      } else {
        // Fallback to basic reply
        replyEmailData = {
          ...replyData,
          threadId: originalEmail.threadId,
          inReplyTo: originalEmail.messageId,
        };
      }

      return await this.sendEmail(accountId, replyEmailData, useEnhancedUnification);
    } catch (error) {
      console.error("Error replying to email:", error);
      throw new Error(`Failed to reply to email: ${error.message}`);
    }
  }

  // ENHANCED SYNC STATUS MANAGEMENT
  updateEnhancedSyncStatus(accountId: string, syncData: any) {
    const currentStatus = this.syncStatus.get(accountId) || {};
    this.syncStatus.set(accountId, {
      ...currentStatus,
      ...syncData,
      lastUpdated: new Date().toISOString(),
      syncHistory: [
        ...(currentStatus.syncHistory || []),
        {
          timestamp: new Date().toISOString(),
          ...syncData,
        },
      ].slice(-10), // Keep last 10 sync records
    });
  }

  getEnhancedSyncStatus(accountId: string) {
    return (
      this.syncStatus.get(accountId) || {
        lastSync: null,
        category: null,
        emailCount: 0,
        hasMore: false,
        lastUpdated: null,
        syncMode: "incremental",
        conflictsResolved: 0,
        syncHistory: [],
      }
    );
  }

  getLastSyncTime(accountId: string, category: string) {
    const status = this.getEnhancedSyncStatus(accountId);
    return status.category === category ? status.lastSync : null;
  }

  // CONFLICT RESOLUTION
  resolveEmailConflicts(unifiedEmail: any, accountId: string) {
    const cacheKey = `${accountId}_${unifiedEmail.messageId}`;
    const existingEmail = this.conflictResolutionCache.get(cacheKey);
    
    if (!existingEmail) {
      // First time seeing this email, cache it
      this.conflictResolutionCache.set(cacheKey, unifiedEmail);
      return { email: unifiedEmail, resolved: false };
    }

    // Check for conflicts
    const conflicts = EnhancedEmailIntegrationService.detectConflict(
      unifiedEmail, 
      existingEmail, 
      unifiedEmail.providerData.provider
    );

    if (conflicts && conflicts.length > 0) {
      // Resolve conflicts using "newer wins" strategy
      const resolvedEmail = { ...unifiedEmail };
      
      conflicts.forEach((conflict: any) => {
        if (conflict.resolution === "newer_wins") {
          resolvedEmail[conflict.field] = conflict.newValue;
        } else if (conflict.resolution === "merge") {
          // Merge arrays (e.g., labels)
          if (Array.isArray(conflict.oldValue) && Array.isArray(conflict.newValue)) {
            resolvedEmail[conflict.field] = [...new Set([...conflict.oldValue, ...conflict.newValue])];
          }
        }
      });

      // Update cache with resolved email
      this.conflictResolutionCache.set(cacheKey, resolvedEmail);
      
      return { 
        email: resolvedEmail, 
        resolved: true, 
        conflicts: conflicts 
      };
    }

    return { email: unifiedEmail, resolved: false };
  }

  // ENHANCED INCREMENTAL SYNC
  async performEnhancedIncrementalSync(accountId: string, category = "inbox") {
    try {
      const account = await this.getAccountById(accountId);
      const lastSyncTime = this.getLastSyncTime(accountId, category);

      if (!lastSyncTime) {
        // First sync - fetch recent emails
        return await this.fetchEmailsForAccount(accountId, {
          category,
          maxResults: 100,
          syncMode: "full",
          useEnhancedUnification: true,
        });
      }

      // Enhanced incremental sync based on provider
      if (account.provider === "gmail") {
        return await this.performGmailEnhancedIncrementalSync(account, category, lastSyncTime);
      } else if (account.provider === "outlook") {
        return await this.performOutlookEnhancedIncrementalSync(account, category, lastSyncTime);
      }
    } catch (error) {
      console.error("Enhanced incremental sync error:", error);
      throw error;
    }
  }

  async performGmailEnhancedIncrementalSync(account: any, category: string, lastSyncTime: string) {
    // Use Gmail's history API for efficient incremental sync
    const syncStatus = this.getEnhancedSyncStatus(account.id);
    const startHistoryId = syncStatus.historyId;

    if (!startHistoryId) {
      // Fallback to regular sync
      return await this.fetchEmailsForAccount(account.id, {
        category,
        maxResults: 50,
        syncMode: "incremental",
        useEnhancedUnification: true,
      });
    }

    const response = await this.gmailAPI.users.history.list({
      userId: "me",
      startHistoryId: startHistoryId,
      auth: account.auth,
    });

    const history = response.data.history || [];
    const changedEmails = [];
    let conflictsResolved = 0;

    // Process history changes with enhanced conflict resolution
    history.forEach((historyItem: any) => {
      if (historyItem.messagesAdded) {
        historyItem.messagesAdded.forEach((msg: any) => {
          changedEmails.push({ id: msg.message.id, action: "added" });
        });
      }
      if (historyItem.messagesDeleted) {
        historyItem.messagesDeleted.forEach((msg: any) => {
          changedEmails.push({ id: msg.message.id, action: "deleted" });
        });
      }
      if (historyItem.labelsAdded || historyItem.labelsRemoved) {
        // Handle label changes
        const messages = historyItem.messages || [];
        messages.forEach((msg: any) => {
          changedEmails.push({ id: msg.id, action: "updated" });
        });
      }
    });

    // Update sync status with new history ID
    this.updateEnhancedSyncStatus(account.id, {
      historyId: response.data.historyId,
      lastSync: new Date().toISOString(),
      conflictsResolved,
    });

    return {
      success: true,
      changedEmails,
      historyId: response.data.historyId,
      provider: "gmail",
      conflictsResolved,
    };
  }

  async performOutlookEnhancedIncrementalSync(account: any, category: string, lastSyncTime: string) {
    // Use delta queries for incremental sync
    const deltaUrl = `/me/mailFolders/${this.getOutlookFolderId(category)}/messages/delta`;

    try {
      const response = await this.outlookAPI.api(deltaUrl).get();
      const changes = response.value || [];

      const changedEmails = changes.map((email: any) => ({
        id: email.id,
        action: email["@removed"] ? "deleted" : "updated",
        email: email["@removed"] ? null : EnhancedEmailUnificationService.unifyEmail(email, "outlook", category),
      }));

      return {
        success: true,
        changedEmails,
        deltaLink: response["@odata.deltaLink"],
        provider: "outlook",
      };
    } catch (error) {
      // Fallback to regular sync if delta fails
      return await this.fetchEmailsForAccount(account.id, {
        category,
        maxResults: 50,
        syncMode: "incremental",
        useEnhancedUnification: true,
      });
    }
  }

  // HELPER METHODS
  buildGmailQuery(category: string) {
    const queryMap: { [key: string]: string } = {
      inbox: "in:inbox",
      sent: "in:sent",
      drafts: "in:drafts",
      trash: "in:trash",
      spam: "in:spam",
      all: "",
      unread: "is:unread",
      important: "is:important",
      starred: "is:starred",
    };

    return queryMap[category] || "in:inbox";
  }

  getGmailLabelIds(category: string) {
    const labelMap: { [key: string]: string[] | null } = {
      inbox: ["INBOX"],
      sent: ["SENT"],
      drafts: ["DRAFT"],
      trash: ["TRASH"],
      spam: ["SPAM"],
      unread: ["UNREAD"],
      important: ["IMPORTANT"],
      starred: ["STARRED"],
      all: null,
    };

    return labelMap[category] || ["INBOX"];
  }

  getOutlookFolderId(category: string) {
    const folderMap: { [key: string]: string } = {
      inbox: "inbox",
      sent: "sentitems",
      drafts: "drafts",
      trash: "deleteditems",
      spam: "junkemail",
      all: "inbox", // Default to inbox for 'all'
    };

    return folderMap[category] || "inbox";
  }

  getCategoryFromLabels(labelIds: string[]) {
    if (!labelIds) return "other";

    if (labelIds.includes("INBOX")) return "inbox";
    if (labelIds.includes("SENT")) return "sent";
    if (labelIds.includes("DRAFT")) return "drafts";
    if (labelIds.includes("TRASH")) return "trash";
    if (labelIds.includes("SPAM")) return "spam";

    return "other";
  }

  extractConversationParticipants(emails: any[]) {
    const participants = new Map();

    emails.forEach((email: any) => {
      // Add sender
      if (email.from && email.from.email) {
        participants.set(email.from.email, email.from);
      }

      // Add recipients
      [...(email.to || []), ...(email.cc || []), ...(email.bcc || [])].forEach((recipient: any) => {
        if (recipient.email) {
          participants.set(recipient.email, recipient);
        }
      });
    });

    return Array.from(participants.values());
  }

  // DATABASE METHODS (implement based on your DB)
  async getAccountById(accountId: string) {
    // Implement your database query here
    // This should return account with auth tokens
    throw new Error("Database method not implemented");
  }

  async getEmailById(accountId: string, emailId: string) {
    // Implement your database query here
    // This should return email by ID
    throw new Error("Database method not implemented");
  }

  // API INITIALIZATION METHODS
  initializeGmailAPI(auth: any) {
    // Initialize Gmail API client
    // Return configured Gmail API instance
  }

  initializeOutlookAPI(auth: any) {
    // Initialize Microsoft Graph API client
    // Return configured Graph API instance
  }
}

module.exports = EnhancedEmailServiceNew;
