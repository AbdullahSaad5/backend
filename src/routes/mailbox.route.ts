import { Router } from "express";
import { MailboxController } from "@/controllers/mailbox.controller";
import { emailRateLimiter } from "@/middlewares";
import { authGuard } from "@/guards";

export const mailbox = (router: Router) => {
  // Apply authentication to all mailbox routes
  router.use(authGuard.isAuth);

  // Email sending routes with rate limiting
  router.post("/send", emailRateLimiter, MailboxController.sendEmail);
  router.post("/send-bulk", emailRateLimiter, MailboxController.sendBulkEmails);

  // Email retrieval routes
  router.get("/emails", MailboxController.getEmails);
  router.get("/emails/:id", MailboxController.getEmailById);

  // Service management routes
  router.get("/test-connection", MailboxController.testConnection);
  router.get("/service-status", MailboxController.getServiceStatus);

  // Webhook endpoint for processing incoming emails (no auth required)
  router.post("/webhook/process", MailboxController.processEmail);
};
