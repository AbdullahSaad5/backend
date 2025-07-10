import { Schema, model, models } from "mongoose";

export interface IConversationStatus {
    userId: string;
    conversationId: string; // For direct chats: otherUserId, for groups: groupId
    isGroup: boolean;
    isArchived: boolean;
    isPending: boolean;
    lastReadAt?: Date;
    lastMessageAt?: Date;
    createdAt: Date;
    updatedAt: Date;
}

const ConversationStatusSchema = new Schema<IConversationStatus>({
    userId: {
        type: String,
        required: [true, "User ID is required"],
        trim: true
    },
    conversationId: {
        type: String,
        required: [true, "Conversation ID is required"],
        trim: true
    },
    isGroup: {
        type: Boolean,
        default: false
    },
    isArchived: {
        type: Boolean,
        default: false
    },
    isPending: {
        type: Boolean,
        default: false
    },
    lastReadAt: {
        type: Date
    },
    lastMessageAt: {
        type: Date
    }
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// Compound index to ensure unique conversation status per user
ConversationStatusSchema.index({ userId: 1, conversationId: 1 }, { unique: true });
ConversationStatusSchema.index({ userId: 1, isArchived: 1 });
ConversationStatusSchema.index({ userId: 1, isPending: 1 });

export const ConversationStatusModel = models.ConversationStatus || model<IConversationStatus>("ConversationStatus", ConversationStatusSchema); 