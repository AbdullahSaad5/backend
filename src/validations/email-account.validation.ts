import Joi from "joi";

export const emailAccountValidation = {
  // OAuth initiation validation
  initiateOAuth: Joi.object({
    emailAddress: Joi.string().email().optional(),
    accountName: Joi.string().min(1).max(100).optional(),
    isPrimary: Joi.boolean().default(false),
    userId: Joi.string().required(),
  }),

  // Manual account creation validation
  createManualAccount: Joi.object({
    accountName: Joi.string().min(1).max(100).required(),
    emailAddress: Joi.string().email().required(),
    displayName: Joi.string().max(100).optional(),
    accountType: Joi.string().valid("imap", "pop3", "exchange", "gmail", "outlook", "custom").required(),
    incomingServer: Joi.object({
      host: Joi.string().required(),
      port: Joi.number().integer().min(1).max(65535).required(),
      security: Joi.string().valid("none", "ssl", "tls", "starttls").required(),
      username: Joi.string().required(),
      password: Joi.string().required(),
    }).required(),
    outgoingServer: Joi.object({
      host: Joi.string().required(),
      port: Joi.number().integer().min(1).max(65535).required(),
      security: Joi.string().valid("none", "ssl", "tls", "starttls").required(),
      username: Joi.string().required(),
      password: Joi.string().required(),
      requiresAuth: Joi.boolean().default(true),
    }).required(),
    settings: Joi.object({
      checkInterval: Joi.number().integer().min(1).max(1440).default(15),
      autoDownload: Joi.boolean().default(true),
      downloadLimit: Joi.number().integer().min(1).max(1000).default(100),
      deleteFromServer: Joi.boolean().default(false),
      leaveOnServer: Joi.boolean().default(true),
      syncFolders: Joi.array().items(Joi.string()).default(["INBOX"]),
    }).optional(),
    isPrimary: Joi.boolean().default(false),
  }),

  // Update account validation
  updateAccount: Joi.object({
    accountName: Joi.string().min(1).max(100).optional(),
    displayName: Joi.string().max(100).optional(),
    isActive: Joi.boolean().optional(),
    isPrimary: Joi.boolean().optional(),
    incomingServer: Joi.object({
      host: Joi.string().optional(),
      port: Joi.number().integer().min(1).max(65535).optional(),
      security: Joi.string().valid("none", "ssl", "tls", "starttls").optional(),
      username: Joi.string().optional(),
      password: Joi.string().optional(),
    }).optional(),
    outgoingServer: Joi.object({
      host: Joi.string().optional(),
      port: Joi.number().integer().min(1).max(65535).optional(),
      security: Joi.string().valid("none", "ssl", "tls", "starttls").optional(),
      username: Joi.string().optional(),
      password: Joi.string().optional(),
      requiresAuth: Joi.boolean().optional(),
    }).optional(),
    settings: Joi.object({
      checkInterval: Joi.number().integer().min(1).max(1440).optional(),
      autoDownload: Joi.boolean().optional(),
      downloadLimit: Joi.number().integer().min(1).max(1000).optional(),
      deleteFromServer: Joi.boolean().optional(),
      leaveOnServer: Joi.boolean().optional(),
      syncFolders: Joi.array().items(Joi.string()).optional(),
    }).optional(),
  }),

  // Account ID validation
  accountId: Joi.object({
    accountId: Joi.string().required(),
  }),

  // Provider detection validation
  detectProvider: Joi.object({
    emailAddress: Joi.string().email().required(),
  }),

  // Update sync folders validation
  updateSyncFolders: Joi.object({
    syncFolders: Joi.array().items(Joi.string()).min(1).required(),
  }),
};
