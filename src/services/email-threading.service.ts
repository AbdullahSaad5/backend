import { EmailModel, IEmail } from "@/models/email.model";
import { EmailThreadModel, IEmailThread } from "@/models/email-thread.model";
import { logger } from "@/utils/logger.util";

export interface ThreadMatchResult {
  threadId: string;
  confidence: number; // 0-1, where 1 is perfect match
  matchType: "exact" | "subject_sender" | "references" | "in_reply_to" | "new";
  existingThread?: IEmailThread;
}

export class EmailThreadingService {
  /**
   * Find or create the appropriate thread for an email
   * This follows real email system standards (Gmail, Outlook, etc.)
   */
  static async findOrCreateThread(email: IEmail): Promise<string> {
    try {
      // Priority 1: Use provider's native thread ID (Gmail threadId, Outlook conversationId)
      if (email.threadId) {
        const existingThread = await EmailThreadModel.findOne({
          threadId: email.threadId,
          accountId: email.accountId,
        });

        if (existingThread) {
          await this.updateThread(existingThread, email);
          return existingThread.threadId;
        }
      }

      // Priority 2: Check References header chain
      if (email.references && email.references.length > 0) {
        const threadMatch = await this.findThreadByReferences(email);
        if (threadMatch) {
          await this.updateThread(threadMatch.existingThread!, email);
          return threadMatch.threadId;
        }
      }

      // Priority 3: Check In-Reply-To header
      if (email.inReplyTo) {
        const threadMatch = await this.findThreadByInReplyTo(email);
        if (threadMatch) {
          await this.updateThread(threadMatch.existingThread!, email);
          return threadMatch.threadId;
        }
      }

      // Priority 4: Try to find thread by subject + sender (common in email clients)
      const subjectMatch = await this.findThreadBySubjectAndSender(email);
      if (subjectMatch && subjectMatch.confidence > 0.8) {
        await this.updateThread(subjectMatch.existingThread!, email);
        return subjectMatch.threadId;
      }

      // Priority 5: Create new thread
      return await this.createNewThread(email);
    } catch (error: any) {
      logger.error("Error in findOrCreateThread:", error);
      // Fallback: create new thread
      return await this.createNewThread(email);
    }
  }

  /**
   * Find thread by References header chain
   */
  private static async findThreadByReferences(email: IEmail): Promise<ThreadMatchResult | null> {
    if (!email.references || email.references.length === 0) return null;

    // Check if any of the referenced message IDs exist in our database
    for (const refMessageId of email.references) {
      const referencedEmail = await EmailModel.findOne({
        messageId: refMessageId,
        accountId: email.accountId,
      });

      if (referencedEmail && referencedEmail.threadId) {
        const thread = await EmailThreadModel.findOne({
          threadId: referencedEmail.threadId,
          accountId: email.accountId,
        });

        if (thread) {
          return {
            threadId: thread.threadId,
            confidence: 0.95,
            matchType: "references",
            existingThread: thread,
          };
        }
      }
    }

    return null;
  }

  /**
   * Find thread by In-Reply-To header
   */
  private static async findThreadByInReplyTo(email: IEmail): Promise<ThreadMatchResult | null> {
    if (!email.inReplyTo) return null;

    const parentEmail = await EmailModel.findOne({
      messageId: email.inReplyTo,
      accountId: email.accountId,
    });

    if (parentEmail && parentEmail.threadId) {
      const thread = await EmailThreadModel.findOne({
        threadId: parentEmail.threadId,
        accountId: email.accountId,
      });

      if (thread) {
        return {
          threadId: thread.threadId,
          confidence: 0.9,
          matchType: "in_reply_to",
          existingThread: thread,
        };
      }
    }

    return null;
  }

  /**
   * Find thread by normalized subject and sender
   * This is a fallback method used by many email clients
   */
  private static async findThreadBySubjectAndSender(email: IEmail): Promise<ThreadMatchResult | null> {
    const normalizedSubject = this.normalizeSubject(email.subject);

    // Look for threads with similar subject and from the same sender
    const potentialThreads = await EmailThreadModel.find({
      accountId: email.accountId,
      normalizedSubject: normalizedSubject,
      "participants.email": email.from.email,
    }).sort({ lastMessageAt: -1 });

    if (potentialThreads.length === 0) return null;

    // Check if any of these threads have recent activity (within 30 days)
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const recentThreads = potentialThreads.filter((t) => t.lastMessageAt > thirtyDaysAgo);

    if (recentThreads.length > 0) {
      const bestMatch = recentThreads[0];
      return {
        threadId: bestMatch.threadId,
        confidence: 0.8,
        matchType: "subject_sender",
        existingThread: bestMatch,
      };
    }

    return null;
  }

  /**
   * Create a new thread for an email
   */
  private static async createNewThread(email: IEmail): Promise<string> {
    const normalizedSubject = this.normalizeSubject(email.subject);

    // Generate a unique thread ID
    const threadId = email.threadId || `thread_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Collect all participants
    const participants = [email.from];
    if (email.to) participants.push(...email.to);
    if (email.cc) participants.push(...email.cc);

    // Remove duplicates
    const uniqueParticipants = participants.filter(
      (p, index, self) => index === self.findIndex((participant) => participant.email === p.email)
    );

    // Create new thread
    const thread = new EmailThreadModel({
      threadId,
      accountId: email.accountId,
      subject: email.subject,
      normalizedSubject,
      participants: uniqueParticipants,
      messageCount: 1,
      unreadCount: email.isRead ? 0 : 1,
      firstMessageAt: email.receivedAt,
      lastMessageAt: email.receivedAt,
      lastActivity: email.receivedAt,
      status: "active",
      folder: email.folder || "INBOX",
      threadType: this.determineThreadType(email),
      hasAttachments: email.attachments && email.attachments.length > 0,
      totalSize: (email.textContent?.length || 0) + (email.htmlContent?.length || 0),
    });

    await thread.save();
    logger.info(`Created new thread ${threadId} for email ${email.messageId}`);

    return threadId;
  }

  /**
   * Update existing thread with new email
   */
  private static async updateThread(thread: IEmailThread, email: IEmail): Promise<void> {
    // Update thread metadata
    thread.messageCount += 1;
    if (!email.isRead) thread.unreadCount += 1;
    thread.lastMessageAt = email.receivedAt;
    thread.lastActivity = email.receivedAt;

    // Update participants if new ones
    const newParticipants = [email.from];
    if (email.to) newParticipants.push(...email.to);
    if (email.cc) newParticipants.push(...email.cc);

    newParticipants.forEach((participant) => {
      if (!thread.participants.some((p: any) => p.email === participant.email)) {
        thread.participants.push(participant);
      }
    });

    // Update thread statistics
    if (email.attachments && email.attachments.length > 0) {
      thread.hasAttachments = true;
    }
    thread.totalSize = (thread.totalSize || 0) + (email.textContent?.length || 0) + (email.htmlContent?.length || 0);

    await EmailThreadModel.findByIdAndUpdate(thread.id, thread);
    logger.debug(`Updated thread ${thread.threadId} with email ${email.messageId}`);
  }

  /**
   * Normalize email subject by removing common prefixes
   */
  private static normalizeSubject(subject: string): string {
    return subject
      .replace(/^(Re:|Fwd?:|RE:|FWD?:|FW:|fw:)\s*/gi, "") // Remove Re:/Fwd: prefixes
      .replace(/^\[.*?\]\s*/g, "") // Remove [tag] prefixes
      .trim()
      .toLowerCase();
  }

  /**
   * Determine thread type based on email content and metadata
   */
  private static determineThreadType(email: IEmail): "conversation" | "notification" | "marketing" | "system" {
    const subject = email.subject.toLowerCase();
    const content = (email.textContent || email.htmlContent || "").toLowerCase();

    // Check for marketing indicators
    if (
      subject.includes("newsletter") ||
      subject.includes("promotion") ||
      subject.includes("offer") ||
      subject.includes("sale") ||
      content.includes("unsubscribe") ||
      content.includes("marketing")
    ) {
      return "marketing";
    }

    // Check for system notifications
    if (
      subject.includes("notification") ||
      subject.includes("alert") ||
      subject.includes("system") ||
      subject.includes("update")
    ) {
      return "system";
    }

    // Check for order/transaction notifications
    if (
      email.amazonOrderId ||
      email.ebayItemId ||
      subject.includes("order") ||
      subject.includes("confirmation") ||
      subject.includes("receipt") ||
      subject.includes("invoice")
    ) {
      return "notification";
    }

    // Default to conversation
    return "conversation";
  }

  /**
   * Get thread statistics for an account
   */
  static async getThreadStats(accountId: string): Promise<{
    totalThreads: number;
    unreadThreads: number;
    threadsByType: Record<string, number>;
    threadsByStatus: Record<string, number>;
  }> {
    const stats = await EmailThreadModel.aggregate([
      { $match: { accountId: accountId } },
      {
        $group: {
          _id: null,
          totalThreads: { $sum: 1 },
          unreadThreads: { $sum: { $cond: [{ $gt: ["$unreadCount", 0] }, 1, 0] } },
          threadsByType: { $push: "$threadType" },
          threadsByStatus: { $push: "$status" },
        },
      },
    ]);

    if (stats.length === 0) {
      return {
        totalThreads: 0,
        unreadThreads: 0,
        threadsByType: {},
        threadsByStatus: {},
      };
    }

    const stat = stats[0];
    const threadsByType = stat.threadsByType.reduce((acc: any, type: string) => {
      acc[type] = (acc[type] || 0) + 1;
      return acc;
    }, {});

    const threadsByStatus = stat.threadsByStatus.reduce((acc: any, status: string) => {
      acc[status] = (acc[status] || 0) + 1;
      return acc;
    }, {});

    return {
      totalThreads: stat.totalThreads,
      unreadThreads: stat.unreadThreads,
      threadsByType,
      threadsByStatus,
    };
  }

  /**
   * Clean up orphaned threads (threads with no emails)
   */
  static async cleanupOrphanedThreads(accountId: string): Promise<number> {
    const orphanedThreads = await EmailThreadModel.aggregate([
      { $match: { accountId: accountId } },
      {
        $lookup: {
          from: "emails",
          localField: "threadId",
          foreignField: "threadId",
          as: "emails",
        },
      },
      { $match: { emails: { $size: 0 } } },
      { $project: { _id: 1 } },
    ]);

    if (orphanedThreads.length > 0) {
      const threadIds = orphanedThreads.map((t) => t._id);
      await EmailThreadModel.deleteMany({ _id: { $in: threadIds } });
      logger.info(`Cleaned up ${orphanedThreads.length} orphaned threads for account ${accountId}`);
    }

    return orphanedThreads.length;
  }
}
