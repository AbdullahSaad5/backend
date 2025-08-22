// Enhanced Email API Controller - New Implementation
// Handles all email operations with threading, categorization, and sync

const EnhancedEmailServiceNew = require("../services/enhancedEmailNew.service");
const emailService = new EnhancedEmailServiceNew();

class EnhancedEmailControllerNew {
  // GET /api/emails/:accountId - Fetch emails with advanced filtering
  static async getEmails(req: any, res: any) {
    try {
      const { accountId } = req.params;
      const {
        category = "inbox",
        maxResults = 50,
        pageToken = null,
        includeThreads = "true",
        syncMode = "incremental",
        search = null,
        useEnhancedUnification = "true", // New enhanced feature flag
      } = req.query;

      // Validate parameters
      const validCategories = ["inbox", "sent", "drafts", "trash", "spam", "all", "unread", "important", "starred"];
      if (!validCategories.includes(category)) {
        return res.status(400).json({
          success: false,
          error: "Invalid category. Must be one of: " + validCategories.join(", "),
        });
      }

      const options = {
        category,
        maxResults: parseInt(maxResults),
        pageToken,
        includeThreads: includeThreads === "true",
        syncMode,
        search,
        useEnhancedUnification: useEnhancedUnification === "true",
      };

      const result = await emailService.fetchEmailsForAccount(accountId, options);

      if (result.success) {
        res.json({
          success: true,
          emails: result.emails,
          threads: result.threads || [],
          pagination: {
            nextPageToken: result.nextPageToken,
            hasMore: result.hasMore,
            totalResults: result.totalResults,
          },
          metadata: {
            provider: result.provider,
            account: result.account,
            category: category,
            syncStatus: result.syncStatus,
            enhancedFeatures: result.enhancedFeatures,
            conflictsResolved: result.conflictsResolved || 0,
          },
        });
      } else {
        res.status(500).json({
          success: false,
          error: result.error,
          syncStatus: result.syncStatus,
        });
      }
    } catch (error: any) {
      console.error("Controller error - getEmails:", error);
      res.status(500).json({
        success: false,
        error: "Internal server error",
      });
    }
  }

  // GET /api/emails/:accountId/categories/:category - Get emails by specific category
  static async getEmailsByCategory(req: any, res: any) {
    try {
      const { accountId, category } = req.params;
      const {
        maxResults = 50,
        pageToken = null,
        includeThreads = "true",
        unreadOnly = "false",
        useEnhancedUnification = "true",
      } = req.query;

      let finalCategory = category;

      // Handle special filters
      if (unreadOnly === "true") {
        finalCategory = category === "inbox" ? "unread" : category;
      }

      const options = {
        category: finalCategory,
        maxResults: parseInt(maxResults),
        pageToken,
        includeThreads: includeThreads === "true",
        useEnhancedUnification: useEnhancedUnification === "true",
      };

      const result = await emailService.fetchEmailsForAccount(accountId, options);

      res.json({
        success: result.success,
        emails: result.emails || [],
        threads: result.threads || [],
        category: finalCategory,
        pagination: {
          nextPageToken: result.nextPageToken,
          hasMore: result.hasMore,
        },
        metadata: {
          provider: result.provider,
          account: result.account,
          syncStatus: result.syncStatus,
          enhancedFeatures: result.enhancedFeatures,
          conflictsResolved: result.conflictsResolved || 0,
        },
        error: result.error,
      });
    } catch (error: any) {
      console.error("Controller error - getEmailsByCategory:", error);
      res.status(500).json({
        success: false,
        error: "Internal server error",
      });
    }
  }

  // GET /api/threads/:accountId/:threadId - Get specific thread with all messages
  static async getThread(req: any, res: any) {
    try {
      const { accountId, threadId } = req.params;
      const { provider, useEnhancedUnification = "true" } = req.query;

      if (!provider) {
        return res.status(400).json({
          success: false,
          error: "Provider parameter is required",
        });
      }

      const thread = await emailService.fetchThreadById(
        accountId,
        threadId,
        provider,
        useEnhancedUnification === "true"
      );

      res.json({
        success: true,
        thread: thread,
        messageCount: thread.messageCount,
        provider: provider,
        enhancedFeatures: useEnhancedUnification === "true",
        // Include enhanced metadata if available
        ...(thread.conversationMetadata && {
          conversationMetadata: thread.conversationMetadata,
        }),
        ...(thread.enhancedSyncStatus && {
          enhancedSyncStatus: thread.enhancedSyncStatus,
        }),
        ...(thread.analytics && {
          analytics: thread.analytics,
        }),
      });
    } catch (error: any) {
      console.error("Controller error - getThread:", error);
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  }

  // POST /api/emails/:accountId/send - Send new email
  static async sendEmail(req: any, res: any) {
    try {
      const { accountId } = req.params;
      const { useEnhancedUnification = true, ...emailData } = req.body;

      // Validate required fields
      const required = ["to", "subject"];
      const missing = required.filter((field) => !emailData[field]);

      if (missing.length > 0) {
        return res.status(400).json({
          success: false,
          error: `Missing required fields: ${missing.join(", ")}`,
        });
      }

      // Validate email addresses
      const allRecipients = [...(emailData.to || []), ...(emailData.cc || []), ...(emailData.bcc || [])];

      const invalidEmails = allRecipients.filter((addr) => !addr.email || !this.isValidEmail(addr.email));

      if (invalidEmails.length > 0) {
        return res.status(400).json({
          success: false,
          error: "Invalid email addresses found",
        });
      }

      const result = await emailService.sendEmail(accountId, emailData, useEnhancedUnification);

      res.json({
        success: result.success,
        messageId: result.messageId,
        threadId: result.threadId,
        provider: result.provider,
        enhancedFeatures: result.enhancedFeatures,
      });
    } catch (error: any) {
      console.error("Controller error - sendEmail:", error);
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  }

  // POST /api/emails/:accountId/reply - Reply to email with enhanced threading
  static async replyToEmail(req: any, res: any) {
    try {
      const { accountId } = req.params;
      const { originalEmailId, threadId, provider, useEnhancedUnification = true, ...replyData } = req.body;

      if (!originalEmailId || !threadId || !provider) {
        return res.status(400).json({
          success: false,
          error: "originalEmailId, threadId, and provider are required",
        });
      }

      const result = await emailService.replyToEmail(accountId, originalEmailId, replyData, useEnhancedUnification);

      res.json({
        success: result.success,
        messageId: result.messageId,
        threadId: result.threadId,
        provider: result.provider,
        action: "reply",
        enhancedFeatures: result.enhancedFeatures,
      });
    } catch (error: any) {
      console.error("Controller error - replyToEmail:", error);
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  }

  // POST /api/emails/:accountId/forward - Forward email with enhanced features
  static async forwardEmail(req: any, res: any) {
    try {
      const { accountId } = req.params;
      const { originalEmailId, to, subject, body, useEnhancedUnification = true } = req.body;

      if (!originalEmailId || !to || !subject) {
        return res.status(400).json({
          success: false,
          error: "originalEmailId, to, and subject are required",
        });
      }

      // Get the original email to extract content and attachments
      const originalEmail = await emailService.getEmailById(accountId, originalEmailId);
      if (!originalEmail) {
        return res.status(404).json({
          success: false,
          error: "Original email not found",
        });
      }

      // Create forward email data
      const forwardData = {
        to: Array.isArray(to) ? to : [to],
        subject: `Fwd: ${originalEmail.subject}`,
        body:
          body ||
          `\n\n--- Forwarded message ---\nFrom: ${originalEmail.from?.name || originalEmail.from?.email}\nDate: ${originalEmail.receivedDate}\nSubject: ${originalEmail.subject}\n\n${originalEmail.bodyText || originalEmail.bodyHtml || ""}`,
        attachments: originalEmail.attachments || [],
        threadId: originalEmail.threadId,
        inReplyTo: originalEmail.messageId,
        references: originalEmail.references || [],
      };

      const result = await emailService.sendEmail(accountId, forwardData, useEnhancedUnification);

      res.json({
        success: result.success,
        messageId: result.messageId,
        threadId: result.threadId,
        provider: result.provider,
        action: "forward",
        enhancedFeatures: result.enhancedFeatures,
      });
    } catch (error: any) {
      console.error("Controller error - forwardEmail:", error);
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  }

  // POST /api/emails/:accountId/sync - Manual sync trigger with enhanced features
  static async syncEmails(req: any, res: any) {
    try {
      const { accountId } = req.params;
      const { category = "inbox", fullSync = false, useEnhancedUnification = true } = req.body;

      const syncMode = fullSync ? "full" : "incremental";

      const result = await emailService.performEnhancedIncrementalSync(accountId, category);

      res.json({
        success: result.success,
        syncMode: syncMode,
        changedEmails: result.changedEmails || [],
        provider: result.provider,
        conflictsResolved: result.conflictsResolved || 0,
        metadata: {
          category: category,
          syncTime: new Date().toISOString(),
          enhancedFeatures: useEnhancedUnification,
        },
      });
    } catch (error: any) {
      console.error("Controller error - syncEmails:", error);
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  }

  // GET /api/emails/:accountId/sync-status - Get enhanced sync status
  static async getSyncStatus(req: any, res: any) {
    try {
      const { accountId } = req.params;

      const syncStatus = emailService.getEnhancedSyncStatus(accountId);

      res.json({
        success: true,
        syncStatus: syncStatus,
        accountId: accountId,
        enhancedFeatures: true,
      });
    } catch (error: any) {
      console.error("Controller error - getSyncStatus:", error);
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  }

  // GET /api/emails/:accountId/stats - Get email statistics with enhanced analytics
  static async getEmailStats(req: any, res: any) {
    try {
      const { accountId } = req.params;
      const { useEnhancedUnification = "true" } = req.query;

      // Fetch stats for all categories
      const categories = ["inbox", "sent", "drafts", "unread"];
      const statsPromises = categories.map(async (category) => {
        const result = await emailService.fetchEmailsForAccount(accountId, {
          category,
          maxResults: 1,
          includeThreads: false,
          useEnhancedUnification: useEnhancedUnification === "true",
        });

        return {
          category,
          count: result.totalResults || 0,
          hasMore: result.hasMore,
          conflictsResolved: result.conflictsResolved || 0,
        };
      });

      const stats = await Promise.all(statsPromises);

      res.json({
        success: true,
        stats: stats.reduce((acc, stat) => {
          acc[stat.category] = {
            count: stat.count,
            hasMore: stat.hasMore,
            conflictsResolved: stat.conflictsResolved,
          };
          return acc;
        }, {}),
        accountId: accountId,
        generatedAt: new Date().toISOString(),
        enhancedFeatures: useEnhancedUnification === "true",
      });
    } catch (error: any) {
      console.error("Controller error - getEmailStats:", error);
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  }

  // PUT /api/emails/:accountId/:emailId/mark-read - Mark email as read/unread
  static async markEmailRead(req: any, res: any) {
    try {
      const { accountId, emailId } = req.params;
      const { isRead = true, provider, useEnhancedUnification = true } = req.body;

      if (!provider) {
        return res.status(400).json({
          success: false,
          error: "Provider parameter is required",
        });
      }

      // This would need implementation in the service layer
      // For now, return a placeholder response
      res.json({
        success: true,
        emailId: emailId,
        isRead: isRead,
        provider: provider,
        enhancedFeatures: useEnhancedUnification,
        message: "Read status update functionality needs implementation in service layer",
      });
    } catch (error: any) {
      console.error("Controller error - markEmailRead:", error);
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  }

  // DELETE /api/emails/:accountId/:emailId - Delete email
  static async deleteEmail(req: any, res: any) {
    try {
      const { accountId, emailId } = req.params;
      const { provider, useEnhancedUnification = "true" } = req.query;

      if (!provider) {
        return res.status(400).json({
          success: false,
          error: "Provider parameter is required",
        });
      }

      // This would need implementation in the service layer
      res.json({
        success: true,
        emailId: emailId,
        provider: provider,
        enhancedFeatures: useEnhancedUnification === "true",
        message: "Email deletion functionality needs implementation in service layer",
      });
    } catch (error: any) {
      console.error("Controller error - deleteEmail:", error);
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  }

  // GET /api/emails/:accountId/search - Search emails with enhanced features
  static async searchEmails(req: any, res: any) {
    try {
      const { accountId } = req.params;
      const {
        query = "",
        category = "all",
        maxResults = 25,
        pageToken = null,
        useEnhancedUnification = "true",
      } = req.query;

      if (!query.trim()) {
        return res.status(400).json({
          success: false,
          error: "Search query is required",
        });
      }

      const options = {
        category,
        maxResults: parseInt(maxResults),
        pageToken,
        includeThreads: false,
        search: query,
        useEnhancedUnification: useEnhancedUnification === "true",
      };

      const result = await emailService.fetchEmailsForAccount(accountId, options);

      res.json({
        success: result.success,
        emails: result.emails || [],
        query: query,
        category: category,
        pagination: {
          nextPageToken: result.nextPageToken,
          hasMore: result.hasMore,
          totalResults: result.totalResults,
        },
        metadata: {
          provider: result.provider,
          searchTime: new Date().toISOString(),
          enhancedFeatures: result.enhancedFeatures,
          conflictsResolved: result.conflictsResolved || 0,
        },
        error: result.error,
      });
    } catch (error: any) {
      console.error("Controller error - searchEmails:", error);
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  }

  // NEW ENHANCED ENDPOINTS

  // GET /api/emails/:accountId/threads - Get all threads with enhanced metadata
  static async getAllThreads(req: any, res: any) {
    try {
      const { accountId } = req.params;
      const { category = "inbox", maxResults = 50, pageToken = null, useEnhancedUnification = "true" } = req.query;

      const options = {
        category,
        maxResults: parseInt(maxResults),
        pageToken,
        includeThreads: true,
        useEnhancedUnification: useEnhancedUnification === "true",
      };

      const result = await emailService.fetchEmailsForAccount(accountId, options);

      res.json({
        success: result.success,
        threads: result.threads || [],
        category: category,
        pagination: {
          nextPageToken: result.nextPageToken,
          hasMore: result.hasMore,
          totalResults: result.totalResults,
        },
        metadata: {
          provider: result.provider,
          account: result.account,
          syncStatus: result.syncStatus,
          enhancedFeatures: result.enhancedFeatures,
          conflictsResolved: result.conflictsResolved || 0,
        },
        error: result.error,
      });
    } catch (error: any) {
      console.error("Controller error - getAllThreads:", error);
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  }

  // GET /api/emails/:accountId/analytics - Get email analytics and insights
  static async getEmailAnalytics(req: any, res: any) {
    try {
      const { accountId } = req.params;
      const { useEnhancedUnification = "true" } = req.query;

      // Get enhanced sync status for analytics
      const syncStatus = emailService.getEnhancedSyncStatus(accountId);

      // Calculate basic analytics
      const analytics = {
        totalEmails: syncStatus.emailCount || 0,
        lastSync: syncStatus.lastSync,
        syncMode: syncStatus.syncMode,
        conflictsResolved: syncStatus.conflictsResolved || 0,
        syncHistory: syncStatus.syncHistory || [],
        syncQuality: this.calculateSyncQuality(syncStatus),
        estimatedNextSync: this.estimateNextSync(syncStatus),
      };

      res.json({
        success: true,
        analytics: analytics,
        accountId: accountId,
        enhancedFeatures: useEnhancedUnification === "true",
        generatedAt: new Date().toISOString(),
      });
    } catch (error: any) {
      console.error("Controller error - getEmailAnalytics:", error);
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  }

  // POST /api/emails/:accountId/bulk-actions - Perform bulk actions on emails
  static async bulkEmailActions(req: any, res: any) {
    try {
      const { accountId } = req.params;
      const { action, emailIds, provider, useEnhancedUnification = true } = req.body;

      if (!action || !emailIds || !Array.isArray(emailIds) || !provider) {
        return res.status(400).json({
          success: false,
          error: "action, emailIds array, and provider are required",
        });
      }

      const validActions = ["mark-read", "mark-unread", "move-to-trash", "move-to-spam", "add-label", "remove-label"];
      if (!validActions.includes(action)) {
        return res.status(400).json({
          success: false,
          error: `Invalid action. Must be one of: ${validActions.join(", ")}`,
        });
      }

      // This would need implementation in the service layer
      // For now, return a placeholder response
      res.json({
        success: true,
        action: action,
        emailIds: emailIds,
        provider: provider,
        enhancedFeatures: useEnhancedUnification,
        message: "Bulk email actions functionality needs implementation in service layer",
        processedCount: emailIds.length,
      });
    } catch (error: any) {
      console.error("Controller error - bulkEmailActions:", error);
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  }

  // Helper methods for analytics
  static calculateSyncQuality(syncStatus: any): string {
    if (!syncStatus.lastSync) return "unknown";

    const lastSync = new Date(syncStatus.lastSync);
    const now = new Date();
    const hoursSinceSync = (now.getTime() - lastSync.getTime()) / (1000 * 60 * 60);

    if (hoursSinceSync < 1) return "excellent";
    if (hoursSinceSync < 6) return "good";
    if (hoursSinceSync < 24) return "fair";
    return "poor";
  }

  static estimateNextSync(syncStatus: any): string | null {
    if (!syncStatus.lastSync) return null;

    const lastSync = new Date(syncStatus.lastSync);
    const estimatedNext = new Date(lastSync.getTime() + 15 * 60 * 1000); // 15 minutes
    return estimatedNext.toISOString();
  }

  // Helper method to validate email addresses
  static isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }
}

module.exports = EnhancedEmailControllerNew;
