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

export class EmailService {
  private transporter: nodemailer.Transporter;
  private isConfigured: boolean = false;

  constructor() {
    this.initializeTransporter();
  }

  private initializeTransporter() {
    try {
      // Validate SES configuration
      this.isConfigured = validateSesConfig();

      if (!this.isConfigured) {
        console.warn("AWS SES not properly configured. Email service will not work.");
        return;
      }

      // Create Nodemailer transporter using AWS SES
      this.transporter = nodemailer.createTransporter({
        SES: { ses, aws: require("aws-sdk") },
        sendingRate: emailConfig.maxSendRate, // emails per second
      });

      console.log("✅ Email service initialized with AWS SES");
    } catch (error) {
      console.error("❌ Failed to initialize email service:", error);
      this.isConfigured = false;
    }
  }

  async sendEmail(message: EmailMessage): Promise<EmailResponse> {
    if (!this.isConfigured || !this.transporter) {
      return {
        messageId: "",
        status: "failed",
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

      const result = await this.transporter.sendMail(mailOptions);

      return {
        messageId: result.messageId,
        status: "sent",
        response: result.response,
      };
    } catch (error: any) {
      console.error("Email sending failed:", error);
      return {
        messageId: "",
        status: "failed",
        error: error.message,
      };
    }
  }

  async getEmailStatus(messageId: string): Promise<EmailResponse> {
    // AWS SES doesn't provide direct status checking through Nodemailer
    // You would need to implement SNS notifications or CloudWatch metrics
    // For now, we'll return a basic response
    console.log("Getting Email status for:", messageId);

    return {
      messageId,
      status: "sent", // In practice, you'd check actual status
    };
  }

  async receiveEmail(): Promise<any[]> {
    // AWS SES receiving would be handled through SNS/SQS or WorkMail
    // This would typically be implemented as webhook endpoints
    console.log("Email receiving should be handled via SNS/SQS webhooks");
    return [];
  }

  async sendBulkEmails(messages: EmailMessage[]): Promise<EmailResponse[]> {
    if (!this.isConfigured || !this.transporter) {
      return messages.map(() => ({
        messageId: "",
        status: "failed" as const,
        error: "Email service not configured properly",
      }));
    }

    const results: EmailResponse[] = [];

    // Send emails with rate limiting to respect SES limits
    for (let i = 0; i < messages.length; i++) {
      const result = await this.sendEmail(messages[i]);
      results.push(result);

      // Add delay to respect rate limits (if not last email)
      if (i < messages.length - 1) {
        await this.delay(1000 / emailConfig.maxSendRate);
      }
    }

    return results;
  }

  async verifyConnection(): Promise<boolean> {
    if (!this.isConfigured || !this.transporter) {
      return false;
    }

    try {
      await this.transporter.verify();
      console.log("✅ Email service connection verified");
      return true;
    } catch (error) {
      console.error("❌ Email service connection failed:", error);
      return false;
    }
  }

  // Helper method to add delay
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  // Method to get sending statistics
  async getSendingStatistics() {
    try {
      const stats = await ses.getSendStatistics().promise();
      return stats.SendDataPoints;
    } catch (error) {
      console.error("Failed to get sending statistics:", error);
      return null;
    }
  }

  // Method to get send quota
  async getSendQuota() {
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
  }
}

export const emailService = new EmailService();
