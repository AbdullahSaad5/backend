import { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import { ChatService, ChatRoomService } from "@/services/chat.service";
import { MessageType, MessageStatus } from "@/contracts/chat.contract";

declare module 'express-serve-static-core' {
  interface Request {
    context?: {
      user?: {
        id: string;
        email: string;
      };
    };
  }
}

export const ChatController = {
  sendMessage: async (req: Request, res: Response) => {
    try {
      const { receiver, chatRoom, content, messageType = MessageType.TEXT, fileUrl, fileName, fileSize, replyTo } = req.body;
      const sender = req.context?.user?.id;

      if (!sender) {
        return res.status(StatusCodes.UNAUTHORIZED).json({
          success: false,
          message: "Authentication required"
        });
      }

      if (!content || content.trim() === "") {
        return res.status(StatusCodes.BAD_REQUEST).json({
          success: false,
          message: "Message content is required"
        });
      }

      if (!receiver && !chatRoom) {
        return res.status(StatusCodes.BAD_REQUEST).json({
          success: false,
          message: "Either receiver or chatRoom must be provided"
        });
      }

      const messageData = {
        sender,
        receiver,
        chatRoom,
        content: content.trim(),
        messageType,
        fileUrl,
        fileName,
        fileSize,
        replyTo,
        status: MessageStatus.SENT
      };

      const message = await ChatService.sendMessage(messageData);

      res.status(StatusCodes.CREATED).json({
        success: true,
        message: "Message sent successfully",
        data: message
      });
    } catch (error: any) {
      console.error("Send message error:", error);
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: "Failed to send message"
      });
    }
  },

  getMessages: async (req: Request, res: Response) => {
    try {
      const { chatRoom, receiver, page = 1, limit = 50 } = req.query;
      const sender = req.context?.user?.id;

      if (!sender) {
        return res.status(StatusCodes.UNAUTHORIZED).json({
          success: false,
          message: "Authentication required"
        });
      }

      const messages = await ChatService.getMessages(
        chatRoom as string,
        sender,
        receiver as string,
        parseInt(page as string),
        parseInt(limit as string)
      );

      res.status(StatusCodes.OK).json({
        success: true,
        count: messages.length,
        data: messages.reverse() // Reverse to show oldest first
      });
    } catch (error) {
      console.error("Get messages error:", error);
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: "Failed to retrieve messages"
      });
    }
  },

  getChatHistory: async (req: Request, res: Response) => {
    try {
      const { userId: otherUserId } = req.params;
      const { page = 1, limit = 50 } = req.query;
      const userId = req.context?.user?.id;

      if (!userId) {
        return res.status(StatusCodes.UNAUTHORIZED).json({
          success: false,
          message: "Authentication required"
        });
      }

      const messages = await ChatService.getChatHistory(
        userId,
        otherUserId,
        parseInt(page as string),
        parseInt(limit as string)
      );

      res.status(StatusCodes.OK).json({
        success: true,
        count: messages.length,
        data: messages.reverse()
      });
    } catch (error) {
      console.error("Get chat history error:", error);
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: "Failed to retrieve chat history"
      });
    }
  },

  getConversations: async (req: Request, res: Response) => {
    try {
      const userId = req.context?.user?.id;

      if (!userId) {
        return res.status(StatusCodes.UNAUTHORIZED).json({
          success: false,
          message: "Authentication required"
        });
      }

      const conversations = await ChatService.getConversations(userId);

      res.status(StatusCodes.OK).json({
        success: true,
        count: conversations.length,
        data: conversations
      });
    } catch (error) {
      console.error("Get conversations error:", error);
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: "Failed to retrieve conversations"
      });
    }
  },

  markAsRead: async (req: Request, res: Response) => {
    try {
      const { messageId } = req.params;
      const userId = req.context?.user?.id;

      if (!userId) {
        return res.status(StatusCodes.UNAUTHORIZED).json({
          success: false,
          message: "Authentication required"
        });
      }

      const message = await ChatService.markAsRead(messageId, userId);

      if (!message) {
        return res.status(StatusCodes.NOT_FOUND).json({
          success: false,
          message: "Message not found or already read"
        });
      }

      res.status(StatusCodes.OK).json({
        success: true,
        message: "Message marked as read",
        data: message
      });
    } catch (error) {
      console.error("Mark as read error:", error);
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: "Failed to mark message as read"
      });
    }
  },

  markConversationAsRead: async (req: Request, res: Response) => {
    try {
      const { userId: otherUserId } = req.params;
      const userId = req.context?.user?.id;

      if (!userId) {
        return res.status(StatusCodes.UNAUTHORIZED).json({
          success: false,
          message: "Authentication required"
        });
      }

      await ChatService.markConversationAsRead(userId, otherUserId);

      res.status(StatusCodes.OK).json({
        success: true,
        message: "Conversation marked as read"
      });
    } catch (error) {
      console.error("Mark conversation as read error:", error);
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: "Failed to mark conversation as read"
      });
    }
  },

  editMessage: async (req: Request, res: Response) => {
    try {
      const { messageId } = req.params;
      const { content } = req.body;
      const userId = req.context?.user?.id;

      if (!userId) {
        return res.status(StatusCodes.UNAUTHORIZED).json({
          success: false,
          message: "Authentication required"
        });
      }

      if (!content || content.trim() === "") {
        return res.status(StatusCodes.BAD_REQUEST).json({
          success: false,
          message: "Message content is required"
        });
      }

      const message = await ChatService.editMessage(messageId, content.trim(), userId);

      if (!message) {
        return res.status(StatusCodes.NOT_FOUND).json({
          success: false,
          message: "Message not found or cannot be edited"
        });
      }

      res.status(StatusCodes.OK).json({
        success: true,
        message: "Message edited successfully",
        data: message
      });
    } catch (error) {
      console.error("Edit message error:", error);
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: "Failed to edit message"
      });
    }
  },

  deleteMessage: async (req: Request, res: Response) => {
    try {
      const { messageId } = req.params;
      const userId = req.context?.user?.id;

      if (!userId) {
        return res.status(StatusCodes.UNAUTHORIZED).json({
          success: false,
          message: "Authentication required"
        });
      }

      const deleted = await ChatService.deleteMessage(messageId, userId);

      if (!deleted) {
        return res.status(StatusCodes.NOT_FOUND).json({
          success: false,
          message: "Message not found or cannot be deleted"
        });
      }

      res.status(StatusCodes.OK).json({
        success: true,
        message: "Message deleted successfully"
      });
    } catch (error) {
      console.error("Delete message error:", error);
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: "Failed to delete message"
      });
    }
  },

  addReaction: async (req: Request, res: Response) => {
    try {
      const { messageId } = req.params;
      const { emoji } = req.body;
      const userId = req.context?.user?.id;

      if (!userId) {
        return res.status(StatusCodes.UNAUTHORIZED).json({
          success: false,
          message: "Authentication required"
        });
      }

      if (!emoji) {
        return res.status(StatusCodes.BAD_REQUEST).json({
          success: false,
          message: "Emoji is required"
        });
      }

      const message = await ChatService.addReaction(messageId, userId, emoji);

      if (!message) {
        return res.status(StatusCodes.NOT_FOUND).json({
          success: false,
          message: "Message not found"
        });
      }

      res.status(StatusCodes.OK).json({
        success: true,
        message: "Reaction added successfully",
        data: message
      });
    } catch (error) {
      console.error("Add reaction error:", error);
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: "Failed to add reaction"
      });
    }
  },

  searchMessages: async (req: Request, res: Response) => {
    try {
      const { q: query, chatRoom } = req.query;
      const userId = req.context?.user?.id;

      if (!userId) {
        return res.status(StatusCodes.UNAUTHORIZED).json({
          success: false,
          message: "Authentication required"
        });
      }

      if (!query || typeof query !== 'string') {
        return res.status(StatusCodes.BAD_REQUEST).json({
          success: false,
          message: "Search query is required"
        });
      }

      const messages = await ChatService.searchMessages(query, userId, chatRoom as string);

      res.status(StatusCodes.OK).json({
        success: true,
        count: messages.length,
        data: messages
      });
    } catch (error) {
      console.error("Search messages error:", error);
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: "Failed to search messages"
      });
    }
  }
};

export const ChatRoomController = {
  createRoom: async (req: Request, res: Response) => {
    try {
      const { name, description, participants = [], isGroup = true, avatar } = req.body;
      const createdBy = req.context?.user?.id;

      if (!createdBy) {
        return res.status(StatusCodes.UNAUTHORIZED).json({
          success: false,
          message: "Authentication required"
        });
      }

      if (!name || name.trim() === "") {
        return res.status(StatusCodes.BAD_REQUEST).json({
          success: false,
          message: "Room name is required"
        });
      }

      const roomData = {
        name: name.trim(),
        description: description?.trim(),
        participants: [createdBy, ...participants],
        admin: [createdBy],
        isGroup,
        avatar,
        createdBy
      };

      const room = await ChatRoomService.createRoom(roomData);

      res.status(StatusCodes.CREATED).json({
        success: true,
        message: "Chat room created successfully",
        data: room
      });
    } catch (error) {
      console.error("Create room error:", error);
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: "Failed to create chat room"
      });
    }
  },

  getRooms: async (req: Request, res: Response) => {
    try {
      const userId = req.context?.user?.id;

      if (!userId) {
        return res.status(StatusCodes.UNAUTHORIZED).json({
          success: false,
          message: "Authentication required"
        });
      }

      const rooms = await ChatRoomService.getRooms(userId);

      res.status(StatusCodes.OK).json({
        success: true,
        count: rooms.length,
        data: rooms
      });
    } catch (error) {
      console.error("Get rooms error:", error);
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: "Failed to retrieve chat rooms"
      });
    }
  },

  getRoomById: async (req: Request, res: Response) => {
    try {
      const { roomId } = req.params;
      const userId = req.context?.user?.id;

      if (!userId) {
        return res.status(StatusCodes.UNAUTHORIZED).json({
          success: false,
          message: "Authentication required"
        });
      }

      const room = await ChatRoomService.getRoomById(roomId);

      if (!room) {
        return res.status(StatusCodes.NOT_FOUND).json({
          success: false,
          message: "Chat room not found"
        });
      }

      // Check if user is a participant
      if (!room.participants.includes(userId)) {
        return res.status(StatusCodes.FORBIDDEN).json({
          success: false,
          message: "Access denied"
        });
      }

      res.status(StatusCodes.OK).json({
        success: true,
        data: room
      });
    } catch (error) {
      console.error("Get room error:", error);
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: "Failed to retrieve chat room"
      });
    }
  },

  updateRoom: async (req: Request, res: Response) => {
    try {
      const { roomId } = req.params;
      const { name, description, avatar } = req.body;
      const userId = req.context?.user?.id;

      if (!userId) {
        return res.status(StatusCodes.UNAUTHORIZED).json({
          success: false,
          message: "Authentication required"
        });
      }

      const updateData: any = {};
      if (name) updateData.name = name.trim();
      if (description) updateData.description = description.trim();
      if (avatar) updateData.avatar = avatar;

      const room = await ChatRoomService.updateRoom(roomId, updateData, userId);

      if (!room) {
        return res.status(StatusCodes.NOT_FOUND).json({
          success: false,
          message: "Chat room not found or access denied"
        });
      }

      res.status(StatusCodes.OK).json({
        success: true,
        message: "Chat room updated successfully",
        data: room
      });
    } catch (error) {
      console.error("Update room error:", error);
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: "Failed to update chat room"
      });
    }
  },

  deleteRoom: async (req: Request, res: Response) => {
    try {
      const { roomId } = req.params;
      const userId = req.context?.user?.id;

      if (!userId) {
        return res.status(StatusCodes.UNAUTHORIZED).json({
          success: false,
          message: "Authentication required"
        });
      }

      const deleted = await ChatRoomService.deleteRoom(roomId, userId);

      if (!deleted) {
        return res.status(StatusCodes.NOT_FOUND).json({
          success: false,
          message: "Chat room not found or access denied"
        });
      }

      res.status(StatusCodes.OK).json({
        success: true,
        message: "Chat room deleted successfully"
      });
    } catch (error) {
      console.error("Delete room error:", error);
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: "Failed to delete chat room"
      });
    }
  },

  addParticipant: async (req: Request, res: Response) => {
    try {
      const { roomId } = req.params;
      const { userId: participantId } = req.body;
      const adminId = req.context?.user?.id;

      if (!adminId) {
        return res.status(StatusCodes.UNAUTHORIZED).json({
          success: false,
          message: "Authentication required"
        });
      }

      if (!participantId) {
        return res.status(StatusCodes.BAD_REQUEST).json({
          success: false,
          message: "Participant ID is required"
        });
      }

      const room = await ChatRoomService.addParticipant(roomId, participantId, adminId);

      if (!room) {
        return res.status(StatusCodes.NOT_FOUND).json({
          success: false,
          message: "Chat room not found or access denied"
        });
      }

      res.status(StatusCodes.OK).json({
        success: true,
        message: "Participant added successfully",
        data: room
      });
    } catch (error) {
      console.error("Add participant error:", error);
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: "Failed to add participant"
      });
    }
  },

  removeParticipant: async (req: Request, res: Response) => {
    try {
      const { roomId } = req.params;
      const { userId: participantId } = req.body;
      const adminId = req.context?.user?.id;

      if (!adminId) {
        return res.status(StatusCodes.UNAUTHORIZED).json({
          success: false,
          message: "Authentication required"
        });
      }

      if (!participantId) {
        return res.status(StatusCodes.BAD_REQUEST).json({
          success: false,
          message: "Participant ID is required"
        });
      }

      const room = await ChatRoomService.removeParticipant(roomId, participantId, adminId);

      if (!room) {
        return res.status(StatusCodes.NOT_FOUND).json({
          success: false,
          message: "Chat room not found or access denied"
        });
      }

      res.status(StatusCodes.OK).json({
        success: true,
        message: "Participant removed successfully",
        data: room
      });
    } catch (error) {
      console.error("Remove participant error:", error);
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: "Failed to remove participant"
      });
    }
  },

  leaveRoom: async (req: Request, res: Response) => {
    try {
      const { roomId } = req.params;
      const userId = req.context?.user?.id;

      if (!userId) {
        return res.status(StatusCodes.UNAUTHORIZED).json({
          success: false,
          message: "Authentication required"
        });
      }

      const left = await ChatRoomService.leaveRoom(roomId, userId);

      if (!left) {
        return res.status(StatusCodes.NOT_FOUND).json({
          success: false,
          message: "Chat room not found"
        });
      }

      res.status(StatusCodes.OK).json({
        success: true,
        message: "Left chat room successfully"
      });
    } catch (error) {
      console.error("Leave room error:", error);
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: "Failed to leave chat room"
      });
    }
  }
};