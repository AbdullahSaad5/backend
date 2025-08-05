import { Router } from "express";
import { EmailClientController } from "@/controllers/email-client.controller";
import { authGuard } from "@/guards";
import { validateRequest, validateParams } from "@/middlewares/validation.middleware";
import Joi from "joi";

// Validation schemas for email client
const emailClientValidation = {
  sendEmail: Joi.object({
    to: Joi.string().email().required(),
    subject: Joi.string().required(),
    text: Joi.string().optional(),
    html: Joi.string().optional(),
    cc: Joi.array().items(Joi.string().email()).optional(),
    bcc: Joi.array().items(Joi.string().email()).optional(),
    attachments: Joi.array().optional(),
    replyTo: Joi.string().email().optional(),
  }),

  replyToEmail: Joi.object({
    originalEmailId: Joi.string().required(),
    subject: Joi.string().required(),
    text: Joi.string().optional(),
    html: Joi.string().optional(),
    attachments: Joi.array().optional(),
  }),

  forwardEmail: Joi.object({
    originalEmailId: Joi.string().required(),
    to: Joi.string().email().required(),
    subject: Joi.string().required(),
    text: Joi.string().optional(),
    html: Joi.string().optional(),
    attachments: Joi.array().optional(),
  }),

  accountId: Joi.object({
    accountId: Joi.string().required(),
  }),
};

export const emailClient = (router: Router) => {
  // Apply authentication to all email client routes
  router.use(authGuard.isAuth);

  // Send emails
  router.post(
    "/send/:accountId",
    validateParams(emailClientValidation.accountId),
    validateRequest(emailClientValidation.sendEmail),
    EmailClientController.sendEmail
  );

  router.post(
    "/send/primary",
    validateRequest(emailClientValidation.sendEmail),
    EmailClientController.sendEmailFromPrimary
  );

  // Get emails
  router.get("/emails/:accountId", validateParams(emailClientValidation.accountId), EmailClientController.getEmails);

  router.get("/emails", EmailClientController.getAllEmails);

  // Reply and forward
  router.post(
    "/reply/:accountId",
    validateParams(emailClientValidation.accountId),
    validateRequest(emailClientValidation.replyToEmail),
    EmailClientController.replyToEmail
  );

  router.post(
    "/forward/:accountId",
    validateParams(emailClientValidation.accountId),
    validateRequest(emailClientValidation.forwardEmail),
    EmailClientController.forwardEmail
  );

  // Account statistics
  router.get("/stats", EmailClientController.getAccountStats);
};
