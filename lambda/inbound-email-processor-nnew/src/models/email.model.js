"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EmailModel = exports.EmailPriority = exports.EmailDirection = exports.EmailStatus = exports.EmailType = void 0;
const mongoose_1 = require("mongoose");
var EmailType;
(function (EmailType) {
  EmailType["AMAZON_ORDER"] = "amazon_order";
  EmailType["AMAZON_NOTIFICATION"] = "amazon_notification";
  EmailType["BUYER_MESSAGE"] = "buyer_message";
  EmailType["EBAY_MESSAGE"] = "ebay_message";
  EmailType["GENERAL"] = "general";
  EmailType["MARKETING"] = "marketing";
  EmailType["SYSTEM"] = "system";
  EmailType["SUPPORT"] = "support";
})(EmailType || (exports.EmailType = EmailType = {}));
var EmailStatus;
(function (EmailStatus) {
  EmailStatus["RECEIVED"] = "received";
  EmailStatus["PROCESSING"] = "processing";
  EmailStatus["PROCESSED"] = "processed";
  EmailStatus["FAILED"] = "failed";
  EmailStatus["ARCHIVED"] = "archived";
  EmailStatus["SPAM"] = "spam";
})(EmailStatus || (exports.EmailStatus = EmailStatus = {}));
var EmailDirection;
(function (EmailDirection) {
  EmailDirection["INBOUND"] = "inbound";
  EmailDirection["OUTBOUND"] = "outbound";
})(EmailDirection || (exports.EmailDirection = EmailDirection = {}));
var EmailPriority;
(function (EmailPriority) {
  EmailPriority["LOW"] = "low";
  EmailPriority["NORMAL"] = "normal";
  EmailPriority["HIGH"] = "high";
  EmailPriority["URGENT"] = "urgent";
})(EmailPriority || (exports.EmailPriority = EmailPriority = {}));
const EmailSchema = new mongoose_1.Schema(
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
    isRead: { type: Boolean, default: false },
    isReplied: { type: Boolean, default: false },
    isForwarded: { type: Boolean, default: false },
    isArchived: { type: Boolean, default: false },
    isSpam: { type: Boolean, default: false },
    tags: [{ type: String }],
    category: { type: String },
    labels: [{ type: String }],
    assignedTo: { type: mongoose_1.Schema.Types.ObjectId, ref: "User" },
    assignedAt: { type: Date },
    relatedOrderId: { type: mongoose_1.Schema.Types.ObjectId, ref: "Order" },
    relatedCustomerId: { type: mongoose_1.Schema.Types.ObjectId, ref: "Customer" },
    relatedTicketId: { type: mongoose_1.Schema.Types.ObjectId, ref: "Ticket" },
    rawEmailData: { type: mongoose_1.Schema.Types.Mixed },
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
exports.EmailModel = mongoose_1.models.Email || (0, mongoose_1.model)("Email", EmailSchema);
