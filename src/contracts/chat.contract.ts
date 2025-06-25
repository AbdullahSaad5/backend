import { Model, Document } from "mongoose";

export enum MessageType {
  TEXT = "text",
  IMAGE = "image",
  FILE = "file",
  SYSTEM = "system"
}

export enum MessageStatus {
  SENT = "sent",
  DELIVERED = "delivered",
  READ = "read"
}

export interface IMessage {
  sender: string;
  receiver?: string;
  chatRoom?: string;
  content: string;
  messageType: MessageType;
  fileUrl?: string;
  fileName?: string;
  fileSize?: number;
  status: MessageStatus;
  readAt?: Date;
  editedAt?: Date;
  isEdited: boolean;
  replyTo?: string;
  reactions?: {
    userId: string;
    emoji: string;
    createdAt: Date;
  }[];
}

export interface IChat extends Document, IMessage {
  createdAt: Date;
  updatedAt: Date;
}

export interface IChatRoom extends Document {
  name: string;
  description?: string;
  participants: string[];
  admin: string[];
  isGroup: boolean;
  avatar?: string;
  lastMessage?: string;
  lastMessageAt?: Date;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface IUserPresence {
  userId: string;
  socketId: string;
  isOnline: boolean;
  lastSeen: Date;
  currentRoom?: string;
}

export interface ITypingIndicator {
  userId: string;
  chatRoom?: string;
  receiver?: string;
  isTyping: boolean;
  timestamp: Date;
}

export interface IChatService {
  sendMessage: (messageData: Partial<IMessage>) => Promise<IChat>;
  getMessages: (chatRoom?: string, sender?: string, receiver?: string, page?: number, limit?: number) => Promise<IChat[]>;
  getChatHistory: (userId: string, otherUserId: string, page?: number, limit?: number) => Promise<IChat[]>;
  getConversations: (userId: string) => Promise<any[]>;
  markAsRead: (messageId: string, userId: string) => Promise<IChat | null>;
  markConversationAsRead: (userId: string, otherUserId: string) => Promise<void>;
  editMessage: (messageId: string, newContent: string, userId: string) => Promise<IChat | null>;
  deleteMessage: (messageId: string, userId: string) => Promise<boolean>;
  addReaction: (messageId: string, userId: string, emoji: string) => Promise<IChat | null>;
  removeReaction: (messageId: string, userId: string, emoji: string) => Promise<IChat | null>;
  searchMessages: (query: string, userId: string, chatRoom?: string) => Promise<IChat[]>;
}

export interface IChatRoomService {
  createRoom: (roomData: Partial<IChatRoom>) => Promise<IChatRoom>;
  getRooms: (userId: string) => Promise<IChatRoom[]>;
  getRoomById: (roomId: string) => Promise<IChatRoom | null>;
  updateRoom: (roomId: string, updateData: Partial<IChatRoom>, userId: string) => Promise<IChatRoom | null>;
  deleteRoom: (roomId: string, userId: string) => Promise<boolean>;
  addParticipant: (roomId: string, userId: string, adminId: string) => Promise<IChatRoom | null>;
  removeParticipant: (roomId: string, userId: string, adminId: string) => Promise<IChatRoom | null>;
  leaveRoom: (roomId: string, userId: string) => Promise<boolean>;
}

export type IChatModel = Model<IChat>;
export type IChatRoomModel = Model<IChatRoom>;