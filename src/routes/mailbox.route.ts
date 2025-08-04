import { Router } from "express";
import { MailboxController } from "@/controllers/mailbox.controller";
import { emailRateLimiter } from "@/middlewares";
import { authGuard } from "@/guards";

export const mailbox = (router: Router) => {
  // Webhook endpoint for processing incoming emails (no auth required) - MUST be first
  router.post("/webhook/process", MailboxController.processEmail);

  // Apply authentication to all other mailbox routes
  router.use(authGuard.isAuth);

  // Email sending routes with rate limiting
  router.post("/send", emailRateLimiter, MailboxController.sendEmail);
  router.post("/send-bulk", emailRateLimiter, MailboxController.sendBulkEmails);

  // Marketing email functionality
  router.post("/email/send-marketing", emailRateLimiter, MailboxController.sendMarketingEmail);
  router.get("/email/history/:userId", MailboxController.getEmailHistory);
  router.post("/campaigns", MailboxController.createCampaign);
  router.get("/campaigns", MailboxController.getCampaigns);

  // SMS functionality
  router.post("/sms/send", MailboxController.sendSms);
  router.get("/sms/history/:userId", MailboxController.getSmsHistory);

  // Newsletter functionality
  router.post("/newsletter/subscribe", MailboxController.subscribeToNewsletter);
  router.get("/newsletter/subscribers", MailboxController.getSubscribers);

  // Email Thread functionality (UC-17.6)
  router.get("/threads", MailboxController.getEmailThreads);
  router.get("/threads/:threadId", MailboxController.getEmailThreadById);
  router.get("/threads/:threadId/conversation", MailboxController.getEmailThreadConversation);
  router.patch("/threads/:threadId", MailboxController.updateEmailThreadStatus);

  // Email status flag routes
  router.patch("/emails/:id/read", MailboxController.markEmailAsRead);
  router.patch("/emails/read", MailboxController.markEmailsAsRead);
  router.patch("/emails/:id/replied", MailboxController.markEmailAsReplied);
  router.patch("/emails/:id/forwarded", MailboxController.markEmailAsForwarded);
  router.patch("/emails/archive", MailboxController.archiveEmails);
  router.patch("/emails/spam", MailboxController.markEmailsAsSpam);
  router.get("/emails/status-summary", MailboxController.getEmailStatusSummary);
  router.patch("/emails/bulk-update-status", MailboxController.bulkUpdateEmailStatus);

  // IMAP/POP3 Protocol Support for External Email Clients
  router.get("/imap/:userId/messages", MailboxController.getIMAPMessages);
  router.patch("/imap/:userId/messages/:messageId/flags", MailboxController.updateIMAPFlags);
  router.get("/imap/capabilities", MailboxController.getEmailClientCapabilities);

  // Email retrieval routes
  router.get("/emails", MailboxController.getEmails);
  router.get("/emails/:id", MailboxController.getEmailById);

  // Service management routes
  router.get("/test-connection", MailboxController.testConnection);
  router.get("/service-status", MailboxController.getServiceStatus);
};
