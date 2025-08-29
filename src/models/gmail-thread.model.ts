import { Schema, model, models } from "mongoose";

export interface IGmailThread {
  threadId: string;
  accountId: string | Schema.Types.ObjectId;

  // Gmail-specific lightweight metadata only
  rawGmailData: {
    threadId: string;
    historyId?: string;
    messageIds: string[]; // Just the IDs for on-demand fetching
    messageCount: number;
    labelIds: string[]; // Combined labels from all messages
    // NO payload data - fetched on-demand when opening thread
  };

  // Computed metadata for quick access
  subject: string;
  normalizedSubject: string;
  participants: Array<{
    email: string;
    name?: string;
  }>;
  messageCount: number;
  unreadCount: number;
  isStarred: boolean;
  hasAttachments: boolean;
  firstMessageAt: Date;
  lastMessageAt: Date;
  lastActivity: Date;
  status: "active" | "archived" | "spam";
  folder: string;
  category: string;
  threadType: "conversation" | "notification" | "marketing" | "system";
  isPinned: boolean;
  totalSize: number;

  // Latest email metadata for frontend
  latestEmailFrom: {
    email: string;
    name?: string;
  };
  latestEmailTo: Array<{
    email: string;
    name?: string;
  }>;
  latestEmailPreview: string;

  // Timestamps
  createdAt: Date;
  updatedAt: Date;
}

const GmailThreadSchema = new Schema<IGmailThread>(
  {
    threadId: {
      type: String,
      required: true,
      index: true,
    },
    accountId: {
      type: Schema.Types.ObjectId,
      ref: "EmailAccount",
      required: true,
      index: true,
    },

    // Gmail-specific lightweight metadata only
    rawGmailData: {
      threadId: { type: String, required: true },
      historyId: { type: String },
      messageIds: [{ type: String }], // Just the IDs for on-demand fetching
      messageCount: { type: Number, default: 0 },
      labelIds: [{ type: String }], // Combined labels from all messages
      // NO payload data - fetched on-demand when opening thread
    },

    // Computed metadata
    subject: { type: String, required: true, index: true },
    normalizedSubject: { type: String, required: true, index: true },
    participants: [
      {
        email: { type: String, required: true },
        name: { type: String },
      },
    ],
    messageCount: { type: Number, default: 0, index: true },
    unreadCount: { type: Number, default: 0, index: true },
    isStarred: { type: Boolean, default: false, index: true },
    hasAttachments: { type: Boolean, default: false, index: true },
    firstMessageAt: { type: Date, required: true, index: true },
    lastMessageAt: { type: Date, required: true, index: true },
    lastActivity: { type: Date, required: true, index: true },
    status: {
      type: String,
      enum: ["active", "archived", "spam"],
      default: "active",
      index: true,
    },
    folder: { type: String, default: "INBOX", index: true },
    category: { type: String, default: "primary", index: true },
    threadType: {
      type: String,
      enum: ["conversation", "notification", "marketing", "system"],
      default: "conversation",
      index: true,
    },
    isPinned: { type: Boolean, default: false, index: true },
    totalSize: { type: Number, default: 0 },

    // Latest email metadata
    latestEmailFrom: {
      email: { type: String, required: true, default: "unknown@example.com" },
      name: { type: String, default: "Unknown Sender" },
    },
    latestEmailTo: [
      {
        email: { type: String, required: true, default: "recipient@example.com" },
        name: { type: String, default: "Recipient" },
      },
    ],
    latestEmailPreview: { type: String, default: "" },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
    collection: "gmail_threads", // Explicit collection name
  }
);

// Compound indexes for efficient queries
GmailThreadSchema.index({ threadId: 1, accountId: 1 }, { unique: true });
GmailThreadSchema.index({ accountId: 1, lastActivity: -1 });
GmailThreadSchema.index({ accountId: 1, status: 1, lastActivity: -1 });
GmailThreadSchema.index({ accountId: 1, folder: 1, lastActivity: -1 });
GmailThreadSchema.index({ accountId: 1, isStarred: 1, lastActivity: -1 });
GmailThreadSchema.index({ accountId: 1, unreadCount: 1, lastActivity: -1 });
GmailThreadSchema.index({ accountId: 1, category: 1, lastActivity: -1 });
GmailThreadSchema.index({ "participants.email": 1, lastActivity: -1 });

export const GmailThreadModel = models.GmailThread || model<IGmailThread>("GmailThread", GmailThreadSchema);
