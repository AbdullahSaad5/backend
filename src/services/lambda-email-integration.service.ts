import { EmailModel } from "@/models/email.model";

import { logger } from "@/utils/logger.util";
import { IEmail, EmailDirection, EmailStatus } from "@/contracts/mailbox.contract";

export const LambdaEmailIntegrationService = {
  /**
   * Sync Lambda-processed emails with your existing BAVIT backend
   * This service can be called periodically or via webhook to ensure consistency
   */
  syncProcessedEmails: async (): Promise<{
    success: boolean;
    processed: number;
    errors: string[];
  }> => {
    const errors: string[] = [];
    let processed = 0;

    try {
      logger.info("Starting Lambda email sync process");

      // Find emails that were processed by Lambda but might need additional backend processing
      const lambdaProcessedEmails = await EmailModel.find({
        direction: EmailDirection.INBOUND,
        status: EmailStatus.RECEIVED,
        processedAt: { $exists: false }, // Not yet processed by backend
      }).limit(100); // Process in batches

      logger.info(`Found ${lambdaProcessedEmails.length} emails to sync`);

      for (const email of lambdaProcessedEmails) {
        try {
          // Apply your existing business logic
          await LambdaEmailIntegrationService.applyBusinessRules(email);

          // Update processing status
          email.processedAt = new Date();
          email.status = EmailStatus.PROCESSED;
          await email.save();

          processed++;
          logger.info(`Successfully processed email: ${email.messageId}`);
        } catch (emailError: any) {
          const errorMsg = `Failed to process email ${email.messageId}: ${emailError.message}`;
          errors.push(errorMsg);
          logger.error(errorMsg);
        }
      }

      logger.info(`Sync completed: ${processed} processed, ${errors.length} errors`);

      return {
        success: true,
        processed,
        errors,
      };
    } catch (error: any) {
      logger.error("Lambda email sync failed:", error);
      return {
        success: false,
        processed,
        errors: [...errors, error.message],
      };
    }
  },

  /**
   * Apply your existing business rules to Lambda-processed emails
   */
  applyBusinessRules: async (email: IEmail): Promise<void> => {
    try {
      // 1. Email Classification (similar to your existing logic)
      email.type = LambdaEmailIntegrationService.classifyEmail(email) as any;

      // 2. Priority Detection
      email.priority = LambdaEmailIntegrationService.determinePriority(email);

      // 3. Auto-assignment rules
      const assignedUser = await LambdaEmailIntegrationService.autoAssignEmail(email);
      if (assignedUser) {
        email.assignedTo = assignedUser;
        email.assignedAt = new Date();
      }

      // 4. Spam Detection
      const isSpam = await LambdaEmailIntegrationService.detectSpam(email);
      if (isSpam) {
        email.isSpam = true;
        email.status = EmailStatus.SPAM;
      }

      // 5. Extract Business Data (Amazon Orders, eBay items, etc.)
      await LambdaEmailIntegrationService.extractBusinessData(email);

      // 6. Apply Tags and Labels
      email.tags = LambdaEmailIntegrationService.generateTags(email);
      email.labels = LambdaEmailIntegrationService.generateLabels(email);

      // 7. Set category for frontend tabs
      email.category = LambdaEmailIntegrationService.determineEmailCategory(email);

      // 7. Ensure Thread Management (your existing logic)
      await LambdaEmailIntegrationService.ensureThreadConsistency(email);
    } catch (error: any) {
      logger.error(`Error applying business rules to email ${email.messageId}:`, error);
      throw error;
    }
  },

  /**
   * Classify email type (reuse your existing logic)
   */
  classifyEmail: (email: IEmail): string => {
    const subject = email.subject.toLowerCase();
    const fromEmail = email.from.email.toLowerCase();

    if (fromEmail.includes("amazon") || subject.includes("amazon")) {
      if (subject.includes("order") || subject.includes("purchase")) {
        return "amazon_order";
      }
      return "amazon_notification";
    }

    if (fromEmail.includes("ebay") || subject.includes("ebay")) {
      return "ebay_message";
    }

    if (subject.includes("support") || subject.includes("help")) {
      return "support";
    }

    return "general";
  },

  /**
   * Determine email priority
   */
  determinePriority: (email: IEmail): string => {
    const subject = email.subject.toLowerCase();

    if (subject.includes("urgent") || subject.includes("asap")) {
      return "urgent";
    }

    if (subject.includes("important")) {
      return "high";
    }

    return "normal";
  },

  /**
   * Auto-assign emails based on your business rules
   */
  autoAssignEmail: async (email: IEmail): Promise<any> => {
    // Implement your auto-assignment logic here
    // This could be based on sender domain, email type, etc.

    if (email.type === "amazon_order") {
      // Assign to Amazon team
      return null; // Return user ID or null
    }

    if (email.type === "support") {
      // Assign to support team
      return null;
    }

    return null;
  },

  /**
   * Detect spam emails
   */
  detectSpam: async (email: IEmail): Promise<boolean> => {
    const spamKeywords = ["viagra", "casino", "lottery", "winner", "congratulations"];
    const subject = email.subject.toLowerCase();
    const content = (email.textContent || "").toLowerCase();

    return spamKeywords.some((keyword) => subject.includes(keyword) || content.includes(keyword));
  },

  /**
   * Extract business-specific data
   */
  extractBusinessData: async (email: IEmail): Promise<void> => {
    const subject = email.subject;
    const content = email.textContent || "";

    // Extract Amazon order ID
    const amazonOrderMatch = (subject + " " + content).match(/order[#\s]*([0-9-]+)/i);
    if (amazonOrderMatch) {
      email.amazonOrderId = amazonOrderMatch[1];
    }

    // Extract eBay item ID
    const ebayItemMatch = (subject + " " + content).match(/item[#\s]*([0-9]+)/i);
    if (ebayItemMatch) {
      email.ebayItemId = ebayItemMatch[1];
    }

    // Add more extraction logic as needed
  },

  /**
   * Generate tags based on email content
   */
  generateTags: (email: IEmail): string[] => {
    const tags: string[] = [];
    const subject = email.subject.toLowerCase();
    const fromDomain = email.from.email.split("@")[1]?.toLowerCase() || "";

    if (fromDomain.includes("amazon")) tags.push("amazon");
    if (fromDomain.includes("ebay")) tags.push("ebay");
    if (subject.includes("order")) tags.push("order");
    if (subject.includes("support")) tags.push("support");
    if (subject.includes("urgent")) tags.push("urgent");

    return tags;
  },

  /**
   * Generate labels for categorization
   */
  generateLabels: (email: IEmail): string[] => {
    const labels: string[] = [];

    if (email.type === "amazon_order") labels.push("ecommerce");
    if (email.type === "support") labels.push("customer-service");
    if (email.isSpam) labels.push("spam");
    if (email.priority === "urgent") labels.push("priority");

    return labels;
  },

  /**
   * Determine email category for frontend tabs
   */
  determineEmailCategory: (email: IEmail): string => {
    const subject = email.subject.toLowerCase();
    const fromEmail = email.from.email.toLowerCase();
    const content = (email.textContent || "").toLowerCase();

    // Map to frontend tab categories
    if (fromEmail.includes("amazon") || subject.includes("amazon") || content.includes("amazon")) {
      return "primary";
    }
    if (fromEmail.includes("ebay") || subject.includes("ebay") || content.includes("ebay")) {
      return "primary";
    }
    if (subject.includes("support") || subject.includes("help") || fromEmail.includes("support")) {
      return "primary";
    }
    if (subject.includes("order") || content.includes("order confirmation")) {
      return "primary";
    }
    if (subject.includes("invoice") || content.includes("invoice")) {
      return "primary";
    }
    if (
      subject.includes("newsletter") ||
      subject.includes("marketing") ||
      subject.includes("promotion") ||
      subject.includes("offer") ||
      subject.includes("sale") ||
      content.includes("unsubscribe")
    ) {
      return "promotions";
    }

    // Social media domains
    if (
      fromEmail.includes("facebook") ||
      fromEmail.includes("twitter") ||
      fromEmail.includes("instagram") ||
      fromEmail.includes("linkedin") ||
      fromEmail.includes("youtube") ||
      fromEmail.includes("tiktok")
    ) {
      return "social";
    }

    // System updates and notifications
    if (
      subject.includes("notification") ||
      subject.includes("alert") ||
      subject.includes("system") ||
      subject.includes("update") ||
      subject.includes("maintenance") ||
      subject.includes("security") ||
      fromEmail.includes("noreply") ||
      fromEmail.includes("no-reply") ||
      fromEmail.includes("system") ||
      fromEmail.includes("admin")
    ) {
      return "updates";
    }

    return "primary"; // Default to primary tab
  },

  /**
   * Ensure thread consistency with your existing system
   */
  ensureThreadConsistency: async (email: IEmail): Promise<void> => {
    if (!email.threadId) {
      // Generate thread ID using your existing logic
      const normalizedSubject = email.subject.replace(/^(Re:|Fwd?:|RE:|FWD?:)\s*/gi, "").trim();
      email.threadId = `thread_${normalizedSubject.replace(/[^a-zA-Z0-9]/g, "_").toLowerCase()}`;
    }

    // Update or create thread
    // let thread = await EmailThreadModel.findOne({ threadId: email.threadId });

    // if (thread) {
    //   thread.messageCount += 1;
    //   thread.lastMessageAt = new Date();
    //   await thread.save();
    // } else {
    //   // Create new thread
    //   thread = new EmailThreadModel({
    //     threadId: email.threadId,
    //     subject: email.subject.replace(/^(Re:|Fwd?:|RE:|FWD?:)\s*/gi, "").trim(),
    //     participants: [email.from, ...email.to],
    //     messageCount: 1,
    //     lastMessageAt: new Date(),
    //     status: "active",
    //   });
    //   await thread.save();
    // }
  },

  /**
   * Health check to monitor Lambda integration
   */
  healthCheck: async (): Promise<{
    status: string;
    lambdaProcessedToday: number;
    pendingSync: number;
    lastSyncTime?: Date;
  }> => {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const lambdaProcessedToday = await EmailModel.countDocuments({
        direction: EmailDirection.INBOUND,
        createdAt: { $gte: today },
      });

      const pendingSync = await EmailModel.countDocuments({
        direction: EmailDirection.INBOUND,
        status: EmailStatus.RECEIVED,
        processedAt: { $exists: false },
      });

      // Get last successful sync time (you can store this in a separate collection)
      const lastProcessedEmail = await EmailModel.findOne({
        direction: EmailDirection.INBOUND,
        processedAt: { $exists: true },
      }).sort({ processedAt: -1 });

      return {
        status: "healthy",
        lambdaProcessedToday,
        pendingSync,
        lastSyncTime: lastProcessedEmail?.processedAt,
      };
    } catch (error: any) {
      logger.error("Health check failed:", error);
      return {
        status: "error",
        lambdaProcessedToday: 0,
        pendingSync: 0,
      };
    }
  },
};
