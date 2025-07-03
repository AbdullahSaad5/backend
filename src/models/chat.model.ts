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
    required: [true, "Message content is required"],
    trim: true,
    maxlength: [5000, "Message content cannot exceed 5000 characters"]
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
  }
}, { 
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

ChatRoomSchema.index({ participants: 1 });
ChatRoomSchema.index({ admin: 1 });
ChatRoomSchema.index({ createdBy: 1 });

export const ChatModel = models.Chat || model<IChat>("Chat", ChatSchema);
export const ChatRoomModel = models.ChatRoom || model<IChatRoom>("ChatRoom", ChatRoomSchema);