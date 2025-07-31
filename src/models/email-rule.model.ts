import { Schema, model, models } from "mongoose";
import { IEmailRule } from "@/contracts/mailbox.contract";

const EmailRuleSchema = new Schema<IEmailRule>({
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
  isActive: {
    type: Boolean,
    default: true
  },
  priority: {
    type: Number,
    default: 100,
    min: 1,
    max: 1000
  },
  conditions: {
    from: [{ type: String }],
    to: [{ type: String }],
    subject: [{ type: String }],
    bodyContains: [{ type: String }],
    hasAttachment: { type: Boolean },
    emailType: [{
      type: String,
      enum: ['amazon_order', 'amazon_notification', 'buyer_message', 'ebay_message', 'general', 'marketing', 'system', 'support']
    }],
    headers: [{
      name: { type: String },
      value: { type: String }
    }]
  },
  actions: {
    setType: {
      type: String,
      enum: ['amazon_order', 'amazon_notification', 'buyer_message', 'ebay_message', 'general', 'marketing', 'system', 'support']
    },
    setPriority: {
      type: String,
      enum: ['low', 'normal', 'high', 'urgent']
    },
    addTags: [{ type: String }],
    assignTo: {
      type: Schema.Types.ObjectId,
      ref: 'User'
    },
    markAsSpam: { type: Boolean },
    archive: { type: Boolean },
    forward: [{ type: String }],
    autoReply: {
      templateId: {
        type: Schema.Types.ObjectId,
        ref: 'EmailTemplate'
      },
      variables: {
        type: Map,
        of: String
      }
    }
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
EmailRuleSchema.index({ isActive: 1, priority: 1 });
EmailRuleSchema.index({ name: 1 });
EmailRuleSchema.index({ createdBy: 1 });

export const EmailRuleModel = models.EmailRule || model<IEmailRule>('EmailRule', EmailRuleSchema);
