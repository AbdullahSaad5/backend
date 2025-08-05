import { Schema, model, models } from "mongoose";

export interface IEmailAccount {
  _id?: string;
  userId: string; // Admin/User who owns this email account
  accountName: string; // Display name for the account
  emailAddress: string; // The actual email address
  displayName?: string; // Display name for outgoing emails
  
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
  
  createdAt: Date;
  updatedAt: Date;
}

const EmailAccountSchema = new Schema<IEmailAccount>(
  {
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
  },
  {
    timestamps: true,
  }
);

// Indexes
EmailAccountSchema.index({ userId: 1, emailAddress: 1 }, { unique: true });
EmailAccountSchema.index({ userId: 1, isPrimary: 1 });
EmailAccountSchema.index({ emailAddress: 1 });
EmailAccountSchema.index({ status: 1, isActive: 1 });

// Ensure only one primary account per user
EmailAccountSchema.pre("save", async function (next) {
  if (this.isPrimary && this.isModified("isPrimary")) {
    // Remove primary flag from other accounts of the same user
    await EmailAccountModel.updateMany(
      { userId: this.userId, _id: { $ne: this._id } },
      { $set: { isPrimary: false } }
    );
  }
  next();
});

export const EmailAccountModel = models.EmailAccount || model<IEmailAccount>("EmailAccount", EmailAccountSchema);
