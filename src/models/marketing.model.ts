import { Schema, model, Document } from 'mongoose';

// SMS Message Schema
export interface ISMSMessage extends Document {
  to: string;
  from: string;
  message: string;
  status: 'sent' | 'delivered' | 'failed';
  createdAt: Date;
}

const smsMessageSchema = new Schema({
  to: { type: String, required: true },
  from: { type: String, required: true },
  message: { type: String, required: true },
  status: { type: String, enum: ['sent', 'delivered', 'failed'], default: 'sent' },
  createdAt: { type: Date, default: Date.now },
});

export const SMSMessage = model<ISMSMessage>('SMSMessage', smsMessageSchema);

// Email Message Schema
export interface IEmailMessage extends Document {
  to: string;
  from: string;
  subject: string;
  body: string;
  status: 'sent' | 'delivered' | 'failed';
  createdAt: Date;
}

const emailMessageSchema = new Schema({
  to: { type: String, required: true },
  from: { type: String, required: true },
  subject: { type: String, required: true },
  body: { type: String, required: true },
  status: { type: String, enum: ['sent', 'delivered', 'failed'], default: 'sent' },
  createdAt: { type: Date, default: Date.now },
});

export const EmailMessage = model<IEmailMessage>('EmailMessage', emailMessageSchema);

// Marketing Campaign Schema
export interface IMarketingCampaign extends Document {
  name: string;
  subject: string;
  message: string;
  recipients: string[];
  sentAt: Date;
  status: 'draft' | 'scheduled' | 'sent';
}

const marketingCampaignSchema = new Schema({
  name: { type: String, required: true },
  subject: { type: String },
  message: { type: String, required: true },
  recipients: [{ type: String }],
  sentAt: { type: Date },
  status: { type: String, enum: ['draft', 'scheduled', 'sent'], default: 'draft' },
});

export const MarketingCampaign = model<IMarketingCampaign>('MarketingCampaign', marketingCampaignSchema);

// Newsletter Subscriber Schema
export interface INewsletterSubscriber extends Document {
  email: string;
  subscribedAt: Date;
}

const newsletterSubscriberSchema = new Schema({
  email: { type: String, required: true, unique: true },
  subscribedAt: { type: Date, default: Date.now },
});

export const NewsletterSubscriber = model<INewsletterSubscriber>('NewsletterSubscriber', newsletterSubscriberSchema);
