import { ISESEmailEvent, IEmailProcessingResult, EmailDirection, EmailType, EmailStatus, EmailPriority } from "@/contracts/mailbox.contract";
import { EmailModel } from "@/models/email.model";
import { EmailThreadModel } from "@/models/email-thread.model";
import crypto from "crypto";

export const EmailProcessingService = {
  processIncomingEmail: async (event: any): Promise<IEmailProcessingResult> => {
    try {
      console.log('Processing incoming email event:', JSON.stringify(event, null, 2));
      
      // Handle SNS notification format
      let mailData;
      if (event.Type === 'Notification' && event.Message) {
        // Parse SNS message
        const message = JSON.parse(event.Message);
        mailData = message.mail;
      } else if (event.mail) {
        // Direct SES event
        mailData = event.mail;
      } else {
        throw new Error('Invalid email event format');
      }

      // Normalize subject and generate thread ID
      const subject = mailData.commonHeaders?.subject || 'No Subject';
      const normalizedSubject = subject.replace(/^(Re:|Fwd?:|RE:|FWD?:)\s*/gi, '').trim();
      const threadId = `thread_${normalizedSubject.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase()}`;
      
      const emailData = {
        messageId: mailData.messageId || crypto.randomUUID(),
        threadId,
        direction: EmailDirection.INBOUND,
        type: EmailType.GENERAL, // Default, could be set based on rules
        status: EmailStatus.RECEIVED,
        priority: EmailPriority.NORMAL,
        subject,
        textContent: extractTextContent(mailData),
        htmlContent: extractHtmlContent(mailData),
        from: { 
          email: mailData.commonHeaders?.from?.[0] || mailData.source || 'unknown@sender.com',
          name: extractSenderName(mailData)
        },
        to: (mailData.commonHeaders?.to || mailData.destination || []).map((to: string) => ({ 
          email: to,
          name: extractRecipientName(to)
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

      // Save email to DB
      const email = await EmailModel.create(emailData);
      
      // Create or update email thread
      try {
        await createOrUpdateEmailThread(email);
      } catch (threadError) {
        console.error('Error creating/updating thread for inbound email:', threadError);
        // Don't fail the email processing if thread creation fails
      }

      return {
        success: true,
        email,
      };
    } catch (error: any) {
      console.error("Failed to process incoming email", error);
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
        case 'send':
          return await EmailProcessingService.processSendEvent(event);
        case 'bounce':
        case 'complaint':
          return await EmailProcessingService.processBounceOrComplaint(event);
        case 'delivery':
          return await EmailProcessingService.processDeliveryEvent(event);
        default:
          console.log(`Unhandled SES event type: ${eventType}`);
          return { success: true };
      }
    } catch (error: any) {
      console.error('Failed to process SES event:', error);
      return {
        success: false,
        error: `Failed to process SES event: ${error.message}`
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
          sentAt: new Date(mail.timestamp)
        }
      );
      
      return { success: true };
    } catch (error: any) {
      return {
        success: false,
        error: `Failed to process send event: ${error.message}`
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
          isSpam: !!complaint
        }
      );
      
      return { success: true };
    } catch (error: any) {
      return {
        success: false,
        error: `Failed to process bounce/complaint: ${error.message}`
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
          processedAt: new Date()
        }
      );
      
      return { success: true };
    } catch (error: any) {
      return {
        success: false,
        error: `Failed to process delivery event: ${error.message}`
      };
    }
  }
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
  return 'Email content not available';
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
  if (fromHeader && fromHeader.includes('<')) {
    const match = fromHeader.match(/^(.*?)\s*<.*>$/);
    return match?.[1]?.trim().replace(/"/g, '');
  }
  return undefined;
};

const extractRecipientName = (email: string): string | undefined => {
  if (email.includes('<')) {
    const match = email.match(/^(.*?)\s*<.*>$/);
    return match?.[1]?.trim().replace(/"/g, '');
  }
  return undefined;
};

const createOrUpdateEmailThread = async (email: any) => {
  try {
    // Generate thread ID based on subject (normalize by removing Re: Fwd: etc.)
    const normalizedSubject = email.subject.replace(/^(Re:|Fwd?:|RE:|FWD?:)\s*/gi, '').trim();
    const threadId = email.threadId || `thread_${normalizedSubject.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase()}`;
    
    // Get all participants
    let participants = [email.from];
    if (email.to && Array.isArray(email.to)) {
      participants = participants.concat(email.to);
    }
    if (email.cc && Array.isArray(email.cc)) {
      participants = participants.concat(email.cc);
    }
    
    // Remove duplicates
    participants = participants.filter((participant, index, self) => 
      index === self.findIndex(p => p.email === participant.email)
    );

    // Find existing thread or create new one
    let thread = await EmailThreadModel.findOne({ threadId });
    
    if (thread) {
      // Update existing thread
      thread.messageCount += 1;
      thread.lastMessageAt = new Date();
      
      // Add new participants if any
      participants.forEach(participant => {
        if (!thread!.participants.some((p: any) => p.email === participant.email)) {
          thread!.participants.push(participant);
        }
      });
      
      await thread.save();
    } else {
      // Create new thread
      thread = new EmailThreadModel({
        threadId,
        subject: normalizedSubject,
        participants,
        messageCount: 1,
        lastMessageAt: new Date(),
        status: 'active'
      });
      await thread.save();
    }
    
    // Update the email with the thread ID
    await EmailModel.updateOne(
      { _id: email._id },
      { threadId: thread.threadId }
    );
    
    return thread;
  } catch (error: any) {
    console.error('Error creating/updating email thread:', error);
    throw error;
  }
};

