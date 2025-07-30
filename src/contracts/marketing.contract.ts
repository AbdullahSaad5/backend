import { z } from "zod";

export const sendSmsSchema = z.object({
  to: z.string(),
  message: z.string(),
});

export const sendEmailSchema = z.object({
  to: z.string().email(),
  subject: z.string(),
  body: z.string(),
});

export const scheduleMessageSchema = z.object({
  to: z.string(),
  message: z.string(),
  sendAt: z.date(),
});

export const createCampaignSchema = z.object({
  name: z.string(),
  subject: z.string(),
  message: z.string(),
  recipients: z.array(z.string()),
});

export const subscribeNewsletterSchema = z.object({
  email: z.string().email(),
});

export const createPriceDropAlertSchema = z.object({
  productId: z.string(),
  userId: z.string(),
});

export const createBackInStockAlertSchema = z.object({
  productId: z.string(),
  userId: z.string(),
});
