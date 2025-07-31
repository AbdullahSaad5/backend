import { Schema, model, models } from "mongoose";
import { IEmailThread } from "@/contracts/mailbox.contract";

const EmailThreadSchema = new Schema<IEmailThread>({
  threadId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  subject: {
    type: String,
    required: true,
    trim: true
  },
  participants: [{
    email: { type: String, required: true },
    name: { type: String }
  }],
  messageCount: {
    type: Number,
    default: 0
  },
  lastMessageAt: {
    type: Date,
    required: true,
    default: Date.now
  },
  status: {
    type: String,
    enum: ['active', 'closed', 'archived'],
    default: 'active'
  },
  tags: [{ type: String }],
  assignedTo: {
    type: Schema.Types.ObjectId,
    ref: 'User'
  },
  relatedOrderId: {
    type: Schema.Types.ObjectId,
    ref: 'Order'
  },
  relatedCustomerId: {
    type: Schema.Types.ObjectId,
    ref: 'Customer'
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for better query performance
EmailThreadSchema.index({ threadId: 1 }, { unique: true });
EmailThreadSchema.index({ 'participants.email': 1 });
EmailThreadSchema.index({ assignedTo: 1, lastMessageAt: -1 });
EmailThreadSchema.index({ status: 1, lastMessageAt: -1 });
EmailThreadSchema.index({ relatedOrderId: 1 });

// Virtual to get unread count (would need to be populated separately)
EmailThreadSchema.virtual('unreadCount').get(function() {
  // This would be calculated separately in the service
  return 0;
});

export const EmailThreadModel = models.EmailThread || model<IEmailThread>('EmailThread', EmailThreadSchema);
