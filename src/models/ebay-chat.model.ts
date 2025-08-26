import mongoose, { Schema, Document } from "mongoose";

export interface IEbayChatMessage extends Document {
  messageId: string;
  orderId: string;
  sender: {
    username: string;
    role: "BUYER" | "SELLER";
  };
  recipient: {
    username: string;
    role: "BUYER" | "SELLER";
  };
  subject: string;
  message: string;
  timestamp: Date;
  read: boolean;
  ebayMessageId?: string; // eBay's internal message ID
  createdAt: Date;
  updatedAt: Date;
}

const ebayChatMessageSchema = new Schema<IEbayChatMessage>(
  {
    messageId: {
      type: String,
      required: true,
      unique: true,
    },
    orderId: {
      type: String,
      required: true,
      index: true,
    },
    sender: {
      username: {
        type: String,
        required: true,
      },
      role: {
        type: String,
        enum: ["BUYER", "SELLER"],
        required: true,
      },
    },
    recipient: {
      username: {
        type: String,
        required: true,
      },
      role: {
        type: String,
        enum: ["BUYER", "SELLER"],
        required: true,
      },
    },
    subject: {
      type: String,
      required: true,
    },
    message: {
      type: String,
      required: true,
    },
    timestamp: {
      type: Date,
      required: true,
    },
    read: {
      type: Boolean,
      default: false,
    },
    ebayMessageId: {
      type: String,
      sparse: true,
    },
  },
  {
    timestamps: true,
  }
);

// Index for efficient querying
ebayChatMessageSchema.index({ orderId: 1, timestamp: -1 });
ebayChatMessageSchema.index({ sender: 1, timestamp: -1 });
ebayChatMessageSchema.index({ recipient: 1, timestamp: -1 });

export const EbayChatMessage = mongoose.model<IEbayChatMessage>("EbayChatMessage", ebayChatMessageSchema);

// Additional models for sandbox functionality
export interface IEbayChat extends Document {
  ebayItemId: string;
  buyerUsername: string;
  sellerUsername: string;
  content: string;
  messageType: "BUYER_TO_SELLER" | "SELLER_TO_BUYER";
  status: "SENT" | "DELIVERED" | "READ" | "FAILED";
  sentAt?: Date;
  deliveredAt?: Date;
  readAt?: Date;
}

const ebayChatSchema = new Schema<IEbayChat>(
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
      index: true,
    },
    content: {
      type: String,
      required: true,
    },
    messageType: {
      type: String,
      enum: ["BUYER_TO_SELLER", "SELLER_TO_BUYER"],
      required: true,
    },
    status: {
      type: String,
      enum: ["SENT", "DELIVERED", "READ", "FAILED"],
      default: "SENT",
    },
    sentAt: Date,
    deliveredAt: Date,
    readAt: Date,
  },
  {
    timestamps: true,
  }
);

export interface IEbayConversation extends Document {
  ebayItemId: string;
  buyerUsername: string;
  sellerUsername: string;
  lastMessage: string;
  lastMessageAt: Date;
  unreadCount: number;
}

const ebayConversationSchema = new Schema<IEbayConversation>(
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
      index: true,
    },
    lastMessage: {
      type: String,
      required: true,
    },
    lastMessageAt: {
      type: Date,
      required: true,
    },
    unreadCount: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for efficient querying
ebayChatSchema.index({ ebayItemId: 1, buyerUsername: 1, createdAt: -1 });
ebayChatSchema.index({ sellerUsername: 1, createdAt: -1 });
ebayConversationSchema.index({ sellerUsername: 1, lastMessageAt: -1 });
ebayConversationSchema.index({ ebayItemId: 1, buyerUsername: 1 }, { unique: true });

export const EbayChatModel = mongoose.model<IEbayChat>("EbayChat", ebayChatSchema);
export const EbayConversationModel = mongoose.model<IEbayConversation>("EbayConversation", ebayConversationSchema);
