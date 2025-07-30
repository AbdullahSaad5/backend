import { Router } from "express";
import { marketingController } from "../controllers/marketing.controller";
import { authGuard } from "@/guards";

export const marketing = (router: Router) => {
  // SMS Routes
  // UC-17.1: Send/Reply to SMS from System
  router.post("/marketing/sms/send", authGuard.isAuth, marketingController.sendSms);

  // UC-17.3: Maintain SMS History
  router.get("/marketing/sms/history/:userId", authGuard.isAuth, marketingController.getSmsHistory);

  // Email Routes
  // UC-17.4: Send/Reply to Email from System
  router.post("/marketing/email/send", authGuard.isAuth, marketingController.sendEmail);

  // UC-17.6: Maintain Email Thread History
  router.get("/marketing/email/history/:userId", authGuard.isAuth, marketingController.getEmailHistory);

  // Marketing Campaign Routes
  // UC-17.7: Automated Email/SMS Marketing
  router.post("/marketing/campaigns", authGuard.isAuth, marketingController.createCampaign);
  router.get("/marketing/campaigns", authGuard.isAuth, marketingController.getCampaigns);

  // Newsletter Routes
  // UC-17.10: Newsletter Management
  router.post("/marketing/newsletter/subscribe", marketingController.subscribeToNewsletter);
  router.get("/marketing/newsletter/subscribers", authGuard.isAuth, marketingController.getSubscribers);

  // TODO: Implement additional routes for the following use cases:
  // UC-17.2: Receive SMS within System (webhook)
  // UC-17.5: Receive Email within System (webhook)
  // UC-17.8: Automated Order Notification SMS/Emails
  // UC-17.9: Email/SMS Scheduled Delivery
  // UC-17.11: Product Recommendations via Email/SMS
  // UC-17.12: Abandoned Cart Recovery Email/SMS
  // UC-17.13: Price Drops Alert Email/SMS
  // UC-17.14: Back-in-Stock Alert Email/SMS
  // UC-17.15: Email/SMS List Segmentation
};
