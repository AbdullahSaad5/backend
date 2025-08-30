import { Schema, model, models } from "mongoose";

export interface IIMAPThread {
  threadId: string;
  accountId: Schema.Types.ObjectId;

  // IMAP-specific raw data
  rawIMAPData: {
    threadId: string;
    messages: Array<{
      messageId: string;
      subject: string;
      from: any;
      to: any[];
      cc?: any[];
      date: string;
      headers: Record<string, string>;
      bodyPreview: string;
      hasAttachments: boolean;
      flags: string[];
      uid?: number;
      seq?: number;
    }>;
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

const IMAPThreadSchema = new Schema<IIMAPThread>(
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

    // IMAP-specific raw data
    rawIMAPData: {
      threadId: { type: String, required: true },
      messages: [
        {
          messageId: { type: String, required: true },
          subject: { type: String, default: "" },
          from: { type: Schema.Types.Mixed },
          to: [{ type: Schema.Types.Mixed }],
          cc: [{ type: Schema.Types.Mixed }],
          date: { type: String, required: true },
          headers: { type: Schema.Types.Mixed },
          bodyPreview: { type: String, default: "" },
          hasAttachments: { type: Boolean, default: false },
          flags: [{ type: String }],
          uid: { type: Number },
          seq: { type: Number },
        },
      ],
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
    collection: "imap_threads", // Explicit collection name
  }
);

// Compound indexes for efficient queries
IMAPThreadSchema.index({ threadId: 1, accountId: 1 }, { unique: true });
IMAPThreadSchema.index({ accountId: 1, lastActivity: -1 });
IMAPThreadSchema.index({ accountId: 1, status: 1, lastActivity: -1 });
IMAPThreadSchema.index({ accountId: 1, folder: 1, lastActivity: -1 });
IMAPThreadSchema.index({ accountId: 1, isStarred: 1, lastActivity: -1 });
IMAPThreadSchema.index({ accountId: 1, unreadCount: 1, lastActivity: -1 });
IMAPThreadSchema.index({ accountId: 1, category: 1, lastActivity: -1 });
IMAPThreadSchema.index({ "participants.email": 1, lastActivity: -1 });

export const IMAPThreadModel = models.IMAPThread || model<IIMAPThread>("IMAPThread", IMAPThreadSchema);
