import { Schema, model, models } from "mongoose";

export interface IEmailAccount {
  _id?: string;
  userId: string; // Admin/User who owns this email account
  accountName: string; // Display name for the account
  emailAddress: string; // The actual email address
  displayName?: string; // Display name for outgoing emails
  save?: any;
  // Account type and configuration
  accountType: "imap" | "pop3" | "exchange" | "gmail" | "outlook" | "custom";
  isActive: boolean;
  isPrimary: boolean; // One primary account per user

  // Server configuration
  incomingServer: {
    host: string;
    port: number;
    security: "none" | "ssl" | "tls" | "starttls";
    username: string;
    password: string; // Should be encrypted in production
  };

  outgoingServer: {
    host: string;
    port: number;
    security: "none" | "ssl" | "tls" | "starttls";
    username: string;
    password: string; // Should be encrypted in production
    requiresAuth: boolean;
  };

  // OAuth configuration (for Gmail, Outlook, etc.)
  oauth?: {
    provider: "gmail" | "outlook" | "yahoo";
    clientId?: string;
    clientSecret?: string;
    refreshToken?: string;
    accessToken?: string;
    tokenExpiry?: Date;
  };

  // Account settings
  settings: {
    checkInterval: number; // Minutes between email checks
    autoDownload: boolean; // Auto download emails
    downloadLimit: number; // Max emails to download per check
    deleteFromServer: boolean; // For POP3
    leaveOnServer: boolean; // For POP3
    syncFolders: string[]; // Folders to sync
  };

  // Account statistics
  stats: {
    totalEmails: number;
    unreadEmails: number;
    lastSyncAt?: Date;
    lastErrorAt?: Date;
    lastError?: string;
  };

  // Account status
  status: "active" | "inactive" | "error" | "syncing";
  lastTestedAt?: Date;
  connectionStatus: "connected" | "disconnected" | "error";

  // Enhanced sync state tracking for Gmail API optimization
  syncState?: {
    lastHistoryId?: string;
    syncStatus: "initial" | "historical" | "partial" | "complete" | "error";
    lastSyncAt?: Date;
    syncProgress?: {
      totalProcessed: number;
      currentBatch: number;
      estimatedTotal: number;
    };
    watchExpiration?: Date;
    lastWatchRenewal?: Date;
    isWatching?: boolean;
    quotaUsage?: {
      daily: number;
      lastReset: Date;
    };
  };

  createdAt: Date;
  updatedAt: Date;
}

const EmailAccountSchema = new Schema<IEmailAccount>({
  userId: { type: String, required: true, index: true },
  accountName: { type: String, required: true },
  emailAddress: { type: String, required: true, lowercase: true },
  displayName: { type: String },

  accountType: {
    type: String,
    enum: ["imap", "pop3", "exchange", "gmail", "outlook", "custom"],
    required: true,
  },
  isActive: { type: Boolean, default: true },
  isPrimary: { type: Boolean, default: false },

  incomingServer: {
    host: { type: String, required: true },
    port: { type: Number, required: true },
    security: { type: String, enum: ["none", "ssl", "tls", "starttls"], default: "ssl" },
    username: { type: String, required: true },
    password: { type: String, required: true }, // Encrypt in production
  },

  outgoingServer: {
    host: { type: String, required: true },
    port: { type: Number, required: true },
    security: { type: String, enum: ["none", "ssl", "tls", "starttls"], default: "ssl" },
    username: { type: String, required: true },
    password: { type: String, required: true }, // Encrypt in production
    requiresAuth: { type: Boolean, default: true },
  },

  oauth: {
    provider: { type: String, enum: ["gmail", "outlook", "yahoo"] },
    clientId: { type: String },
    clientSecret: { type: String },
    refreshToken: { type: String },
    accessToken: { type: String },
    tokenExpiry: { type: Date },
  },

  settings: {
    checkInterval: { type: Number, default: 15 }, // 15 minutes
    autoDownload: { type: Boolean, default: true },
    downloadLimit: { type: Number, default: 100 },
    deleteFromServer: { type: Boolean, default: false },
    leaveOnServer: { type: Boolean, default: true },
    syncFolders: [{ type: String, default: ["INBOX"] }],
  },

  stats: {
    totalEmails: { type: Number, default: 0 },
    unreadEmails: { type: Number, default: 0 },
    lastSyncAt: { type: Date },
    lastErrorAt: { type: Date },
    lastError: { type: String },
  },

  status: {
    type: String,
    enum: ["active", "inactive", "error", "syncing"],
    default: "active",
  },
  lastTestedAt: { type: Date },
  connectionStatus: {
    type: String,
    enum: ["connected", "disconnected", "error"],
    default: "disconnected",
  },

  // Enhanced sync state tracking
  syncState: {
    lastHistoryId: { type: String },
    syncStatus: {
      type: String,
      enum: ["initial", "historical", "partial", "complete", "error"],
      default: "initial",
    },
    lastSyncAt: { type: Date },
    syncProgress: {
      totalProcessed: { type: Number, default: 0 },
      currentBatch: { type: Number, default: 0 },
      estimatedTotal: { type: Number, default: 0 },
    },
    watchExpiration: { type: Date },
    lastWatchRenewal: { type: Date },
    quotaUsage: {
      daily: { type: Number, default: 0 },
      lastReset: { type: Date, default: Date.now },
    },
  },

  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

// Indexes for efficient querying
EmailAccountSchema.index({ userId: 1, emailAddress: 1 });
EmailAccountSchema.index({ "syncState.syncStatus": 1 });
EmailAccountSchema.index({ "syncState.watchExpiration": 1 });

export const EmailAccountModel = models.EmailAccount || model<IEmailAccount>("EmailAccount", EmailAccountSchema);
