import { Schema, model, models } from "mongoose";
import { IEmail, EmailDirection, EmailType, EmailStatus, EmailPriority } from "@/contracts/mailbox.contract";
import _ from "lodash";

const EmailSchema = new Schema<IEmail>(
  {
    messageId: { type: String, required: true },
    threadId: { type: String, index: true }, // Gmail threadId or generated thread ID
    accountId: { type: Schema.Types.ObjectId, ref: "EmailAccount", required: true, index: true },
    direction: { type: String, enum: ["inbound", "outbound"], required: true },
    type: {
      type: String,
      enum: [
        "amazon_order",
        "amazon_notification",
        "buyer_message",
        "ebay_message",
        "general",
        "marketing",
        "system",
        "support",
      ],
      required: true,
    },
    status: {
      type: String,
      enum: ["received", "processing", "processed", "failed", "archived", "spam"],
      required: true,
    },
    priority: { type: String, enum: ["low", "normal", "high", "urgent"], default: "normal" },
    subject: { type: String, required: true, index: true },
    normalizedSubject: { type: String, index: true }, // Subject without Re:/Fwd: prefixes

    // Email content
    textContent: { type: String },
    htmlContent: { type: String },

    // Addresses
    from: { email: { type: String, required: true, index: true }, name: { type: String } },
    to: [{ _id: false, email: { type: String, required: true, index: true }, name: { type: String } }],
    cc: [{ _id: false, email: { type: String, index: true }, name: { type: String } }],
    bcc: [{ _id: false, email: { type: String, index: true }, name: { type: String } }],
    replyTo: { _id: false, email: { type: String, index: true }, name: { type: String } },

    // Threading headers (RFC 2822 standard)
    inReplyTo: { type: String, index: true }, // Message-ID this email is replying to
    references: [{ type: String, index: true }], // Chain of message IDs in conversation
    parentMessageId: { type: String, index: true }, // Direct parent message ID

    // Headers and attachments
    headers: [{ _id: false, name: { type: String }, value: { type: String } }],
    attachments: [
      {
        _id: false,
        fileName: { type: String },
        fileUrl: { type: String },
        fileSize: { type: Number },
        fileType: { type: String },
        contentId: { type: String },
      },
    ],

    // Platform-specific fields
    amazonOrderId: { type: String, index: true },
    amazonBuyerId: { type: String, index: true },
    amazonMarketplace: { type: String, index: true },
    amazonASIN: { type: String, index: true },
    ebayItemId: { type: String, index: true },
    ebayTransactionId: { type: String, index: true },
    ebayBuyerId: { type: String, index: true },

    // Timestamps
    receivedAt: { type: Date, required: true, default: Date.now, index: true },
    processedAt: { type: Date },
    sentAt: { type: Date },
    readAt: { type: Date },
    repliedAt: { type: Date },
    forwardedAt: { type: Date },
    archivedAt: { type: Date },
    spamMarkedAt: { type: Date },

    // Email flags and status
    isRead: { type: Boolean, default: false, index: true },
    isReplied: { type: Boolean, default: false },
    isForwarded: { type: Boolean, default: false },
    isArchived: { type: Boolean, default: false },
    isSpam: { type: Boolean, default: false },
    isStarred: { type: Boolean, default: false },

    // Labels and categorization
    tags: [{ type: String, index: true }],
    category: { type: String, index: true },
    labels: [{ type: String, index: true }],
    folder: { type: String, default: "INBOX", index: true },

    // Assignment and relationships
    assignedTo: { type: Schema.Types.ObjectId, ref: "User", index: true },
    assignedAt: { type: Date },
    relatedOrderId: { type: Schema.Types.ObjectId, ref: "Order", index: true },
    relatedCustomerId: { type: Schema.Types.ObjectId, ref: "Customer", index: true },
    relatedTicketId: { type: Schema.Types.ObjectId, ref: "Ticket", index: true },

    // Raw data for debugging
    rawEmailData: { type: Schema.Types.Mixed },

    // Thread metadata
    threadPosition: { type: Number, default: 0 }, // Position in thread (0 = first email)
    threadDepth: { type: Number, default: 0 }, // Depth in conversation tree
  },
  {
    timestamps: true,
  }
);

// Indexes for better query performance
EmailSchema.index({ messageId: 1 }, { unique: true });
EmailSchema.index({ threadId: 1, receivedAt: -1 }); // Thread emails in chronological order
EmailSchema.index({ accountId: 1, receivedAt: -1 }); // Account emails in chronological order
EmailSchema.index({ accountId: 1, threadId: 1 }); // Account threads
EmailSchema.index({ normalizedSubject: 1, "from.email": 1 }); // Subject + sender for thread matching
EmailSchema.index({ inReplyTo: 1 }); // Reply chain lookup
EmailSchema.index({ references: 1 }); // References chain lookup
EmailSchema.index({ "from.email": 1, receivedAt: -1 });
EmailSchema.index({ "to.email": 1, receivedAt: -1 });
EmailSchema.index({ isRead: 1, receivedAt: -1 }); // Unread emails
EmailSchema.index({ folder: 1, receivedAt: -1 }); // Folder emails
EmailSchema.index({ status: 1, receivedAt: -1 }); // Status-based queries

// Compound indexes for common queries
EmailSchema.index({ accountId: 1, isRead: 1, receivedAt: -1 });
EmailSchema.index({ accountId: 1, folder: 1, receivedAt: -1 });
EmailSchema.index({ accountId: 1, threadId: 1, receivedAt: -1 });

export const EmailModel = models.Email || model<IEmail>("Email", EmailSchema);
export { IEmail };

