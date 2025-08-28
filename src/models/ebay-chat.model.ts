import mongoose, { Schema, Document } from "mongoose";
import { IEbayChat, IEbayConversation, EbayMessageType, EbayMessageStatus } from "@/contracts/ebay-chat.contract";

// eBay Chat Message Schema
export interface IEbayChatDocument extends Omit<IEbayChat, '_id'>, Document {}

const ebayChatSchema = new Schema<IEbayChatDocument>(
  {
    ebayItemId: {
      type: String,
      required: true,
      index: true,
    },
    orderId: {
      type: String,
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
      index: true,
    },
    messageType: {
      type: String,
      enum: Object.values(EbayMessageType),
      required: true,
    },
    content: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      enum: Object.values(EbayMessageStatus),
      default: EbayMessageStatus.SENT,
    },
    sentAt: {
      type: Date,
      required: true,
      default: Date.now,
    },
    attachments: [{
      type: String,
    }],
    isRead: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for better query performance
ebayChatSchema.index({ ebayItemId: 1, buyerUsername: 1 });
ebayChatSchema.index({ sellerUsername: 1, createdAt: -1 });
ebayChatSchema.index({ orderId: 1 });
ebayChatSchema.index({ isRead: 1, sellerUsername: 1 });

// eBay Conversation Schema
export interface IEbayConversationDocument extends Omit<IEbayConversation, '_id'>, Document {}

const ebayConversationSchema = new Schema<IEbayConversationDocument>(
  {
    ebayItemId: {
      type: String,
      required: true,
      index: true,
    },
    orderId: {
      type: String,
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
      index: true,
    },
    itemTitle: {
      type: String,
    },
    itemPrice: {
      type: Number,
    },
    lastMessage: {
      type: String,
      required: true,
    },
    lastMessageAt: {
      type: Date,
      required: true,
      default: Date.now,
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
ebayConversationSchema.index({ sellerUsername: 1, lastMessageAt: -1 });
ebayConversationSchema.index({ ebayItemId: 1, buyerUsername: 1 }, { unique: true });
ebayConversationSchema.index({ orderId: 1 });

// Create models
export const EbayChatModel = mongoose.model<IEbayChatDocument>("EbayChat", ebayChatSchema);
export const EbayConversationModel = mongoose.model<IEbayConversationDocument>("EbayConversation", ebayConversationSchema);
