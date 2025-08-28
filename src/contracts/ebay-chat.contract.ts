import { Request, Response } from "express";

// eBay Message Types
export enum EbayMessageType {
  BUYER_TO_SELLER = "BUYER_TO_SELLER",
  SELLER_TO_BUYER = "SELLER_TO_BUYER"
}

// eBay Message Status
export enum EbayMessageStatus {
  SENT = "SENT",
  DELIVERED = "DELIVERED",
  READ = "READ",
  FAILED = "FAILED"
}

// eBay Chat Message Interface
export interface IEbayChat {
  _id?: string | unknown;
  ebayItemId: string;
  orderId?: string;
  buyerUsername: string;
  sellerUsername: string;
  messageType: EbayMessageType;
  content: string;
  status: EbayMessageStatus;
  sentAt: Date;
  createdAt?: Date;
  updatedAt?: Date;
  attachments?: string[];
  isRead?: boolean;
}

// eBay Conversation Interface
export interface IEbayConversation {
  _id?: string | unknown;
  ebayItemId: string;
  orderId?: string;
  buyerUsername: string;
  sellerUsername: string;
  itemTitle?: string;
  itemPrice?: number;
  lastMessage: string;
  lastMessageAt: Date;
  unreadCount: number;
  totalMessages: number;
  createdAt?: Date;
  updatedAt?: Date;
}

// eBay Chat Service Interface
export interface IEbayChatService {
  // Core messaging functions
  sendMessage(messageData: Partial<IEbayChat>): Promise<IEbayChat>;
  getMessages(ebayItemId: string, buyerUsername: string, page?: number, limit?: number): Promise<IEbayChat[]>;
  getConversations(sellerUsername: string): Promise<IEbayConversation[]>;
  markAsRead(messageId: string): Promise<IEbayChat | null>;
  markConversationAsRead(ebayItemId: string, buyerUsername: string): Promise<void>;
  
  // eBay API integration
  syncEbayMessages(sellerUsername: string): Promise<void>;
  sendEbayMessage(messageData: Partial<IEbayChat>): Promise<boolean>;
  
  // Utility functions
  getUnreadCount(sellerUsername: string): Promise<number>;
  searchMessages(query: string, sellerUsername: string): Promise<IEbayChat[]>;
  updateConversation(ebayItemId: string, buyerUsername: string, sellerUsername: string, updateData: Partial<IEbayConversation>): Promise<void>;
  
  // Helper methods for eBay API integration
  getOrdersFromEbay(accessToken: string): Promise<any[]>;
  getMessagesFromEbay(accessToken: string, itemId: string): Promise<IEbayChat[]>;
  syncMessagesForItem(accessToken: string, itemId: string, orderId: string, sellerUsername: string): Promise<void>;
  parseOrdersFromXml(xmlText: string): any[];
  parseMessagesFromXml(xmlText: string, itemId: string): IEbayChat[];
  saveMessageFromEbay(message: IEbayApiMessage, itemId: string, orderId: string, sellerUsername: string): Promise<void>;
}

// eBay Chat Controller Interface
export interface IEbayChatController {
  sendMessage(req: Request, res: Response): Promise<void>;
  getMessages(req: Request, res: Response): Promise<void>;
  getConversations(req: Request, res: Response): Promise<void>;
  markAsRead(req: Request, res: Response): Promise<void>;
  markConversationAsRead(req: Request, res: Response): Promise<void>;
  syncMessages(req: Request, res: Response): Promise<void>;
  searchMessages(req: Request, res: Response): Promise<void>;
  getUnreadCount(req: Request, res: Response): Promise<void>;
}

// Request/Response Types
export interface IEbayChatCreateRequest {
  ebayItemId: string;
  orderId?: string;
  buyerUsername: string;
  content: string;
  attachments?: string[];
}

export interface IEbayChatResponse {
  success: boolean;
  message: string;
  data?: any;
  error?: string;
}

// eBay API Message Types
export interface IEbayApiMessage {
  messageId: string;
  sender: string;
  recipient: string;
  content: string;
  timestamp: string;
  messageType: string;
  orderId?: string;
  itemId?: string;
}

export interface IEbayApiConversation {
  conversationId: string;
  itemId: string;
  orderId?: string;
  buyerUsername: string;
  sellerUsername: string;
  lastMessage: string;
  lastMessageTime: string;
  unreadCount: number;
}
