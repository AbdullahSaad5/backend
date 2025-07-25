import { Schema, model, models } from "mongoose";
import { IChat, IChatModel, MessageType, MessageStatus, IChatRoom, IChatRoomModel } from "@/contracts/chat.contract";

const ReactionSchema = new Schema({
  userId: {
    type: String,
    required: true
  },
  emoji: {
    type: String,
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

const ChatSchema = new Schema<IChat, IChatModel>({
  sender: {
    type: String,
    required: [true, "Sender is required"],
    trim: true
  },
  receiver: {
    type: String,
    trim: true,
    // validate: {
    //   validator: function(this: IChat) {
    //     return this.receiver || this.chatRoom;
    //   },
    //   message: "Either receiver or chatRoom must be provided"
    // }
  },
  chatRoom: {
    type: String,
    trim: true,
    // validate: {
    //   validator: function(this: IChat) {
    //     return this.receiver || this.chatRoom;
    //   },
    //   message: "Either receiver or chatRoom must be provided"
    // }
  },
  content: {
    type: String,
    trim: true,
    maxlength: [5000, "Message content cannot exceed 5000 characters"],
    validate: {
      validator: function (this: any) {
        // Allow empty content if there's a file URL
        if (this.fileUrl) {
          return true; // File message, content can be empty
        }
        // Text message, content must not be empty
        return this.content && this.content.trim() !== '';
      },
      message: "Message content is required unless a file is attached"
    }
  },
  messageType: {
    type: String,
    enum: Object.values(MessageType),
    default: MessageType.TEXT
  },
  fileUrl: {
    type: String,
    trim: true
  },
  fileName: {
    type: String,
    trim: true
  },
  fileSize: {
    type: Number,
    min: 0
  },
  fileType: {
    type: String,
    trim: true
  },

  status: {
    type: String,
    enum: Object.values(MessageStatus),
    default: MessageStatus.SENT
  },
  readAt: {
    type: Date
  },
  editedAt: {
    type: Date
  },
  isEdited: {
    type: Boolean,
    default: false
  },
  replyTo: {
    type: String,
    trim: true
  },
  reactions: [ReactionSchema]
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

ChatSchema.index({ sender: 1, receiver: 1, createdAt: -1 });
ChatSchema.index({ chatRoom: 1, createdAt: -1 });
ChatSchema.index({ content: "text" });

// Enhanced ChatRoomSchema with WhatsApp-like features
const ChatRoomSchema = new Schema<IChatRoom, IChatRoomModel>({
  name: {
    type: String,
    required: [true, "Room name is required"],
    trim: true,
    maxlength: [100, "Room name cannot exceed 100 characters"]
  },
  description: {
    type: String,
    trim: true,
    maxlength: [500, "Description cannot exceed 500 characters"]
  },
  participants: [{
    type: String,
    required: true
  }],
  admin: [{
    type: String,
    required: true
  }],
  isGroup: {
    type: Boolean,
    default: true
  },
  avatar: {
    type: String,
    trim: true
  },
  lastMessage: {
    type: String,
    trim: true
  },
  lastMessageAt: {
    type: Date
  },
  createdBy: {
    type: String,
    required: [true, "Creator is required"]
  },
  // Enhanced group settings
  groupSettings: {
    // Notification settings
    notifications: {
      enabled: { type: Boolean, default: true },
      sound: { type: Boolean, default: true },
      vibration: { type: Boolean, default: true },
      mentions: { type: Boolean, default: true }
    },
    // Permission settings
    permissions: {
      sendMessages: { type: Boolean, default: true },
      editInfo: { type: Boolean, default: false }, // Only admins
      addParticipants: { type: Boolean, default: false }, // Only admins
      removeParticipants: { type: Boolean, default: false }, // Only admins
      pinMessages: { type: Boolean, default: false }, // Only admins
      deleteMessages: { type: Boolean, default: false }, // Only admins
      changeGroupInfo: { type: Boolean, default: false }, // Only admins
      sendMedia: { type: Boolean, default: true },
      sendFiles: { type: Boolean, default: true }
    },
    // Group info
    info: {
      isPublic: { type: Boolean, default: false },
      inviteLink: { type: String },
      inviteLinkExpiry: { type: Date },
      maxParticipants: { type: Number, default: 256 },
      joinApprovalRequired: { type: Boolean, default: false }
    },
    // Privacy settings
    privacy: {
      showParticipants: { type: Boolean, default: true },
      allowProfileView: { type: Boolean, default: true },
      allowMessageHistory: { type: Boolean, default: true }
    }
  },
  // Group activity tracking
  activity: {
    totalMessages: { type: Number, default: 0 },
    lastActivity: { type: Date, default: Date.now },
    pinnedMessages: [{ type: String }], // Message IDs
    announcements: [{ type: String }] // Message IDs
  },
  // Group metadata
  metadata: {
    category: { type: String, default: "General" },
    tags: [{ type: String }],
    location: { type: String },
    website: { type: String },
    contactInfo: {
      email: { type: String },
      phone: { type: String }
    }
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

ChatRoomSchema.index({ participants: 1 });
ChatRoomSchema.index({ admin: 1 });
ChatRoomSchema.index({ createdBy: 1 });
ChatRoomSchema.index({ "groupSettings.info.isPublic": 1 });

export const ChatModel = models.Chat || model<IChat>("Chat", ChatSchema);
export const ChatRoomModel = models.ChatRoom || model<IChatRoom>("ChatRoom", ChatRoomSchema);