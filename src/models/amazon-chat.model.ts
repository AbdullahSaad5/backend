import { Schema, model, models } from "mongoose";

export interface IAmazonChat {
  orderId: string;
  buyerEmail?: string; // Make optional since Amazon doesn't always require it
  subject?: string;
  content: string;
  status: "sent" | "delivered" | "failed";
  amazonMessageId?: string;
  sentAt?: Date;
  attachments?: {
    fileName: string;
    fileUrl: string;
    fileSize: number;
    fileType: string;
  }[];
  metadata?: {
    [key: string]: any;
  };
  createdAt?: Date;
  updatedAt?: Date;
}

const AmazonChatSchema = new Schema<IAmazonChat>(
  {
    orderId: {
      type: String,
      required: true,
      index: true,
    },
    buyerEmail: {
      type: String,
      required: false, // Make it optional
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
      enum: ["sent", "delivered", "failed"],
      default: "sent",
    },
    amazonMessageId: {
      type: String,
      sparse: true,
    },
    sentAt: {
      type: Date,
      default: Date.now,
    },
    attachments: [
      {
        fileName: String,
        fileUrl: String,
        fileSize: Number,
        fileType: String,
      },
    ],
    metadata: {
      type: Object,
    },
  },
  {
    timestamps: true,
  }
);

AmazonChatSchema.index({ orderId: 1, buyerEmail: 1, createdAt: -1 });


export const AmazonChatModel = models.AmazonChat || model<IAmazonChat>("AmazonChat", AmazonChatSchema);
