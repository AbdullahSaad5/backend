import { ChatModel, ChatRoomModel } from "@/models/chat.model";
import { IChat, IChatRoom, MessageStatus, MessageType } from "@/contracts/chat.contract";

export const ChatService = {
  sendMessage: async (messageData: Partial<IChat>): Promise<IChat> => {
    const message = new ChatModel(messageData);
    const savedMessage = await message.save();
    
    // Update last message in chat room if it's a group chat
    if (messageData.chatRoom) {
      await ChatRoomModel.findByIdAndUpdate(
        messageData.chatRoom,
        {
          lastMessage: messageData.content,
          lastMessageAt: new Date()
        }
      );
    }
    
    return savedMessage;
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

  markAsRead: async (messageId: string, userId: string): Promise<IChat | null> => {
    return ChatModel.findOneAndUpdate(
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

  // addReaction: async (messageId: string, userId: string, emoji: string): Promise<IChat | null> => {
  //   return ChatModel.findByIdAndUpdate(
  //     messageId,
  //     {
  //       $pull: { reactions: { userId } }, // Remove existing reaction from same user
  //       $push: { reactions: { userId, emoji, createdAt: new Date() } }
  //     },
  //     { new: true }
  //   );
  // },
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