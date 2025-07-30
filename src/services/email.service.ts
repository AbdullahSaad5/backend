import nodemailer from "nodemailer";
import { ses, emailConfig, validateSesConfig } from "@/config/awsSes";

export interface EmailMessage {
  to: string | string[];
  subject: string;
  body: string;
  html?: string;
  from?: string;
  replyTo?: string;
  cc?: string | string[];
  bcc?: string | string[];
  attachments?: Array<{
    filename: string;
    content: string | Buffer;
    contentType?: string;
    path?: string;
  }>;
}

export interface EmailResponse {
  messageId: string;
  status: "sent" | "failed";
  error?: string;
  response?: string;
}

let transporter: nodemailer.Transporter | undefined;
let isConfigured = false;

const initializeTransporter = () => {
  try {
    isConfigured = validateSesConfig();

    if (!isConfigured) {
      console.warn("AWS SES not properly configured. Email service will not work.");
      return;
    }

    transporter = nodemailer.createTransport({
      SES: { ses, aws: require("aws-sdk") },
      sendingRate: emailConfig.maxSendRate,
    });

    console.log("✅ Email service initialized with AWS SES");
  } catch (error) {
    console.error("❌ Failed to initialize email service:", error);
    isConfigured = false;
  }
};

// Initialize on startup
initializeTransporter();

export const emailService = {
  sendEmail: async (message: EmailMessage): Promise<EmailResponse> => {
    if (!isConfigured || !transporter) {
      return {
        messageId: "",
        status: "failed" as const,
        error: "Email service not configured properly",
      };
    }

    try {
      const mailOptions = {
        from: message.from || `${emailConfig.defaultFromName} <${emailConfig.defaultFromEmail}>`,
        to: Array.isArray(message.to) ? message.to.join(", ") : message.to,
        subject: message.subject,
        text: message.body,
        html: message.html || message.body,
        replyTo: message.replyTo || emailConfig.replyToEmail,
        cc: message.cc ? (Array.isArray(message.cc) ? message.cc.join(", ") : message.cc) : undefined,
        bcc: message.bcc ? (Array.isArray(message.bcc) ? message.bcc.join(", ") : message.bcc) : undefined,
        attachments: message.attachments,
      };

      const result = await transporter.sendMail(mailOptions);

      return {
        messageId: result.messageId,
        status: "sent" as const,
        response: result.response,
      };
    } catch (error: any) {
      console.error("Email sending failed:", error);
      return {
        messageId: "",
        status: "failed" as const,
        error: error.message,
      };
    }
  },

  getEmailStatus: async (messageId: string): Promise<EmailResponse> => {
    console.log("Getting Email status for:", messageId);

    return {
      messageId,
      status: "sent" as const,
    };
  },

  receiveEmail: async (): Promise<any[]> => {
    console.log("Email receiving should be handled via SNS/SQS webhooks");
    return [];
  },

  sendBulkEmails: async (messages: EmailMessage[]): Promise<EmailResponse[]> => {
    if (!isConfigured || !transporter) {
      return messages.map(() => ({
        messageId: "",
        status: "failed" as const,
        error: "Email service not configured properly",
      }));
    }

    const results: EmailResponse[] = [];

    for (let i = 0; i < messages.length; i++) {
      const result = await emailService.sendEmail(messages[i]);
      results.push(result);

      if (i < messages.length - 1) {
        await new Promise((resolve) => setTimeout(resolve, 1000 / emailConfig.maxSendRate));
      }
    }

    return results;
  },

  verifyConnection: async (): Promise<boolean> => {
    if (!isConfigured || !transporter) {
      return false;
    }

    try {
      await transporter.verify();
      console.log("✅ Email service connection verified");
      return true;
    } catch (error) {
      console.error("❌ Email service connection failed:", error);
      return false;
    }
  },

  getSendingStatistics: async () => {
    try {
      const stats = await ses.getSendStatistics().promise();
      return stats.SendDataPoints;
    } catch (error) {
      console.error("Failed to get sending statistics:", error);
      return null;
    }
  },

  getSendQuota: async () => {
    try {
      const quota = await ses.getSendQuota().promise();
      return {
        max24HourSend: quota.Max24HourSend,
        maxSendRate: quota.MaxSendRate,
        sentLast24Hours: quota.SentLast24Hours,
      };
    } catch (error) {
      console.error("Failed to get send quota:", error);
      return null;
    }
  },
};
