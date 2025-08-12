import { Schema, model, models } from "mongoose";
import { IEmailThread } from "@/contracts/mailbox.contract";

const EmailThreadSchema = new Schema<IEmailThread>(
  {
    threadId: {
      type: String,
      required: true,
      // Removed unique constraint and index temporarily
    },
    accountId: {
      type: Schema.Types.ObjectId,
      ref: "EmailAccount",
      required: true,
      // Removed index temporarily
    },
    subject: {
      type: String,
      required: true,
      trim: true,
      // Removed index temporarily
    },
    normalizedSubject: {
      type: String,
      required: true,
      trim: true,
      // Removed index temporarily
    },
    participants: [
      {
        email: { type: String, required: true },
        name: { type: String },
      },
    ],
    messageCount: {
      type: Number,
      default: 0,
      // Removed index temporarily
    },
    unreadCount: {
      type: Number,
      default: 0,
      // Removed index temporarily
    },
    firstMessageAt: {
      type: Date,
      required: true,
      default: Date.now,
      // Removed index temporarily
    },
    lastMessageAt: {
      type: Date,
      required: true,
      default: Date.now,
      // Removed index temporarily
    },
    status: {
      type: String,
      enum: ["active", "closed", "archived", "spam"],
      default: "active",
      // Removed index temporarily
    },
    folder: {
      type: String,
      default: "INBOX",
      // Removed index temporarily
    },
    tags: [{ type: String }], // Removed index temporarily
    labels: [{ type: String }], // Removed index temporarily
    category: { type: String }, // Removed index temporarily

    // Thread metadata
    threadType: {
      type: String,
      enum: ["conversation", "notification", "marketing", "system"],
      default: "conversation",
      // Removed index temporarily
    },
    isStarred: {
      type: Boolean,
      default: false,
      // Removed index temporarily
    },
    isPinned: {
      type: Boolean,
      default: false,
      // Removed index temporarily
    },

    // Assignment and relationships
    assignedTo: {
      type: Schema.Types.ObjectId,
      ref: "User",
      // Removed index temporarily
    },
    assignedAt: { type: Date },
    relatedOrderId: {
      type: Schema.Types.ObjectId,
      ref: "Order",
      index: true,
    },
    relatedCustomerId: {
      type: Schema.Types.ObjectId,
      ref: "Customer",
      index: true,
    },
    relatedTicketId: {
      type: Schema.Types.ObjectId,
      ref: "Ticket",
      index: true,
    },

    // Thread statistics
    totalSize: {
      type: Number,
      default: 0,
    },
    hasAttachments: {
      type: Boolean,
      default: false,
      index: true,
    },
    lastActivity: {
      type: Date,
      default: Date.now,
      index: true,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Indexes for better query performance
EmailThreadSchema.index({ threadId: 1 }, { unique: true });
EmailThreadSchema.index({ accountId: 1, lastMessageAt: -1 }); // Account threads by latest activity
EmailThreadSchema.index({ accountId: 1, status: 1, lastMessageAt: -1 }); // Account threads by status
EmailThreadSchema.index({ accountId: 1, folder: 1, lastMessageAt: -1 }); // Account threads by folder
EmailThreadSchema.index({ accountId: 1, isStarred: 1, lastMessageAt: -1 }); // Starred threads
EmailThreadSchema.index({ accountId: 1, unreadCount: 1, lastMessageAt: -1 }); // Unread threads
EmailThreadSchema.index({ "participants.email": 1, lastMessageAt: -1 }); // Participant threads
EmailThreadSchema.index({ assignedTo: 1, lastMessageAt: -1 }); // Assigned threads
EmailThreadSchema.index({ status: 1, lastMessageAt: -1 }); // Status-based queries
EmailThreadSchema.index({ normalizedSubject: 1, accountId: 1 }); // Subject-based thread lookup
EmailThreadSchema.index({ relatedOrderId: 1 }); // Order-related threads
EmailThreadSchema.index({ relatedCustomerId: 1 }); // Customer-related threads
EmailThreadSchema.index({ hasAttachments: 1, lastMessageAt: -1 }); // Threads with attachments

// Compound indexes for common queries
EmailThreadSchema.index({ accountId: 1, threadType: 1, lastMessageAt: -1 });
EmailThreadSchema.index({ accountId: 1, isPinned: 1, lastMessageAt: -1 });
EmailThreadSchema.index({ accountId: 1, category: 1, lastMessageAt: -1 });

// Virtual for thread preview (first email content)
EmailThreadSchema.virtual("preview").get(function () {
  // This would be populated separately in the service
  return "";
});

// Virtual for thread participants count
EmailThreadSchema.virtual("participantCount").get(function () {
  return this.participants?.length || 0;
});

// Method to update thread statistics
EmailThreadSchema.methods.updateStats = async function () {
  const { EmailModel } = await import("@/models/email.model");

  const emails = await EmailModel.find({ threadId: this.threadId, accountId: this.accountId });

  this.messageCount = emails.length;
  this.unreadCount = emails.filter((e) => !e.isRead).length;
  this.hasAttachments = emails.some((e) => e.attachments && e.attachments.length > 0);
  this.totalSize = emails.reduce((sum, e) => sum + (e.textContent?.length || 0) + (e.htmlContent?.length || 0), 0);

  if (emails.length > 0) {
    this.firstMessageAt = emails[0].receivedAt;
    this.lastMessageAt = emails[emails.length - 1].receivedAt;
    this.lastActivity = this.lastMessageAt;
  }

  return this.save();
};

export const EmailThreadModel = models.EmailThread || model<IEmailThread>("EmailThread", EmailThreadSchema);
export { IEmailThread };
