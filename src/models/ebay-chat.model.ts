import { Schema, model, models } from "mongoose";
import {
  IEbayChat,
  IEbayConversation,
  IEbayChatModel,
  IEbayConversationModel,
  EbayMessageType,
  EbayMessageStatus,
} from "@/contracts/ebay-chat.contract";

// eBay Message Schema
const EbayChatSchema = new Schema<IEbayChat, IEbayChatModel>(
  {
    ebayItemId: {
      type: String,
      required: true,
      index: true,
    },
    ebayTransactionId: {
      type: String,
      sparse: true,
    },
    buyerUsername: {
      type: String,
      required: true,
      index: true,
    },
    sellerUsername: {
      type: String,
      required: true,
      index: true,
    },
    messageType: {
      type: String,
      enum: Object.values(EbayMessageType),
      default: EbayMessageType.BUYER_TO_SELLER,
    },
    subject: {
      type: String,
      maxlength: 200,
    },
    content: {
      type: String,
      required: true,
      maxlength: 4000,
    },
    status: {
      type: String,
      enum: Object.values(EbayMessageStatus),
      default: EbayMessageStatus.SENT,
    },
    ebayMessageId: {
      type: String,
      sparse: true,
    },
    ebayTimestamp: {
      type: Date,
    },
    readAt: {
      type: Date,
    },
    sentAt: {
      type: Date,
      default: Date.now,
    },
    attachments: [
      {
        fileName: {
          type: String,
          required: true,
        },
        fileUrl: {
          type: String,
          required: true,
        },
        fileSize: {
          type: Number,
          required: true,
        },
        fileType: {
          type: String,
          required: true,
        },
      },
    ],
    metadata: {
      listingTitle: String,
      listingUrl: String,
      orderId: String,
    },
  },
  {
    timestamps: true,
  }
);

// eBay Conversation Schema
const EbayConversationSchema = new Schema<IEbayConversation, IEbayConversationModel>(
  {
    ebayItemId: {
      type: String,
      required: true,
      index: true,
    },
    buyerUsername: {
      type: String,
      required: true,
      index: true,
    },
    sellerUsername: {
      type: String,
      required: true,
    },
    listingTitle: {
      type: String,
      required: true,
    },
    listingUrl: {
      type: String,
    },
    lastMessage: {
      type: String,
      maxlength: 200,
    },
    lastMessageAt: {
      type: Date,
    },
    unreadCount: {
      type: Number,
      default: 0,
    },
    totalMessages: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for better query performance
EbayChatSchema.index({ ebayItemId: 1, buyerUsername: 1, createdAt: -1 });
EbayChatSchema.index({ sellerUsername: 1, createdAt: -1 });

EbayChatSchema.index({ content: "text" });

EbayConversationSchema.index({ ebayItemId: 1, buyerUsername: 1 }, { unique: true });
EbayConversationSchema.index({ sellerUsername: 1, lastMessageAt: -1 });

export const EbayChatModel = models.EbayChat || model<IEbayChat>("EbayChat", EbayChatSchema);
export const EbayConversationModel =
  models.EbayConversation || model<IEbayConversation>("EbayConversation", EbayConversationSchema);
