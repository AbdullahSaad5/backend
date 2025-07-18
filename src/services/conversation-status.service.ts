import { ConversationStatusModel } from "@/models/conversation-status.model";
import { IConversationStatus } from "@/contracts/chat.contract";

export const ConversationStatusService = {
    getConversationStatus: async (userId: string, conversationId: string): Promise<IConversationStatus | null> => {
        return ConversationStatusModel.findOne({ userId, conversationId });
    },

    updateConversationStatus: async (
        userId: string,
        conversationId: string,
        isGroup: boolean,
        updates: Partial<IConversationStatus>
    ): Promise<IConversationStatus> => {
        const status = await ConversationStatusModel.findOneAndUpdate(
            { userId, conversationId },
            {
                $set: {
                    ...updates,
                    isGroup,
                    updatedAt: new Date()
                }
            },
            {
                new: true,
                upsert: true
            }
        );
        return status;
    },

    archiveConversation: async (userId: string, conversationId: string, isGroup: boolean): Promise<IConversationStatus> => {
        return ConversationStatusModel.findOneAndUpdate(
            { userId, conversationId },
            {
                $set: {
                    isArchived: true,
                    isGroup,
                    updatedAt: new Date()
                }
            },
            {
                new: true,
                upsert: true
            }
        );
    },

    unarchiveConversation: async (userId: string, conversationId: string): Promise<IConversationStatus> => {
        const result = await ConversationStatusModel.findOneAndUpdate(
            { userId, conversationId },
            {
                $set: {
                    isArchived: false,
                    updatedAt: new Date()
                }
            },
            { new: true }
        );

        if (!result) {
            throw new Error(`Conversation status not found for user ${userId} and conversation ${conversationId}`);
        }

        return result;
    },

    markAsPending: async (userId: string, conversationId: string, isGroup: boolean): Promise<IConversationStatus> => {
        return ConversationStatusModel.findOneAndUpdate(
            { userId, conversationId },
            {
                $set: {
                    isPending: true,
                    isGroup,
                    updatedAt: new Date()
                }
            },
            {
                new: true,
                upsert: true
            }
        );
    },

    markAsNotPending: async (userId: string, conversationId: string): Promise<IConversationStatus> => {
        const result = await ConversationStatusModel.findOneAndUpdate(
            { userId, conversationId },
            {
                $set: {
                    isPending: false,
                    updatedAt: new Date()
                }
            },
            { new: true }
        );

        if (!result) {
            throw new Error(`Conversation status not found for user ${userId} and conversation ${conversationId}`);
        }

        return result;
    },

    getPendingConversations: async (userId: string): Promise<IConversationStatus[]> => {
        return ConversationStatusModel.find({
            userId,
            isPending: true,
            isArchived: false
        }).sort({ updatedAt: -1 });
    },

    getArchivedConversations: async (userId: string): Promise<IConversationStatus[]> => {
        return ConversationStatusModel.find({
            userId,
            isArchived: true
        }).sort({ updatedAt: -1 });
    },

    updateLastMessageAt: async (userId: string, conversationId: string, isGroup: boolean): Promise<void> => {
        await ConversationStatusModel.findOneAndUpdate(
            { userId, conversationId },
            {
                $set: {
                    lastMessageAt: new Date(),
                    isGroup,
                    updatedAt: new Date()
                }
            },
            { upsert: true }
        );
    },

    updateLastReadAt: async (userId: string, conversationId: string): Promise<void> => {
        await ConversationStatusModel.findOneAndUpdate(
            { userId, conversationId },
            {
                $set: {
                    lastReadAt: new Date(),
                    updatedAt: new Date()
                }
            },
            { upsert: true }
        );
    },

    getConversationStatuses: async (userId: string): Promise<IConversationStatus[]> => {
        return ConversationStatusModel.find({ userId }).sort({ updatedAt: -1 });
    },

    // Delete conversation status for a specific user and conversation
    deleteConversationStatus: async (userId: string, conversationId: string, isGroup: boolean): Promise<void> => {
        await ConversationStatusModel.findOneAndDelete({
            userId,
            conversationId,
            isGroup
        });
    },

    // Delete all conversation statuses for a group
    deleteGroupConversationStatuses: async (groupId: string): Promise<void> => {
        await ConversationStatusModel.deleteMany({
            conversationId: groupId,
            isGroup: true
        });
    }
}; 