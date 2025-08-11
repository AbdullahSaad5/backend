import { Model, Types } from "mongoose";

export interface IEmailAttachment {
  fileName: string;
  fileUrl: string;
  fileSize: number;
  fileType: string;
  contentId?: string;
}

export interface IEmailHeader {
  name: string;
  value: string;
}

export interface IEmailAddress {
  email: string;
  name?: string;
}

export enum EmailType {
  AMAZON_ORDER = "amazon_order",
  AMAZON_NOTIFICATION = "amazon_notification",
  BUYER_MESSAGE = "buyer_message",
  EBAY_MESSAGE = "ebay_message",
  GENERAL = "general",
  MARKETING = "marketing",
  SYSTEM = "system",
  SUPPORT = "support",
}

export enum EmailStatus {
  RECEIVED = "received",
  PROCESSING = "processing",
  PROCESSED = "processed",
  FAILED = "failed",
  ARCHIVED = "archived",
  SPAM = "spam",
}

export enum EmailDirection {
  INBOUND = "inbound",
  OUTBOUND = "outbound",
}

export enum EmailPriority {
  LOW = "low",
  NORMAL = "normal",
  HIGH = "high",
  URGENT = "urgent",
}

export interface IEmail {
  id: Types.ObjectId;
  messageId: string;
  threadId?: string;
  accountId: Types.ObjectId; // Reference to email account
  direction: EmailDirection;
  type: EmailType;
  status: EmailStatus;
  priority: EmailPriority;

  // Email content
  subject: string;
  normalizedSubject?: string; // Subject without Re:/Fwd: prefixes
  textContent?: string;
  htmlContent?: string;

  // Addresses
  from: IEmailAddress;
  to: IEmailAddress[];
  cc?: IEmailAddress[];
  bcc?: IEmailAddress[];
  replyTo?: IEmailAddress;

  // Threading headers (RFC 2822 standard)
  inReplyTo?: string; // Message-ID this email is replying to
  references?: string[]; // Chain of message IDs in conversation
  parentMessageId?: string; // Direct parent message ID

  // Headers and attachments
  headers?: IEmailHeader[];
  attachments?: IEmailAttachment[];

  // Platform-specific fields
  amazonOrderId?: string;
  amazonBuyerId?: string;
  amazonMarketplace?: string;
  amazonASIN?: string;
  ebayItemId?: string;
  ebayTransactionId?: string;
  ebayBuyerId?: string;

  // Timestamps
  receivedAt: Date;
  processedAt?: Date;
  sentAt?: Date;
  readAt?: Date;
  repliedAt?: Date;
  forwardedAt?: Date;
  archivedAt?: Date;
  spamMarkedAt?: Date;

  // Email flags and status
  isRead: boolean;
  isReplied: boolean;
  isForwarded: boolean;
  isArchived: boolean;
  isSpam: boolean;
  isStarred?: boolean;

  // Labels and categorization
  tags?: string[];
  category?: string;
  labels?: string[];
  folder?: string;

  // Assignment and relationships
  assignedTo?: Types.ObjectId;
  assignedAt?: Date;
  relatedOrderId?: Types.ObjectId;
  relatedCustomerId?: Types.ObjectId;
  relatedTicketId?: Types.ObjectId;

  // Raw data for debugging
  rawEmailData?: any;

  // Thread metadata
  threadPosition?: number; // Position in thread (0 = first email)
  threadDepth?: number; // Depth in conversation tree

  // Timestamps
  createdAt: Date;
  updatedAt: Date;
}

export interface IEmailThread {
  id: Types.ObjectId;
  threadId: string;
  accountId: Types.ObjectId; // Reference to email account
  subject: string;
  normalizedSubject: string; // Subject without Re:/Fwd: prefixes
  participants: IEmailAddress[];
  messageCount: number;
  unreadCount: number;
  firstMessageAt: Date;
  lastMessageAt: Date;
  status: "active" | "closed" | "archived" | "spam";
  folder?: string;
  tags?: string[];
  labels?: string[];
  category?: string;

  // Thread metadata
  threadType?: "conversation" | "notification" | "marketing" | "system";
  isStarred?: boolean;
  isPinned?: boolean;

  // Assignment and relationships
  assignedTo?: Types.ObjectId;
  assignedAt?: Date;
  relatedOrderId?: Types.ObjectId;
  relatedCustomerId?: Types.ObjectId;
  relatedTicketId?: Types.ObjectId;

  // Thread statistics
  totalSize?: number;
  hasAttachments?: boolean;
  lastActivity?: Date;

  createdAt: Date;
  updatedAt: Date;
}

export interface IEmailTemplate {
  id: Types.ObjectId;
  name: string;
  description?: string;
  type: EmailType;
  subject: string;
  htmlContent: string;
  textContent?: string;
  variables?: string[]; // List of placeholder variables
  isActive: boolean;
  createdBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

export interface IEmailRule {
  id: Types.ObjectId;
  name: string;
  description?: string;
  isActive: boolean;
  priority: number;

  // Conditions
  conditions: {
    from?: string[];
    to?: string[];
    subject?: string[];
    bodyContains?: string[];
    hasAttachment?: boolean;
    emailType?: EmailType[];
    headers?: { name: string; value: string }[];
  };

  // Actions
  actions: {
    setType?: EmailType;
    setPriority?: EmailPriority;
    addTags?: string[];
    assignTo?: Types.ObjectId;
    markAsSpam?: boolean;
    archive?: boolean;
    forward?: string[];
    autoReply?: {
      templateId: Types.ObjectId;
      variables?: Record<string, string>;
    };
  };

  createdBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

export interface IMailboxStats {
  totalEmails: number;
  unreadEmails: number;
  todayEmails: number;
  weekEmails: number;
  monthEmails: number;
  spamEmails: number;
  archivedEmails: number;
  emailsByType: Record<EmailType, number>;
  emailsByStatus: Record<EmailStatus, number>;
  responseRate: number;
  averageResponseTime: number; // in minutes
}

// Service interfaces
export interface IEmailProcessingResult {
  success: boolean;
  email?: IEmail;
  error?: string;
  warnings?: string[];
  extractedData?: {
    orderId?: string;
    customerId?: string;
    productIds?: string[];
    amount?: number;
    currency?: string;
  };
}

export interface IEmailSearchCriteria {
  type?: EmailType[];
  status?: EmailStatus[];
  direction?: EmailDirection[];
  priority?: EmailPriority[];
  from?: string;
  to?: string;
  subject?: string;
  content?: string;
  hasAttachment?: boolean;
  dateFrom?: Date;
  dateTo?: Date;
  tags?: string[];
  assignedTo?: Types.ObjectId;
  isRead?: boolean;
  amazonOrderId?: string;
  ebayItemId?: string;
  limit?: number;
  offset?: number;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}

export interface IEmailBulkAction {
  emailIds: Types.ObjectId[];
  action: "markRead" | "markUnread" | "archive" | "unarchive" | "spam" | "notSpam" | "delete" | "assign";
  data?: {
    assignedTo?: Types.ObjectId;
    tags?: string[];
  };
}

// Webhook interfaces
export interface ISNSEmailNotification {
  Type: string;
  MessageId: string;
  TopicArn: string;
  Subject?: string;
  Message: string;
  Timestamp: string;
  SignatureVersion: string;
  Signature: string;
  SigningCertURL: string;
  UnsubscribeURL: string;
}

export interface ISESEmailEvent {
  eventType: "send" | "reject" | "bounce" | "complaint" | "delivery" | "click" | "open";
  mail: {
    timestamp: string;
    messageId: string;
    source: string;
    sourceArn: string;
    sendingAccountId: string;
    destination: string[];
    headersTruncated: boolean;
    headers: IEmailHeader[];
    commonHeaders: {
      from: string[];
      to: string[];
      messageId: string;
      subject: string;
    };
  };
  bounce?: any;
  complaint?: any;
  delivery?: any;
  click?: any;
  open?: any;
}

// Model types
export type EmailCreatePayload = Omit<IEmail, "id" | "createdAt" | "updatedAt">;
export type EmailUpdatePayload = Partial<
  Pick<
    IEmail,
    | "status"
    | "priority"
    | "isRead"
    | "isReplied"
    | "isForwarded"
    | "isArchived"
    | "isSpam"
    | "tags"
    | "category"
    | "labels"
    | "assignedTo"
    | "readAt"
    | "processedAt"
  >
>;
