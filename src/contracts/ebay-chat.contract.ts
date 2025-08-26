export type EbayChatSendMessageRequest = {
  orderId: string;
  message: string;
  subject?: string;
  recipientRole: "BUYER" | "SELLER";
};

export type EbayChatGetMessagesRequest = {
  orderId: string;
  limit?: number;
  offset?: number;
};

export type EbayChatMessage = {
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
  timestamp: string;
  read: boolean;
};

export type EbayChatOrderInfo = {
  orderId: string;
  buyerUsername: string;
  sellerUsername: string;
  orderStatus: string;
  creationDate: string;
  lastModifiedDate: string;
  total: {
    value: number;
    currency: string;
  };
  lineItems: Array<{
    itemId: string;
    title: string;
    quantity: number;
    price: {
      value: number;
      currency: string;
    };
  }>;
};

export type EbayChatResponse = {
  success: boolean;
  data?: any;
  error?: string;
  status?: number;
};

// Enums for message types and status
export enum EbayMessageType {
  BUYER_TO_SELLER = "BUYER_TO_SELLER",
  SELLER_TO_BUYER = "SELLER_TO_BUYER"
}

export enum EbayMessageStatus {
  SENT = "SENT",
  DELIVERED = "DELIVERED",
  READ = "READ",
  FAILED = "FAILED"
}

// Interface for eBay chat messages (for local storage)
export interface IEbayChat {
  _id?: string;
  ebayItemId: string;
  buyerUsername: string;
  sellerUsername: string;
  content: string;
  messageType: EbayMessageType;
  status: EbayMessageStatus;
  sentAt?: Date;
  deliveredAt?: Date;
  readAt?: Date;
  createdAt?: Date;
  updatedAt?: Date;
}

// Interface for eBay conversations
export interface IEbayConversation {
  _id?: string;
  ebayItemId: string;
  buyerUsername: string;
  sellerUsername: string;
  lastMessage: string;
  lastMessageAt: Date;
  unreadCount: number;
  createdAt?: Date;
  updatedAt?: Date;
}

// Interface for eBay chat service
export interface IEbayChatService {
  sendMessage(messageData: Partial<IEbayChat>): Promise<IEbayChat>;
  getMessages(ebayItemId: string, buyerUsername: string, page?: number, limit?: number): Promise<IEbayChat[]>;
  getConversations(sellerUsername: string): Promise<IEbayConversation[]>;
  markAsRead(messageId: string): Promise<IEbayChat | null>;
  getUnreadCount(sellerUsername: string): Promise<number>;
  sendEbayMessage(messageData: Partial<IEbayChat>): Promise<boolean>;
  getConversation(ebayItemId: string, buyerUsername: string): Promise<IEbayConversation | null>;
  searchMessages(query: string, sellerUsername: string): Promise<IEbayChat[]>;
  generateMockMessages(sellerUsername: string): Promise<Partial<IEbayChat>[]>;
}

// Interface for eBay chat controller
export interface IEbayChatController {
  sendMessage(req: any, res: any): Promise<void>;
  getMessages(req: any, res: any): Promise<void>;
  getConversations(req: any, res: any): Promise<void>;
  markAsRead(req: any, res: any): Promise<void>;
  getUnreadCount(req: any, res: any): Promise<void>;
  searchMessages(req: any, res: any): Promise<void>;
  generateMockMessages(req: any, res: any): Promise<void>;
}
