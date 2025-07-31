import { ISESEmailEvent, IEmailProcessingResult, EmailDirection, EmailType, EmailStatus, EmailPriority } from "@/contracts/mailbox.contract";
import { EmailModel } from "@/models/email.model";

export const EmailProcessingService = {
  processIncomingEmail: async (event: ISESEmailEvent): Promise<IEmailProcessingResult> => {
    try {
      const { mail } = event;
      const emailData = {
        messageId: mail.messageId,
        direction: EmailDirection.INBOUND,
        type: EmailType.GENERAL, // Default, could be set based on rules
        status: EmailStatus.RECEIVED,
        priority: EmailPriority.NORMAL,
        subject: mail.commonHeaders.subject,
        from: { email: mail.commonHeaders.from[0] },
        to: mail.commonHeaders.to.map(to => ({ email: to })),
        receivedAt: new Date(mail.timestamp),
        isRead: false,
        isReplied: false,
        isForwarded: false,
        isArchived: false,
        isSpam: false,
        rawEmailData: mail,
      };

      // Save email to DB
      const email = await EmailModel.create(emailData);

      return {
        success: true,
        email,
      };
    } catch (error) {
      console.error("Failed to process incoming email", error);
      return {
        success: false,
        error: "Failed to process incoming email",
      };
    }
  },

  // Add more functions to process different email types or actions
};

