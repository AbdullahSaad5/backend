import { SMSMessage, EmailMessage, MarketingCampaign, NewsletterSubscriber } from "@/models/marketing.model";
import { smsService } from "@/services/sms.service";
import { emailService } from "@/services/email.service";

class MarketingService {
  constructor() {}

  // SMS Services
  async sendSms(to: string, message: string) {
    const smsResponse = await smsService.sendSMS({ to, message });
    const newSms = new SMSMessage({ to, from: "system", message, status: smsResponse.status });
    await newSms.save();
    return newSms;
  }

  async getSmsHistory(userId: string) {
    // Implement logic to retrieve SMS history for a user
    return [];
  }

  // Email Services
  async sendEmail(to: string, subject: string, body: string, html?: string, from?: string) {
    try {
      const emailResponse = await emailService.sendEmail({
        to,
        subject,
        body,
        html,
        from,
      });

      const newEmail = new EmailMessage({
        to: Array.isArray(to) ? to.join(",") : to,
        from: from || "system",
        subject,
        body,
        status: emailResponse.status === "sent" ? "sent" : "failed",
      });

      await newEmail.save();
      return {
        email: newEmail,
        messageId: emailResponse.messageId,
        error: emailResponse.error,
      };
    } catch (error: any) {
      console.error("Failed to send email:", error);
      throw new Error("Failed to send email: " + error.message);
    }
  }

  async getEmailHistory(userId: string) {
    // Implement logic to retrieve email history for a user
    return [];
  }

  // Marketing Campaign Services
  async createCampaign(name: string, subject: string, message: string, recipients: string[]) {
    const newCampaign = new MarketingCampaign({ name, subject, message, recipients });
    await newCampaign.save();
    return newCampaign;
  }

  async scheduleCampaign(campaignId: string, sendAt: Date) {
    // Implement logic to schedule a campaign
    return { success: true };
  }

  async getCampaigns() {
    return MarketingCampaign.find();
  }

  // Newsletter Services
  async subscribeToNewsletter(email: string) {
    const newSubscriber = new NewsletterSubscriber({ email });
    await newSubscriber.save();
    return newSubscriber;
  }

  async getSubscribers() {
    return NewsletterSubscriber.find();
  }

  // Email Service Testing and Stats
  async testEmailConnection() {
    try {
      return await emailService.verifyConnection();
    } catch (error) {
      console.error("Email connection test failed:", error);
      return false;
    }
  }

  async getEmailStats() {
    try {
      const [sendingStats, sendQuota] = await Promise.all([
        emailService.getSendingStatistics(),
        emailService.getSendQuota(),
      ]);

      return {
        sendingStatistics: sendingStats,
        sendQuota: sendQuota,
      };
    } catch (error: any) {
      console.error("Failed to get email stats:", error);
      return {
        sendingStatistics: null,
        sendQuota: null,
        error: error.message,
      };
    }
  }
}

const marketingService = new MarketingService();
export default marketingService;
