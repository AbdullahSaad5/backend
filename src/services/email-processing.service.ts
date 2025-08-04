import {
  ISESEmailEvent,
  IEmailProcessingResult,
  EmailDirection,
  EmailType,
  EmailStatus,
  EmailPriority,
} from "@/contracts/mailbox.contract";
import { EmailModel } from "@/models/email.model";
import { EmailThreadModel } from "@/models/email-thread.model";
import { logger } from "@/utils/logger.util";
import { socketManager } from "@/datasources/socket.datasource";
import crypto from "crypto";

export const EmailProcessingService = {
  processIncomingEmail: async (event: any): Promise<IEmailProcessingResult> => {
    const startTime = Date.now();
    const requestId = crypto.randomUUID();

    try {
      logger.info(`[${requestId}] Starting inbound email processing`, {
        eventType: event.Type || "direct",
        hasMessage: !!event.Message,
        hasMail: !!event.mail,
      });

      // Handle SNS notification format
      let mailData;
      if (event.Type === "Notification" && event.Message) {
        logger.info(`[${requestId}] Processing SNS notification format`);
        const message = JSON.parse(event.Message);
        mailData = message.mail;
      } else if (event.mail) {
        logger.info(`[${requestId}] Processing direct SES event format`);
        mailData = event.mail;
      } else {
        logger.error(`[${requestId}] Invalid email event format - missing mail data`);
        throw new Error("Invalid email event format");
      }

      // Extract email details for logging
      const fromEmail = mailData.commonHeaders?.from?.[0] || mailData.source || "unknown@sender.com";
      const toEmails = mailData.commonHeaders?.to || mailData.destination || [];
      const subject = mailData.commonHeaders?.subject || "No Subject";
      const messageId = mailData.messageId || crypto.randomUUID();

      logger.info(`[${requestId}] Inbound email details`, {
        messageId,
        from: fromEmail,
        to: toEmails,
        subject,
        timestamp: mailData.timestamp,
      });

      // Normalize subject and generate thread ID
      const normalizedSubject = subject.replace(/^(Re:|Fwd?:|RE:|FWD?:)\s*/gi, "").trim();
      const threadId = `thread_${normalizedSubject.replace(/[^a-zA-Z0-9]/g, "_").toLowerCase()}`;

      logger.info(`[${requestId}] Thread processing`, {
        originalSubject: subject,
        normalizedSubject,
        threadId,
      });

      const emailData = {
        messageId,
        threadId,
        direction: EmailDirection.INBOUND,
        type: EmailType.GENERAL,
        status: EmailStatus.RECEIVED,
        priority: EmailPriority.NORMAL,
        subject,
        textContent: extractTextContent(mailData),
        htmlContent: extractHtmlContent(mailData),
        from: {
          email: fromEmail,
          name: extractSenderName(mailData),
        },
        to: toEmails.map((to: string) => ({
          email: to,
          name: extractRecipientName(to),
        })),
        cc: (mailData.commonHeaders?.cc || []).map((cc: string) => ({ email: cc })),
        bcc: (mailData.commonHeaders?.bcc || []).map((bcc: string) => ({ email: bcc })),
        receivedAt: new Date(mailData.timestamp || Date.now()),
        isRead: false,
        isReplied: false,
        isForwarded: false,
        isArchived: false,
        isSpam: false,
        rawEmailData: mailData,
      };

      logger.info(`[${requestId}] Saving email to database`);
      const email = await EmailModel.create(emailData);
      logger.info(`[${requestId}] Email saved successfully`, {
        emailId: email._id,
        messageId: email.messageId,
      });

      // Emit real-time notification to all recipients
      const recipients = [...email.to, ...(email.cc || []), ...(email.bcc || [])];
      recipients.forEach((recipient) => {
        socketManager.emitNewEmail(recipient.email, {
          emailId: email._id,
          messageId: email.messageId,
          subject: email.subject,
          from: email.from,
          receivedAt: email.receivedAt,
          isRead: email.isRead,
          threadId: email.threadId,
        });
      });

      // Create or update email thread
      try {
        logger.info(`[${requestId}] Creating/updating email thread`);
        const thread = await createOrUpdateEmailThread(email);
        logger.info(`[${requestId}] Thread processed successfully`, {
          threadId: thread.threadId,
          messageCount: thread.messageCount,
          participants: thread.participants.length,
        });
      } catch (threadError: any) {
        logger.error(`[${requestId}] Error creating/updating thread`, {
          error: threadError.message,
          stack: threadError.stack,
        });
        // Don't fail the email processing if thread creation fails
      }

      const processingTime = Date.now() - startTime;
      logger.info(`[${requestId}] Inbound email processing completed successfully`, {
        processingTimeMs: processingTime,
        emailId: email._id,
        threadId: email.threadId,
      });

      return {
        success: true,
        email,
      };
    } catch (error: any) {
      const processingTime = Date.now() - startTime;
      logger.error(`[${requestId}] Failed to process incoming email`, {
        error: error.message,
        stack: error.stack,
        processingTimeMs: processingTime,
        eventData: JSON.stringify(event, null, 2),
      });

      return {
        success: false,
        error: `Failed to process incoming email: ${error.message}`,
      };
    }
  },

  // Process different types of email events
  processSESEvent: async (event: any): Promise<IEmailProcessingResult> => {
    try {
      const { eventType } = event;

      switch (eventType) {
        case "send":
          return await EmailProcessingService.processSendEvent(event);
        case "bounce":
        case "complaint":
          return await EmailProcessingService.processBounceOrComplaint(event);
        case "delivery":
          return await EmailProcessingService.processDeliveryEvent(event);
        default:
          console.log(`Unhandled SES event type: ${eventType}`);
          return { success: true };
      }
    } catch (error: any) {
      console.error("Failed to process SES event:", error);
      return {
        success: false,
        error: `Failed to process SES event: ${error.message}`,
      };
    }
  },

  processSendEvent: async (event: any): Promise<IEmailProcessingResult> => {
    try {
      // Update email status to sent if it exists in our database
      const { mail } = event;
      await EmailModel.updateOne(
        { messageId: mail.messageId },
        {
          status: EmailStatus.PROCESSED,
          sentAt: new Date(mail.timestamp),
        }
      );

      return { success: true };
    } catch (error: any) {
      return {
        success: false,
        error: `Failed to process send event: ${error.message}`,
      };
    }
  },

  processBounceOrComplaint: async (event: any): Promise<IEmailProcessingResult> => {
    try {
      const { mail, bounce, complaint } = event;
      const status = bounce ? EmailStatus.FAILED : EmailStatus.SPAM;

      await EmailModel.updateOne(
        { messageId: mail.messageId },
        {
          status,
          isSpam: !!complaint,
        }
      );

      return { success: true };
    } catch (error: any) {
      return {
        success: false,
        error: `Failed to process bounce/complaint: ${error.message}`,
      };
    }
  },

  processDeliveryEvent: async (event: any): Promise<IEmailProcessingResult> => {
    try {
      const { mail } = event;

      await EmailModel.updateOne(
        { messageId: mail.messageId },
        {
          status: EmailStatus.PROCESSED,
          processedAt: new Date(),
        }
      );

      return { success: true };
    } catch (error: any) {
      return {
        success: false,
        error: `Failed to process delivery event: ${error.message}`,
      };
    }
  },
};

// Helper functions
const extractTextContent = (mailData: any): string => {
  // Try to extract text content from various possible locations
  if (mailData.content) {
    return mailData.content;
  }
  if (mailData.commonHeaders?.subject) {
    return `Email received: ${mailData.commonHeaders.subject}`;
  }
  return "Email content not available";
};

const extractHtmlContent = (mailData: any): string => {
  // Try to extract HTML content
  if (mailData.htmlContent) {
    return mailData.htmlContent;
  }
  return `<p>${extractTextContent(mailData)}</p>`;
};

const extractSenderName = (mailData: any): string | undefined => {
  // Try to extract sender name from various locations
  const fromHeader = mailData.commonHeaders?.from?.[0];
  if (fromHeader && fromHeader.includes("<")) {
    const match = fromHeader.match(/^(.*?)\s*<.*>$/);
    return match?.[1]?.trim().replace(/"/g, "");
  }
  return undefined;
};

const extractRecipientName = (email: string): string | undefined => {
  if (email.includes("<")) {
    const match = email.match(/^(.*?)\s*<.*>$/);
    return match?.[1]?.trim().replace(/"/g, "");
  }
  return undefined;
};

const createOrUpdateEmailThread = async (email: any) => {
  const threadRequestId = crypto.randomUUID();

  try {
    logger.info(`[${threadRequestId}] Starting thread creation/update for email`, {
      emailId: email._id,
      subject: email.subject,
      from: email.from?.email,
      toCount: email.to?.length || 0,
    });

    // Generate thread ID based on subject (normalize by removing Re: Fwd: etc.)
    const normalizedSubject = email.subject.replace(/^(Re:|Fwd?:|RE:|FWD?:)\s*/gi, "").trim();
    const threadId = email.threadId || `thread_${normalizedSubject.replace(/[^a-zA-Z0-9]/g, "_").toLowerCase()}`;

    logger.info(`[${threadRequestId}] Thread ID generated`, {
      originalSubject: email.subject,
      normalizedSubject,
      threadId,
    });

    // Get all participants
    let participants = [email.from];
    if (email.to && Array.isArray(email.to)) {
      participants = participants.concat(email.to);
    }
    if (email.cc && Array.isArray(email.cc)) {
      participants = participants.concat(email.cc);
    }

    // Remove duplicates
    const participantEmails = participants.map((p) => p.email);
    participants = participants.filter(
      (participant, index, self) => index === self.findIndex((p) => p.email === participant.email)
    );

    logger.info(`[${threadRequestId}] Participants processed`, {
      totalParticipants: participants.length,
      participantEmails: participants.map((p) => p.email),
    });

    // Find existing thread or create new one
    let thread = await EmailThreadModel.findOne({ threadId });

    if (thread) {
      logger.info(`[${threadRequestId}] Existing thread found - updating`, {
        threadId: thread.threadId,
        currentMessageCount: thread.messageCount,
        currentParticipants: thread.participants.length,
      });

      // Update existing thread
      const oldMessageCount = thread.messageCount;
      thread.messageCount += 1;
      thread.lastMessageAt = new Date();

      // Add new participants if any
      let newParticipantsAdded = 0;
      participants.forEach((participant) => {
        if (!thread!.participants.some((p: any) => p.email === participant.email)) {
          thread!.participants.push(participant);
          newParticipantsAdded++;
        }
      });

      await thread.save();

      logger.info(`[${threadRequestId}] Thread updated successfully`, {
        threadId: thread.threadId,
        messageCountChange: `${oldMessageCount} -> ${thread.messageCount}`,
        newParticipantsAdded,
        totalParticipants: thread.participants.length,
      });
    } else {
      logger.info(`[${threadRequestId}] Creating new thread`, {
        threadId,
        subject: normalizedSubject,
        participantCount: participants.length,
      });

      // Create new thread
      thread = new EmailThreadModel({
        threadId,
        subject: normalizedSubject,
        participants,
        messageCount: 1,
        lastMessageAt: new Date(),
        status: "active",
      });
      await thread.save();

      logger.info(`[${threadRequestId}] New thread created successfully`, {
        threadId: thread.threadId,
        threadDbId: thread._id,
        messageCount: thread.messageCount,
        participantCount: thread.participants.length,
      });
    }

    // Update the email with the thread ID
    logger.info(`[${threadRequestId}] Updating email with thread ID`);
    await EmailModel.updateOne({ _id: email._id }, { threadId: thread.threadId });

    logger.info(`[${threadRequestId}] Thread processing completed successfully`, {
      threadId: thread.threadId,
      emailId: email._id,
      finalMessageCount: thread.messageCount,
    });

    return thread;
  } catch (error: any) {
    logger.error(`[${threadRequestId}] Error creating/updating email thread`, {
      error: error.message,
      stack: error.stack,
      emailId: email._id,
      subject: email.subject,
    });
    throw error;
  }
};
