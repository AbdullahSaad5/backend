import { Model, Document } from "mongoose";

export enum EbayMessageType {
    BUYER_TO_SELLER = "buyer_to_seller",
    SELLER_TO_BUYER = "seller_to_buyer",
    SYSTEM = "system"
}

export enum EbayMessageStatus {
    SENT = "sent",
    DELIVERED = "delivered",
    READ = "read",
    FAILED = "failed"
}

export interface IEbayMessage {
    ebayItemId: string;
    ebayTransactionId?: string;
    buyerUsername: string;
    sellerUsername: string;
    messageType: EbayMessageType;
    subject?: string;
    content: string;
    status: EbayMessageStatus;
    ebayMessageId?: string;
    ebayTimestamp?: Date;
    readAt?: Date;
    sentAt?: Date;
    attachments?: {
        fileName: string;
        fileUrl: string;
        fileSize: number;
        fileType: string;
    }[];
    metadata?: {
        listingTitle?: string;
        listingUrl?: string;
        orderId?: string;
        [key: string]: any;
    };
}

export interface IEbayChat extends Document, IEbayMessage {
    createdAt: Date;
    updatedAt: Date;
}

export interface IEbayConversation extends Document {
    ebayItemId: string;
    buyerUsername: string;
    sellerUsername: string;
    listingTitle: string;
    listingUrl?: string;
    lastMessage?: string;
    lastMessageAt?: Date;
    unreadCount: number;
    totalMessages: number;
    createdAt: Date;
    updatedAt: Date;
}

export interface IEbayChatService {
    // Core messaging functions
    sendMessage: (messageData: Partial<IEbayMessage>) => Promise<IEbayChat>;
    getMessages: (ebayItemId: string, buyerUsername: string, page?: number, limit?: number) => Promise<IEbayChat[]>;
    getConversations: (sellerUsername: string) => Promise<IEbayConversation[]>;
    markAsRead: (messageId: string) => Promise<IEbayChat | null>;
    markConversationAsRead: (ebayItemId: string, buyerUsername: string) => Promise<void>;

    // eBay REST API integration
    syncEbayMessages: (sellerUsername: string) => Promise<void>;
    sendEbayMessage: (messageData: Partial<IEbayMessage>) => Promise<boolean>;
    getEbayMessagesFromAPI: (conversationId: string) => Promise<any[]>;
    getEbayConversationsFromAPI: () => Promise<any[]>;
    getOrCreateConversation: (ebayItemId: string, buyerUsername: string) => Promise<string>;

    // Conversation management
    getConversation: (ebayItemId: string, buyerUsername: string) => Promise<IEbayConversation | null>;

    // Search and filtering
    searchMessages: (query: string, sellerUsername: string) => Promise<IEbayChat[]>;
    getUnreadCount: (sellerUsername: string) => Promise<number>;

    // Helper methods
    updateConversation: (ebayItemId: string, buyerUsername: string, sellerUsername: string, updates: any) => Promise<void>;

    // Sandbox-specific methods (optional)
    generateMockMessages?: (sellerUsername: string) => Promise<Partial<IEbayChat>[]>;
    initializeSandboxData?: (sellerUsername: string) => Promise<void>;
    clearSandboxData?: (sellerUsername: string) => Promise<void>;
}

export interface IEbayChatController {
    sendMessage: (req: any, res: any) => Promise<void>;
    getMessages: (req: any, res: any) => Promise<void>;
    getConversations: (req: any, res: any) => Promise<void>;
    markAsRead: (req: any, res: any) => Promise<void>;
    markConversationAsRead: (req: any, res: any) => Promise<void>;
    syncMessages: (req: any, res: any) => Promise<void>;
    searchMessages: (req: any, res: any) => Promise<void>;

    // Sandbox-specific methods (optional)
    initializeSandbox?: (req: any, res: any) => Promise<void>;
    clearSandboxData?: (req: any, res: any) => Promise<void>;
}

export type IEbayChatModel = Model<IEbayChat>;
export type IEbayConversationModel = Model<IEbayConversation>; 