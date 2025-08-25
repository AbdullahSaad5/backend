import nodemailer from "nodemailer";
import { ses, emailConfig, validateSesConfig } from "@/config/awsSes";
import { gmailSmtpConfig, gmailEmailConfig, validateGmailConfig } from "@/config/gmailSmtp";

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
  provider?: "gmail" | "aws-ses";
}

let transporter: nodemailer.Transporter | undefined;
let isConfigured = false;
let emailProvider: "gmail" | "aws-ses" = "gmail"; // Default to Gmail

// Determine which email service to use based on environment variables
const determineEmailProvider = (): "gmail" | "aws-ses" => {
  const useGmail = process.env.EMAIL_PROVIDER === "gmail" || process.env.USE_GMAIL === "true";
  const useAwsSes = process.env.EMAIL_PROVIDER === "aws-ses" || process.env.USE_AWS_SES === "true";

  if (useAwsSes) {
    return "aws-ses";
  } else if (useGmail || validateGmailConfig()) {
    return "gmail";
  } else if (validateSesConfig()) {
    return "aws-ses";
  }

  return "gmail"; // Default fallback
};

const initializeTransporter = () => {
  try {
    emailProvider = determineEmailProvider();

    if (emailProvider === "gmail") {
      isConfigured = validateGmailConfig();

      if (!isConfigured) {
        console.warn("Gmail SMTP not properly configured. Trying AWS SES...");
        emailProvider = "aws-ses";
        isConfigured = validateSesConfig();

        if (!isConfigured) {
          console.error("Neither Gmail SMTP nor AWS SES are properly configured. Email service will not work.");
          return;
        }
      }

      if (emailProvider === "gmail") {
        transporter = nodemailer.createTransport(gmailSmtpConfig);
        // console.log("✅ Email service initialized with Gmail SMTP");
        return;
      }
    }

    if (emailProvider === "aws-ses") {
      isConfigured = validateSesConfig();

      if (!isConfigured) {
        console.warn("AWS SES not properly configured. Email service will not work.");
        return;
      }

      transporter = nodemailer.createTransport({
        SES: { ses, aws: require("aws-sdk") },
        sendingRate: emailConfig.maxSendRate,
      });

      // console.log("✅ Email service initialized with AWS SES");
    }
  } catch (error) {
    console.error("❌ Failed to initialize email service:", error);
    isConfigured = false;
  }
};

// Initialize on startup
initializeTransporter();

export const switchableEmailService = {
  sendEmail: async (message: EmailMessage): Promise<EmailResponse> => {
    if (!isConfigured || !transporter) {
      return {
        messageId: "",
        status: "failed" as const,
        error: "Email service not configured properly",
        provider: emailProvider,
      };
    }

    try {
      const config = emailProvider === "gmail" ? gmailEmailConfig : emailConfig;

      const mailOptions = {
        from: message.from || `${config.defaultFromName} <${config.defaultFromEmail}>`,
        to: Array.isArray(message.to) ? message.to.join(", ") : message.to,
        subject: message.subject,
        text: message.body,
        html: message.html || message.body,
        replyTo: message.replyTo || config.replyToEmail,
        cc: message.cc ? (Array.isArray(message.cc) ? message.cc.join(", ") : message.cc) : undefined,
        bcc: message.bcc ? (Array.isArray(message.bcc) ? message.bcc.join(", ") : message.bcc) : undefined,
        attachments: message.attachments,
      };

      const result = await transporter.sendMail(mailOptions);

      return {
        messageId: result.messageId,
        status: "sent" as const,
        response: result.response,
        provider: emailProvider,
      };
    } catch (error: any) {
      console.error(`Email sending failed using ${emailProvider}:`, error);
      return {
        messageId: "",
        status: "failed" as const,
        error: error.message,
        provider: emailProvider,
      };
    }
  },

  sendBulkEmails: async (messages: EmailMessage[]): Promise<EmailResponse[]> => {
    if (!isConfigured || !transporter) {
      return messages.map(() => ({
        messageId: "",
        status: "failed" as const,
        error: "Email service not configured properly",
        provider: emailProvider,
      }));
    }

    const results: EmailResponse[] = [];
    const config = emailProvider === "gmail" ? gmailEmailConfig : emailConfig;

    for (let i = 0; i < messages.length; i++) {
      const result = await switchableEmailService.sendEmail(messages[i]);
      results.push(result);

      // Rate limiting between emails
      if (i < messages.length - 1) {
        await new Promise((resolve) => setTimeout(resolve, 1000 / config.maxSendRate));
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
      console.log(`✅ Email service connection verified using ${emailProvider}`);
      return true;
    } catch (error) {
      console.error(`❌ Email service connection failed using ${emailProvider}:`, error);
      return false;
    }
  },

  getEmailStatus: async (messageId: string): Promise<EmailResponse> => {
    console.log(`Getting email status for: ${messageId} using ${emailProvider}`);

    return {
      messageId,
      status: "sent" as const,
      provider: emailProvider,
    };
  },

  getCurrentProvider: () => emailProvider,

  getProviderConfig: () => {
    if (emailProvider === "gmail") {
      return {
        provider: "gmail",
        config: gmailEmailConfig,
        isConfigured: validateGmailConfig(),
      };
    } else {
      return {
        provider: "aws-ses",
        config: emailConfig,
        isConfigured: validateSesConfig(),
      };
    }
  },

  // AWS SES specific methods (only work when using AWS SES)
  getSendingStatistics: async () => {
    if (emailProvider !== "aws-ses") {
      return { error: "Statistics only available for AWS SES" };
    }

    try {
      const stats = await ses.getSendStatistics().promise();
      return stats.SendDataPoints;
    } catch (error) {
      console.error("Failed to get sending statistics:", error);
      return null;
    }
  },

  getSendQuota: async () => {
    if (emailProvider !== "aws-ses") {
      return { error: "Send quota only available for AWS SES" };
    }

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
