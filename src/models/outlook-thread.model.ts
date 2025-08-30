import { Schema, model, models } from "mongoose";

export interface IOutlookThread {
  conversationId: string;
  accountId: Schema.Types.ObjectId;

  // Outlook-specific raw data (lightweight - only metadata)
  rawOutlookData: {
    conversationId: string;
    messageIds: string[]; // Only store message IDs, not full content
    messageCount: number;
    lastMessageId: string;
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

const OutlookThreadSchema = new Schema<IOutlookThread>(
  {
    conversationId: {
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

    // Outlook-specific raw data (lightweight - only metadata)
    rawOutlookData: {
      conversationId: { type: String, required: true },
      messageIds: [{ type: String }], // Only store message IDs
      messageCount: { type: Number, required: true },
      lastMessageId: { type: String, required: true },
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
      email: { type: String, required: true },
      name: { type: String },
    },
    latestEmailTo: [
      {
        email: { type: String, required: true },
        name: { type: String },
      },
    ],
    latestEmailPreview: { type: String, default: "" },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
    collection: "outlook_threads", // Explicit collection name
  }
);

// Compound indexes for efficient queries
OutlookThreadSchema.index({ conversationId: 1, accountId: 1 }, { unique: true });
OutlookThreadSchema.index({ accountId: 1, lastActivity: -1 });
OutlookThreadSchema.index({ accountId: 1, status: 1, lastActivity: -1 });
OutlookThreadSchema.index({ accountId: 1, folder: 1, lastActivity: -1 });
OutlookThreadSchema.index({ accountId: 1, isStarred: 1, lastActivity: -1 });
OutlookThreadSchema.index({ accountId: 1, unreadCount: 1, lastActivity: -1 });
OutlookThreadSchema.index({ accountId: 1, category: 1, lastActivity: -1 });
OutlookThreadSchema.index({ "participants.email": 1, lastActivity: -1 });

export const OutlookThreadModel = models.OutlookThread || model<IOutlookThread>("OutlookThread", OutlookThreadSchema);
