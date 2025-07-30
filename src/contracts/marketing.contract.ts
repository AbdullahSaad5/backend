import { z } from "zod";

export const sendSmsSchema = z.object({
  to: z.string(),
  message: z.string(),
});

export const sendEmailSchema = z.object({
  to: z.union([z.string().email(), z.array(z.string().email())]),
  subject: z.string().min(1, "Subject is required"),
  body: z.string().min(1, "Body is required"),
  html: z.string().optional(),
  from: z.string().email().optional(),
  replyTo: z.string().email().optional(),
  cc: z.union([z.string().email(), z.array(z.string().email())]).optional(),
  bcc: z.union([z.string().email(), z.array(z.string().email())]).optional(),
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
