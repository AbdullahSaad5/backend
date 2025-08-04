import { Schema, model, models } from "mongoose";
import { IEmail, EmailDirection, EmailType, EmailStatus, EmailPriority } from "@/contracts/mailbox.contract";
import _ from "lodash";

const EmailSchema = new Schema<IEmail>(
  {
    messageId: { type: String, required: true },
    threadId: { type: String },
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
    subject: { type: String, required: true },
    textContent: { type: String },
    htmlContent: { type: String },
    from: { email: { type: String, required: true }, name: { type: String } },
    to: [{ _id: false, email: { type: String, required: true }, name: { type: String } }],
    cc: [{ _id: false, email: { type: String }, name: { type: String } }],
    bcc: [{ _id: false, email: { type: String }, name: { type: String } }],
    replyTo: { _id: false, email: { type: String }, name: { type: String } },
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
    amazonOrderId: { type: String },
    amazonBuyerId: { type: String },
    amazonMarketplace: { type: String },
    amazonASIN: { type: String },
    ebayItemId: { type: String },
    ebayTransactionId: { type: String },
    ebayBuyerId: { type: String },
    receivedAt: { type: Date, required: true, default: Date.now },
    processedAt: { type: Date },
    sentAt: { type: Date },
    readAt: { type: Date },
    repliedAt: { type: Date },
    forwardedAt: { type: Date },
    archivedAt: { type: Date },
    spamMarkedAt: { type: Date },
    isRead: { type: Boolean, default: false },
    isReplied: { type: Boolean, default: false },
    isForwarded: { type: Boolean, default: false },
    isArchived: { type: Boolean, default: false },
    isSpam: { type: Boolean, default: false },
    tags: [{ type: String }],
    category: { type: String },
    labels: [{ type: String }],
    assignedTo: { type: Schema.Types.ObjectId, ref: "User" },
    assignedAt: { type: Date },
    relatedOrderId: { type: Schema.Types.ObjectId, ref: "Order" },
    relatedCustomerId: { type: Schema.Types.ObjectId, ref: "Customer" },
    relatedTicketId: { type: Schema.Types.ObjectId, ref: "Ticket" },
    rawEmailData: { type: Schema.Types.Mixed },
  },
  {
    timestamps: true,
  }
);

EmailSchema.index({ messageId: 1 }, { unique: true });
EmailSchema.index({ threadId: 1 });
EmailSchema.index({ "from.email": 1 });
EmailSchema.index({ "to.email": 1 });
EmailSchema.index({ amazonOrderId: 1 });
EmailSchema.index({ ebayItemId: 1 });
EmailSchema.index({ subject: 1 });
EmailSchema.index({ receivedAt: -1 });
// Optimized indexes for thread processing
EmailSchema.index({ messageId: 1, threadId: 1 });
EmailSchema.index({ threadId: 1, receivedAt: -1 });

export const EmailModel = models.Email || model<IEmail>("Email", EmailSchema);
