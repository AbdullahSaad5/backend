import { ChatModel, ChatRoomModel } from "@/models/chat.model";
import { IChat, IChatRoom, MessageStatus, MessageType } from "@/contracts/chat.contract";
import { ConversationStatusService } from "./conversation-status.service";

export const ChatService = {
  sendMessage: async (messageData: Partial<IChat>): Promise<IChat> => {
    console.log('=== CHAT SERVICE SEND MESSAGE ===');
    console.log('Message data received:', messageData);

    try {
      const message = new ChatModel(messageData);
      console.log('ChatModel created:', message);

      const savedMessage = await message.save();
      console.log('Message saved successfully:', savedMessage);

      // Update last message in chat room if it's a group chat
      if (messageData.chatRoom) {
        console.log('Updating chat room last message...');
        await ChatRoomModel.findByIdAndUpdate(
          messageData.chatRoom,
          {
            lastMessage: messageData.content,
            lastMessageAt: new Date()
          }
        );
        console.log('Chat room updated successfully');

        // Update conversation status for all participants
        const chatRoom = await ChatRoomModel.findById(messageData.chatRoom);
        if (chatRoom) {
          for (const participantId of chatRoom.participants) {
            if (participantId !== messageData.sender) {
              await ConversationStatusService.updateLastMessageAt(
                participantId,
                messageData.chatRoom!,
                true
              );
            }
          }
        }
      } else if (messageData.receiver) {
        // Update conversation status for direct chat
        await ConversationStatusService.updateLastMessageAt(
          messageData.receiver,
          messageData.sender!,
          false
        );
      }

      console.log('=== CHAT SERVICE SEND MESSAGE COMPLETED ===');
      return savedMessage;
    } catch (error) {
      console.error('=== CHAT SERVICE SEND MESSAGE ERROR ===');
      console.error('Error saving message:', error);

      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      const errorName = error instanceof Error ? error.name : 'Unknown';
      const errorStack = error instanceof Error ? error.stack : 'No stack trace';

      console.error('Error details:', {
        name: errorName,
        message: errorMessage,
        stack: errorStack
      });
      throw error;
    }
  },

  getMessages: async (
    chatRoom?: string,
    sender?: string,
    receiver?: string,
    page: number = 1,
    limit: number = 50
  ): Promise<IChat[]> => {
    const skip = (page - 1) * limit;
    let query: any = {};

    if (chatRoom) {
      query.chatRoom = chatRoom;
    } else if (sender && receiver) {
      query.$or = [
        { sender, receiver },
        { sender: receiver, receiver: sender }
      ];
    }

    return ChatModel.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .exec();
  },

  getChatHistory: async (
    userId: string,
    otherUserId: string,
    page: number = 1,
    limit: number = 50
  ): Promise<IChat[]> => {
    const skip = (page - 1) * limit;

    return ChatModel.find({
      $or: [
        { sender: userId, receiver: otherUserId },
        { sender: otherUserId, receiver: userId }
      ]
    })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .exec();
  },

  getConversations: async (userId: string): Promise<any[]> => {
    const conversations = await ChatModel.aggregate([
      {
        $match: {
          $or: [
            { sender: userId },
            { receiver: userId }
          ]
        }
      },
      {
        $sort: { createdAt: -1 }
      },
      {
        $group: {
          _id: {
            $cond: [
              { $eq: ["$sender", userId] },
              "$receiver",
              "$sender"
            ]
          },
          lastMessage: { $first: "$$ROOT" },
          unreadCount: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $ne: ["$sender", userId] },
                    { $ne: ["$status", MessageStatus.READ] }
                  ]
                },
                1,
                0
              ]
            }
          }
        }
      },
      {
        $sort: { "lastMessage.createdAt": -1 }
      }
    ]);

    // Get group conversations
    const groupConversations = await ChatRoomModel.find({
      participants: userId
    }).sort({ lastMessageAt: -1 });

    return [...conversations, ...groupConversations];
  },

  getPendingConversations: async (userId: string): Promise<any[]> => {
    // Get pending conversation statuses
    const pendingStatuses = await ConversationStatusService.getPendingConversations(userId);

    const pendingConversations = [];

    for (const status of pendingStatuses) {
      if (status.isGroup) {
        // Get group details
        const group = await ChatRoomModel.findById(status.conversationId);
        if (group) {
          pendingConversations.push({
            _id: group._id,
            name: group.name,
            isGroup: true,
            lastMessage: group.lastMessage,
            lastMessageAt: group.lastMessageAt,
            participants: group.participants,
            unreadCount: 0 // Pending conversations are already read
          });
        }
      } else {
        // Get direct conversation details
        const lastMessage = await ChatModel.findOne({
          $or: [
            { sender: userId, receiver: status.conversationId },
            { sender: status.conversationId, receiver: userId }
          ]
        }).sort({ createdAt: -1 });

        if (lastMessage) {
          pendingConversations.push({
            _id: status.conversationId,
            lastMessage: lastMessage,
            isGroup: false,
            unreadCount: 0
          });
        }
      }
    }

    return pendingConversations;
  },

  getArchivedConversations: async (userId: string): Promise<any[]> => {
    // Get archived conversation statuses
    const archivedStatuses = await ConversationStatusService.getArchivedConversations(userId);

    const archivedConversations = [];

    for (const status of archivedStatuses) {
      if (status.isGroup) {
        // Get group details
        const group = await ChatRoomModel.findById(status.conversationId);
        if (group) {
          archivedConversations.push({
            _id: group._id,
            name: group.name,
            isGroup: true,
            lastMessage: group.lastMessage,
            lastMessageAt: group.lastMessageAt,
            participants: group.participants,
            unreadCount: 0
          });
        }
      } else {
        // Get direct conversation details
        const lastMessage = await ChatModel.findOne({
          $or: [
            { sender: userId, receiver: status.conversationId },
            { sender: status.conversationId, receiver: userId }
          ]
        }).sort({ createdAt: -1 });

        if (lastMessage) {
          archivedConversations.push({
            _id: status.conversationId,
            lastMessage: lastMessage,
            isGroup: false,
            unreadCount: 0
          });
        }
      }
    }

    return archivedConversations;
  },

  markAsRead: async (messageId: string, userId: string): Promise<IChat | null> => {
    const message = await ChatModel.findOneAndUpdate(
      {
        _id: messageId,
        receiver: userId,
        status: { $ne: MessageStatus.READ }
      },
      {
        status: MessageStatus.READ,
        readAt: new Date()
      },
      { new: true }
    );

    if (message) {
      // Update conversation status
      if (message.chatRoom) {
        await ConversationStatusService.updateLastReadAt(userId, message.chatRoom);
      } else if (message.sender) {
        await ConversationStatusService.updateLastReadAt(userId, message.sender);
      }
    }

    return message;
  },

  markConversationAsRead: async (userId: string, otherUserId: string): Promise<void> => {
    await ChatModel.updateMany(
      {
        sender: otherUserId,
        receiver: userId,
        status: { $ne: MessageStatus.READ }
      },
      {
        status: MessageStatus.READ,
        readAt: new Date()
      }
    );

    // Update conversation status
    await ConversationStatusService.updateLastReadAt(userId, otherUserId);
  },

  editMessage: async (messageId: string, newContent: string, userId: string): Promise<IChat | null> => {
    return ChatModel.findOneAndUpdate(
      {
        _id: messageId,
        sender: userId,
        messageType: MessageType.TEXT
      },
      {
        content: newContent,
        isEdited: true,
        editedAt: new Date()
      },
      { new: true }
    );
  },

  deleteMessage: async (messageId: string, userId: string): Promise<boolean> => {
    const result = await ChatModel.findOneAndDelete({
      _id: messageId,
      sender: userId
    });
    return !!result;
  },

  addReaction: async (messageId: string, userId: string, emoji: string): Promise<IChat | null> => {
    console.log(`Attempting to add reaction:`, { messageId, userId, emoji }); // Debug log

    const result = await ChatModel.findByIdAndUpdate(
      messageId,
      {
        $push: {
          reactions: {
            userId,
            emoji,
            createdAt: new Date()
          }
        }
      },
      { new: true }
    );

    console.log('Update result:', result); // Debug log
    return result;
  },
  removeReaction: async (messageId: string, userId: string, emoji: string): Promise<IChat | null> => {
    return ChatModel.findByIdAndUpdate(
      messageId,
      {
        $pull: { reactions: { userId, emoji } }
      },
      { new: true }
    );
  },

  searchMessages: async (query: string, userId: string, chatRoom?: string): Promise<IChat[]> => {
    let searchQuery: any = {
      $text: { $search: query }
    };

    if (chatRoom) {
      searchQuery.chatRoom = chatRoom;
    } else {
      searchQuery.$or = [
        { sender: userId },
        { receiver: userId }
      ];
    }

    return ChatModel.find(searchQuery)
      .sort({ score: { $meta: "textScore" } })
      .limit(20)
      .exec();
  }
};

export const ChatRoomService = {
  createRoom: async (roomData: Partial<IChatRoom>): Promise<IChatRoom> => {
    const room = new ChatRoomModel(roomData);
    return room.save();
  },

  getRooms: async (userId: string): Promise<IChatRoom[]> => {
    return ChatRoomModel.find({
      participants: userId
    }).sort({ lastMessageAt: -1 });
  },

  getRoomById: async (roomId: string): Promise<IChatRoom | null> => {
    return ChatRoomModel.findById(roomId);
  },

  updateRoom: async (roomId: string, updateData: Partial<IChatRoom>, userId: string): Promise<IChatRoom | null> => {
    return ChatRoomModel.findOneAndUpdate(
      {
        _id: roomId,
        admin: userId
      },
      updateData,
      { new: true }
    );
  },

  deleteRoom: async (roomId: string, userId: string): Promise<boolean> => {
    const result = await ChatRoomModel.findOneAndDelete({
      _id: roomId,
      createdBy: userId
    });
    return !!result;
  },

  addParticipant: async (roomId: string, userId: string, adminId: string): Promise<IChatRoom | null> => {
    return ChatRoomModel.findOneAndUpdate(
      {
        _id: roomId,
        admin: adminId
      },
      {
        $addToSet: { participants: userId }
      },
      { new: true }
    );
  },

  removeParticipant: async (roomId: string, userId: string, adminId: string): Promise<IChatRoom | null> => {
    return ChatRoomModel.findOneAndUpdate(
      {
        _id: roomId,
        admin: adminId
      },
      {
        $pull: { participants: userId }
      },
      { new: true }
    );
  },

  leaveRoom: async (roomId: string, userId: string): Promise<boolean> => {
    const result = await ChatRoomModel.findByIdAndUpdate(
      roomId,
      {
        $pull: { participants: userId, admin: userId }
      }
    );
    return !!result;
  }
};