import { Schema, model, models } from "mongoose";
import { IEmailTemplate } from "@/contracts/mailbox.contract";

const EmailTemplateSchema = new Schema<IEmailTemplate>({
  name: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100
  },
  description: {
    type: String,
    trim: true,
    maxlength: 500
  },
  type: {
    type: String,
    enum: ['amazon_order', 'amazon_notification', 'buyer_message', 'ebay_message', 'general', 'marketing', 'system', 'support'],
    required: true
  },
  subject: {
    type: String,
    required: true,
    trim: true,
    maxlength: 200
  },
  htmlContent: {
    type: String,
    required: true
  },
  textContent: {
    type: String
  },
  variables: [{
    type: String,
    trim: true
  }],
  isActive: {
    type: Boolean,
    default: true
  },
  createdBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for better query performance
EmailTemplateSchema.index({ name: 1 });
EmailTemplateSchema.index({ type: 1, isActive: 1 });
EmailTemplateSchema.index({ createdBy: 1 });

export const EmailTemplateModel = models.EmailTemplate || model<IEmailTemplate>('EmailTemplate', EmailTemplateSchema);
