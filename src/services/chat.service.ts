import { ChatModel, ChatRoomModel } from "@/models/chat.model";
import { IChat, IChatRoom, MessageStatus, MessageType, IGroupPermissions, IGroupNotifications } from "@/contracts/chat.contract";
import { ConversationStatusService } from "./conversation-status.service";


// 1. Create message in database
// 2. Update chat room's last message
// 3. Update conversation status
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
    // Get archived conversation IDs to exclude them
    const archivedStatuses = await ConversationStatusService.getArchivedConversations(userId);
    const archivedIds = new Set(archivedStatuses.map(status => status.conversationId));

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

    // Filter out archived direct conversations
    const filteredConversations = conversations.filter(conv => !archivedIds.has(conv._id));

    // Get group conversations and filter out archived ones
    const groupConversations = await ChatRoomModel.find({
      participants: userId
    }).sort({ lastMessageAt: -1 });

    const filteredGroupConversations = groupConversations.filter(group => !archivedIds.has(group._id));

    return [...filteredConversations, ...filteredGroupConversations];
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

  getReadConversations: async (userId: string): Promise<any[]> => {
    // Get all conversation statuses for this user
    const allStatuses = await ConversationStatusService.getConversationStatuses(userId);

    // Filter for conversations that are not archived, not pending, and have no unread messages
    const readStatuses = allStatuses.filter(status =>
      !status.isArchived &&
      !status.isPending
    );

    const readConversations = [];

    for (const status of readStatuses) {
      if (status.isGroup) {
        // Get group details
        const group = await ChatRoomModel.findById(status.conversationId);
        if (group) {
          // Check if group has unread messages
          const unreadCount = await ChatModel.countDocuments({
            chatRoom: status.conversationId,
            sender: { $ne: userId },
            status: { $ne: MessageStatus.READ }
          });

          if (unreadCount === 0) {
            readConversations.push({
              _id: group._id,
              name: group.name,
              isGroup: true,
              lastMessage: group.lastMessage,
              lastMessageAt: group.lastMessageAt,
              participants: group.participants,
              unreadCount: 0
            });
          }
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
          // Check if conversation has unread messages
          const unreadCount = await ChatModel.countDocuments({
            $or: [
              { sender: status.conversationId, receiver: userId },
              { sender: userId, receiver: status.conversationId }
            ],
            sender: { $ne: userId },
            status: { $ne: MessageStatus.READ }
          });

          if (unreadCount === 0) {
            readConversations.push({
              _id: status.conversationId,
              lastMessage: lastMessage,
              isGroup: false,
              unreadCount: 0
            });
          }
        }
      }
    }

    return readConversations;
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

  markAsDelivered: async (messageId: string): Promise<IChat | null> => {
    const message = await ChatModel.findOneAndUpdate(
      {
        _id: messageId,
        status: MessageStatus.SENT
      },
      {
        status: MessageStatus.DELIVERED
      },
      { new: true }
    );

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

    // First, check if the message exists and get current reactions
    const existingMessage = await ChatModel.findById(messageId);
    if (!existingMessage) {
      console.log('Message not found:', messageId);
      return null;
    }

    console.log('Current reactions before update:', existingMessage.reactions);

    // First, remove any existing reactions from this user on this message
    const removeResult = await ChatModel.findByIdAndUpdate(
      messageId,
      {
        $pull: { reactions: { userId } }
      }
    );

    console.log('Remove result:', removeResult);

    // Then add the new reaction
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

    console.log('Final update result:', result); // Debug log
    console.log('Final reactions:', result?.reactions);
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
  },

  // Delete conversation (all messages between two users)
  deleteConversation: async (userId: string, otherUserId: string): Promise<boolean> => {
    try {
      const result = await ChatModel.deleteMany({
        $or: [
          { sender: userId, receiver: otherUserId },
          { sender: otherUserId, receiver: userId }
        ]
      });

      // Also delete conversation status records
      await ConversationStatusService.deleteConversationStatus(userId, otherUserId, false);
      await ConversationStatusService.deleteConversationStatus(otherUserId, userId, false);

      return result.deletedCount > 0;
    } catch (error) {
      console.error('Error deleting conversation:', error);
      throw error;
    }
  },

  // Delete group (all messages in the group and the group itself)
  deleteGroup: async (groupId: string, userId: string): Promise<boolean> => {
    try {
      // Check if user is the creator of the group
      const group = await ChatRoomModel.findById(groupId);
      if (!group) {
        throw new Error('Group not found');
      }

      if (group.createdBy !== userId) {
        throw new Error('Only group creator can delete the group');
      }

      // Delete all messages in the group
      await ChatModel.deleteMany({ chatRoom: groupId });

      // Delete all conversation status records for this group
      await ConversationStatusService.deleteGroupConversationStatuses(groupId);

      // Delete the group itself
      await ChatRoomModel.findByIdAndDelete(groupId);

      return true;
    } catch (error) {
      console.error('Error deleting group:', error);
      throw error;
    }
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
    try {
      console.log('LeaveRoom service called with:', { roomId, userId });

      // First check if the room exists and user is a participant
      const room = await ChatRoomModel.findById(roomId);
      if (!room) {
        console.log('Room not found:', roomId);
        return false;
      }

      console.log('Room found:', {
        id: room._id,
        name: room.name,
        participants: room.participants,
        admins: room.admin,
        userIsParticipant: room.participants.includes(userId),
        userIsAdmin: room.admin.includes(userId)
      });

      if (!room.participants.includes(userId)) {
        console.log('User is not a participant:', userId);
        return false;
      }

      const result = await ChatRoomModel.findByIdAndUpdate(
        roomId,
        {
          $pull: { participants: userId, admin: userId }
        },
        { new: true }
      );

      console.log('LeaveRoom result:', result);

      if (result) {
        console.log('User successfully removed from room. Updated room:', {
          id: result._id,
          name: result.name,
          participants: result.participants,
          admins: result.admin
        });
      }

      return !!result;
    } catch (error) {
      console.error('LeaveRoom service error:', error);
      return false;
    }
  },

  // Enhanced group settings methods
  changeGroupName: async (roomId: string, name: string, userId: string): Promise<IChatRoom | null> => {
    return ChatRoomModel.findOneAndUpdate(
      {
        _id: roomId,
        admin: userId
      },
      {
        name: name.trim(),
        "activity.lastActivity": new Date()
      },
      { new: true }
    );
  },

  changeGroupDescription: async (roomId: string, description: string, userId: string): Promise<IChatRoom | null> => {
    return ChatRoomModel.findOneAndUpdate(
      {
        _id: roomId,
        admin: userId
      },
      {
        description: description.trim(),
        "activity.lastActivity": new Date()
      },
      { new: true }
    );
  },

  changeGroupAvatar: async (roomId: string, avatar: string, userId: string): Promise<IChatRoom | null> => {
    return ChatRoomModel.findOneAndUpdate(
      {
        _id: roomId,
        admin: userId
      },
      {
        avatar,
        "activity.lastActivity": new Date()
      },
      { new: true }
    );
  },

  addMultipleParticipants: async (roomId: string, participantIds: string[], adminId: string): Promise<IChatRoom | null> => {
    return ChatRoomModel.findOneAndUpdate(
      {
        _id: roomId,
        admin: adminId
      },
      {
        $addToSet: { participants: { $each: participantIds } },
        "activity.lastActivity": new Date()
      },
      { new: true }
    );
  },

  removeMultipleParticipants: async (roomId: string, participantIds: string[], adminId: string): Promise<IChatRoom | null> => {
    return ChatRoomModel.findOneAndUpdate(
      {
        _id: roomId,
        admin: adminId
      },
      {
        $pull: { participants: { $in: participantIds } },
        "activity.lastActivity": new Date()
      },
      { new: true }
    );
  },

  assignAdmin: async (roomId: string, userId: string, adminId: string): Promise<IChatRoom | null> => {
    return ChatRoomModel.findOneAndUpdate(
      {
        _id: roomId,
        admin: adminId
      },
      {
        $addToSet: { admin: userId },
        "activity.lastActivity": new Date()
      },
      { new: true }
    );
  },

  removeAdmin: async (roomId: string, userId: string, adminId: string): Promise<IChatRoom | null> => {
    return ChatRoomModel.findOneAndUpdate(
      {
        _id: roomId,
        admin: adminId
      },
      {
        $pull: { admin: userId },
        "activity.lastActivity": new Date()
      },
      { new: true }
    );
  },

  updateNotificationSettings: async (roomId: string, settings: Partial<IGroupNotifications>, userId: string): Promise<IChatRoom | null> => {
    const updateData: any = { "activity.lastActivity": new Date() };

    Object.keys(settings).forEach(key => {
      updateData[`groupSettings.notifications.${key}`] = settings[key as keyof IGroupNotifications];
    });

    return ChatRoomModel.findOneAndUpdate(
      {
        _id: roomId,
        admin: userId
      },
      updateData,
      { new: true }
    );
  },

  updateGroupPermissions: async (roomId: string, permissions: Partial<IGroupPermissions>, userId: string): Promise<IChatRoom | null> => {
    const updateData: any = { "activity.lastActivity": new Date() };

    Object.keys(permissions).forEach(key => {
      updateData[`groupSettings.permissions.${key}`] = permissions[key as keyof IGroupPermissions];
    });

    return ChatRoomModel.findOneAndUpdate(
      {
        _id: roomId,
        admin: userId
      },
      updateData,
      { new: true }
    );
  },

  getRoomParticipants: async (roomId: string): Promise<string[]> => {
    const room = await ChatRoomModel.findById(roomId).select('participants');
    return room?.participants || [];
  },

  getRoomAdmins: async (roomId: string): Promise<string[]> => {
    const room = await ChatRoomModel.findById(roomId).select('admin');
    return room?.admin || [];
  },

  sendGroupNotification: async (roomId: string, message: string, adminId: string): Promise<boolean> => {
    try {
      // Create a system message for the notification
      const notificationMessage = new ChatModel({
        sender: adminId,
        chatRoom: roomId,
        content: message,
        messageType: MessageType.SYSTEM,
        status: MessageStatus.SENT
      });

      await notificationMessage.save();

      // Update room's last message
      await ChatRoomModel.findByIdAndUpdate(roomId, {
        lastMessage: message,
        lastMessageAt: new Date(),
        "activity.lastActivity": new Date(),
        $inc: { "activity.totalMessages": 1 }
      });

      return true;
    } catch (error) {
      console.error('Error sending group notification:', error);
      return false;
    }
  },

  generateInviteLink: async (roomId: string, adminId: string): Promise<string> => {
    const room = await ChatRoomModel.findOneAndUpdate(
      {
        _id: roomId,
        admin: adminId
      },
      {
        "groupSettings.info.inviteLink": `${process.env.FRONTEND_URL}/join-group/${roomId}`,
        "groupSettings.info.inviteLinkExpiry": new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
        "activity.lastActivity": new Date()
      },
      { new: true }
    );

    return room?.groupSettings?.info?.inviteLink || '';
  },

  joinGroupByInvite: async (inviteLink: string, userId: string): Promise<IChatRoom | null> => {
    const roomId = inviteLink.split('/').pop();

    if (!roomId) return null;

    const room = await ChatRoomModel.findById(roomId);
    if (!room) return null;

    // Check if invite link is still valid
    if (room.groupSettings?.info?.inviteLinkExpiry &&
      new Date() > room.groupSettings.info.inviteLinkExpiry) {
      return null;
    }

    // Add user to participants
    return ChatRoomModel.findByIdAndUpdate(
      roomId,
      {
        $addToSet: { participants: userId },
        "activity.lastActivity": new Date()
      },
      { new: true }
    );
  }
};