import { Router } from "express";
import { MailboxController } from "@/controllers/mailbox.controller";

export const emailAccount = (router: Router) => {
  // Admin routes for managing email accounts
  router.post("/admin/email-accounts", MailboxController.createEmailAccount);
  router.get("/admin/email-accounts", MailboxController.getEmailAccounts);
  router.get("/admin/email-accounts/:id", MailboxController.getEmailAccountById);
  router.patch("/admin/email-accounts/:id", MailboxController.updateEmailAccount);
  router.delete("/admin/email-accounts/:id", MailboxController.deleteEmailAccount);
};
