import { Model, Document } from "mongoose";

export enum MessageType {
  TEXT = "text",
  IMAGE = "image",
  VIDEO = "video",
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
  fileType?: string;
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

// Enhanced group settings interfaces
export interface IGroupNotifications {
  enabled: boolean;
  sound: boolean;
  vibration: boolean;
  mentions: boolean;
}

export interface IGroupPermissions {
  sendMessages: boolean;
  editInfo: boolean;
  addParticipants: boolean;
  removeParticipants: boolean;
  pinMessages: boolean;
  deleteMessages: boolean;
  changeGroupInfo: boolean;
  sendMedia: boolean;
  sendFiles: boolean;
}

export interface IGroupInfo {
  isPublic: boolean;
  inviteLink?: string;
  inviteLinkExpiry?: Date;
  maxParticipants: number;
  joinApprovalRequired: boolean;
}

export interface IGroupPrivacy {
  showParticipants: boolean;
  allowProfileView: boolean;
  allowMessageHistory: boolean;
}

export interface IGroupActivity {
  totalMessages: number;
  lastActivity: Date;
  pinnedMessages: string[];
  announcements: string[];
}

export interface IGroupMetadata {
  category: string;
  tags: string[];
  location?: string;
  website?: string;
  contactInfo: {
    email?: string;
    phone?: string;
  };
}

export interface IGroupSettings {
  notifications: IGroupNotifications;
  permissions: IGroupPermissions;
  info: IGroupInfo;
  privacy: IGroupPrivacy;
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
  // Enhanced group settings
  groupSettings: IGroupSettings;
  activity: IGroupActivity;
  metadata: IGroupMetadata;
}

export interface IConversationStatus {
  userId: string;
  conversationId: string;
  isGroup: boolean;
  isArchived: boolean;
  isPending: boolean;
  lastReadAt?: Date;
  lastMessageAt?: Date;
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
  getPendingConversations: (userId: string) => Promise<any[]>;
  getArchivedConversations: (userId: string) => Promise<any[]>;
  markAsRead: (messageId: string, userId: string) => Promise<IChat | null>;
  markConversationAsRead: (userId: string, otherUserId: string) => Promise<void>;
  editMessage: (messageId: string, newContent: string, userId: string) => Promise<IChat | null>;
  deleteMessage: (messageId: string, userId: string) => Promise<boolean>;
  addReaction: (messageId: string, userId: string, emoji: string) => Promise<IChat | null>;
  removeReaction: (messageId: string, userId: string, emoji: string) => Promise<IChat | null>;
  searchMessages: (query: string, userId: string, chatRoom?: string) => Promise<IChat[]>;
}

export interface IConversationStatusService {
  getConversationStatus: (userId: string, conversationId: string) => Promise<IConversationStatus | null>;
  updateConversationStatus: (userId: string, conversationId: string, isGroup: boolean, updates: Partial<IConversationStatus>) => Promise<IConversationStatus>;
  archiveConversation: (userId: string, conversationId: string, isGroup: boolean) => Promise<IConversationStatus>;
  unarchiveConversation: (userId: string, conversationId: string) => Promise<IConversationStatus>;
  markAsPending: (userId: string, conversationId: string, isGroup: boolean) => Promise<IConversationStatus>;
  markAsNotPending: (userId: string, conversationId: string) => Promise<IConversationStatus>;
  getPendingConversations: (userId: string) => Promise<IConversationStatus[]>;
  getArchivedConversations: (userId: string) => Promise<IConversationStatus[]>;
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
  // Enhanced group settings methods
  changeGroupName: (roomId: string, name: string, userId: string) => Promise<IChatRoom | null>;
  changeGroupDescription: (roomId: string, description: string, userId: string) => Promise<IChatRoom | null>;
  changeGroupAvatar: (roomId: string, avatar: string, userId: string) => Promise<IChatRoom | null>;
  addMultipleParticipants: (roomId: string, participantIds: string[], adminId: string) => Promise<IChatRoom | null>;
  removeMultipleParticipants: (roomId: string, participantIds: string[], adminId: string) => Promise<IChatRoom | null>;
  assignAdmin: (roomId: string, userId: string, adminId: string) => Promise<IChatRoom | null>;
  removeAdmin: (roomId: string, userId: string, adminId: string) => Promise<IChatRoom | null>;
  updateNotificationSettings: (roomId: string, settings: Partial<IGroupNotifications>, userId: string) => Promise<IChatRoom | null>;
  updateGroupPermissions: (roomId: string, permissions: Partial<IGroupPermissions>, userId: string) => Promise<IChatRoom | null>;
  getRoomParticipants: (roomId: string) => Promise<string[]>;
  getRoomAdmins: (roomId: string) => Promise<string[]>;
  sendGroupNotification: (roomId: string, message: string, adminId: string) => Promise<boolean>;
  generateInviteLink: (roomId: string, adminId: string) => Promise<string>;
  joinGroupByInvite: (inviteLink: string, userId: string) => Promise<IChatRoom | null>;
}

export type IChatModel = Model<IChat>;
export type IChatRoomModel = Model<IChatRoom>;
export type IConversationStatusModel = Model<IConversationStatus>;