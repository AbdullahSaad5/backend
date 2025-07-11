import { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import { ChatService, ChatRoomService } from "@/services/chat.service";
import { ConversationStatusService } from "@/services/conversation-status.service";
import { MessageType, MessageStatus, IGroupPermissions, IGroupNotifications } from "@/contracts/chat.contract";
import mongoose from "mongoose";

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
      // 1. Validate request data
      // 2. Call ChatService.sendMessage()
      // 3. Return response
      const { receiver, chatRoom, content, messageType = MessageType.TEXT, fileUrl, fileName, fileSize, fileType, replyTo } = req.body;
      const sender = req.context?.user?.id;

      if (!sender) {
        return res.status(StatusCodes.UNAUTHORIZED).json({
          success: false,
          message: "Authentication required"
        });
      }

      // Allow empty content for file messages
      if (!content && !fileUrl) {
        return res.status(StatusCodes.BAD_REQUEST).json({
          success: false,
          message: "Message content or file is required"
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
        content: content?.trim() || "",
        messageType,
        fileUrl,
        fileName,
        fileSize,
        fileType,
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

  getPendingConversations: async (req: Request, res: Response) => {
    try {
      const userId = req.context?.user?.id;

      if (!userId) {
        return res.status(StatusCodes.UNAUTHORIZED).json({
          success: false,
          message: "Authentication required"
        });
      }

      const conversations = await ChatService.getPendingConversations(userId);

      res.status(StatusCodes.OK).json({
        success: true,
        count: conversations.length,
        data: conversations
      });
    } catch (error) {
      console.error("Get pending conversations error:", error);
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: "Failed to retrieve pending conversations"
      });
    }
  },

  getArchivedConversations: async (req: Request, res: Response) => {
    try {
      const userId = req.context?.user?.id;

      if (!userId) {
        return res.status(StatusCodes.UNAUTHORIZED).json({
          success: false,
          message: "Authentication required"
        });
      }

      const conversations = await ChatService.getArchivedConversations(userId);

      res.status(StatusCodes.OK).json({
        success: true,
        count: conversations.length,
        data: conversations
      });
    } catch (error) {
      console.error("Get archived conversations error:", error);
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: "Failed to retrieve archived conversations"
      });
    }
  },

  archiveConversation: async (req: Request, res: Response) => {
    try {
      const { conversationId, isGroup } = req.body;
      const userId = req.context?.user?.id;

      if (!userId) {
        return res.status(StatusCodes.UNAUTHORIZED).json({
          success: false,
          message: "Authentication required"
        });
      }

      if (!conversationId) {
        return res.status(StatusCodes.BAD_REQUEST).json({
          success: false,
          message: "Conversation ID is required"
        });
      }

      const result = await ConversationStatusService.archiveConversation(
        userId,
        conversationId,
        isGroup || false
      );

      res.status(StatusCodes.OK).json({
        success: true,
        message: "Conversation archived successfully",
        data: result
      });
    } catch (error) {
      console.error("Archive conversation error:", error);
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: "Failed to archive conversation"
      });
    }
  },

  unarchiveConversation: async (req: Request, res: Response) => {
    try {
      const { conversationId } = req.body;
      const userId = req.context?.user?.id;

      if (!userId) {
        return res.status(StatusCodes.UNAUTHORIZED).json({
          success: false,
          message: "Authentication required"
        });
      }

      if (!conversationId) {
        return res.status(StatusCodes.BAD_REQUEST).json({
          success: false,
          message: "Conversation ID is required"
        });
      }

      const result = await ConversationStatusService.unarchiveConversation(
        userId,
        conversationId
      );

      res.status(StatusCodes.OK).json({
        success: true,
        message: "Conversation unarchived successfully",
        data: result
      });
    } catch (error) {
      console.error("Unarchive conversation error:", error);
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: "Failed to unarchive conversation"
      });
    }
  },

  markAsPending: async (req: Request, res: Response) => {
    try {
      const { conversationId, isGroup } = req.body;
      const userId = req.context?.user?.id;

      if (!userId) {
        return res.status(StatusCodes.UNAUTHORIZED).json({
          success: false,
          message: "Authentication required"
        });
      }

      if (!conversationId) {
        return res.status(StatusCodes.BAD_REQUEST).json({
          success: false,
          message: "Conversation ID is required"
        });
      }

      const result = await ConversationStatusService.markAsPending(
        userId,
        conversationId,
        isGroup || false
      );

      res.status(StatusCodes.OK).json({
        success: true,
        message: "Conversation marked as pending",
        data: result
      });
    } catch (error) {
      console.error("Mark as pending error:", error);
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: "Failed to mark conversation as pending"
      });
    }
  },

  markAsNotPending: async (req: Request, res: Response) => {
    try {
      const { conversationId } = req.body;
      const userId = req.context?.user?.id;

      if (!userId) {
        return res.status(StatusCodes.UNAUTHORIZED).json({
          success: false,
          message: "Authentication required"
        });
      }

      if (!conversationId) {
        return res.status(StatusCodes.BAD_REQUEST).json({
          success: false,
          message: "Conversation ID is required"
        });
      }

      const result = await ConversationStatusService.markAsNotPending(
        userId,
        conversationId
      );

      res.status(StatusCodes.OK).json({
        success: true,
        message: "Conversation marked as not pending",
        data: result
      });
    } catch (error) {
      console.error("Mark as not pending error:", error);
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: "Failed to mark conversation as not pending"
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
      console.log('--- START REACTION PROCESSING ---');
      console.log('Headers:', req.headers);
      console.log('Params:', req.params);
      console.log('Body:', req.body);

      const { messageId } = req.params;
      const { emoji } = req.body;
      const userId = req.context?.user?.id;

      console.log('Extracted values:', { messageId, emoji, userId });

      if (!userId) {
        console.log('No userId found - unauthorized');
        return res.status(401).json({ success: false, message: "Authentication required" });
      }

      if (!emoji) {
        console.log('No emoji provided');
        return res.status(400).json({ success: false, message: "Emoji is required" });
      }

      console.log('Calling ChatService.addReaction...');
      const message = await ChatService.addReaction(messageId, userId, emoji);
      console.log('Service returned:', message);

      if (!message) {
        console.log('Message not found');
        return res.status(404).json({ success: false, message: "Message not found" });
      }

      console.log('Reaction added successfully');
      return res.status(200).json({
        success: true,
        message: "Reaction added successfully",
        data: message
      });

    } catch (error) {
      console.error("FULL ERROR DETAILS:", error);
      return res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : "Failed to add reaction"
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
  },

  uploadFile: async (req: Request, res: Response) => {
    try {
      if (!req.file) {
        return res.status(StatusCodes.BAD_REQUEST).json({
          success: false,
          message: "No file uploaded"
        });
      }

      const fileUrl = `${req.protocol}://${req.get('host')}/uploads/complaints/${req.file.filename}`;

      res.status(StatusCodes.OK).json({
        success: true,
        message: "File uploaded successfully",
        data: {
          fileUrl,
          fileName: req.file.originalname,
          fileSize: req.file.size,
          fileType: req.file.mimetype
        }
      });
    } catch (error) {
      console.error("File upload error:", error);
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: "Failed to upload file"
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
  },

  // Enhanced group settings methods
  changeGroupName: async (req: Request, res: Response) => {
    try {
      const { roomId } = req.params;
      const { name } = req.body;
      const userId = req.context?.user?.id;

      if (!userId) {
        return res.status(StatusCodes.UNAUTHORIZED).json({
          success: false,
          message: "Authentication required"
        });
      }

      if (!name || name.trim() === "") {
        return res.status(StatusCodes.BAD_REQUEST).json({
          success: false,
          message: "Group name is required"
        });
      }

      const room = await ChatRoomService.changeGroupName(roomId, name, userId);

      if (!room) {
        return res.status(StatusCodes.NOT_FOUND).json({
          success: false,
          message: "Chat room not found or access denied"
        });
      }

      res.status(StatusCodes.OK).json({
        success: true,
        message: "Group name updated successfully",
        data: room
      });
    } catch (error) {
      console.error("Change group name error:", error);
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: "Failed to update group name"
      });
    }
  },

  changeGroupDescription: async (req: Request, res: Response) => {
    try {
      const { roomId } = req.params;
      const { description } = req.body;
      const userId = req.context?.user?.id;

      if (!userId) {
        return res.status(StatusCodes.UNAUTHORIZED).json({
          success: false,
          message: "Authentication required"
        });
      }

      const room = await ChatRoomService.changeGroupDescription(roomId, description || "", userId);

      if (!room) {
        return res.status(StatusCodes.NOT_FOUND).json({
          success: false,
          message: "Chat room not found or access denied"
        });
      }

      res.status(StatusCodes.OK).json({
        success: true,
        message: "Group description updated successfully",
        data: room
      });
    } catch (error) {
      console.error("Change group description error:", error);
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: "Failed to update group description"
      });
    }
  },

  changeGroupAvatar: async (req: Request, res: Response) => {
    try {
      const { roomId } = req.params;
      const { avatar } = req.body;
      const userId = req.context?.user?.id;

      if (!userId) {
        return res.status(StatusCodes.UNAUTHORIZED).json({
          success: false,
          message: "Authentication required"
        });
      }

      if (!avatar) {
        return res.status(StatusCodes.BAD_REQUEST).json({
          success: false,
          message: "Avatar URL is required"
        });
      }

      const room = await ChatRoomService.changeGroupAvatar(roomId, avatar, userId);

      if (!room) {
        return res.status(StatusCodes.NOT_FOUND).json({
          success: false,
          message: "Chat room not found or access denied"
        });
      }

      res.status(StatusCodes.OK).json({
        success: true,
        message: "Group avatar updated successfully",
        data: room
      });
    } catch (error) {
      console.error("Change group avatar error:", error);
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: "Failed to update group avatar"
      });
    }
  },

  addMultipleParticipants: async (req: Request, res: Response) => {
    try {
      const { roomId } = req.params;
      const { participantIds } = req.body;
      const adminId = req.context?.user?.id;

      if (!adminId) {
        return res.status(StatusCodes.UNAUTHORIZED).json({
          success: false,
          message: "Authentication required"
        });
      }

      if (!participantIds || !Array.isArray(participantIds) || participantIds.length === 0) {
        return res.status(StatusCodes.BAD_REQUEST).json({
          success: false,
          message: "Participant IDs array is required"
        });
      }

      const room = await ChatRoomService.addMultipleParticipants(roomId, participantIds, adminId);

      if (!room) {
        return res.status(StatusCodes.NOT_FOUND).json({
          success: false,
          message: "Chat room not found or access denied"
        });
      }

      res.status(StatusCodes.OK).json({
        success: true,
        message: "Participants added successfully",
        data: room
      });
    } catch (error) {
      console.error("Add multiple participants error:", error);
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: "Failed to add participants"
      });
    }
  },

  removeMultipleParticipants: async (req: Request, res: Response) => {
    try {
      const { roomId } = req.params;
      const { participantIds } = req.body;
      const adminId = req.context?.user?.id;

      if (!adminId) {
        return res.status(StatusCodes.UNAUTHORIZED).json({
          success: false,
          message: "Authentication required"
        });
      }

      if (!participantIds || !Array.isArray(participantIds) || participantIds.length === 0) {
        return res.status(StatusCodes.BAD_REQUEST).json({
          success: false,
          message: "Participant IDs array is required"
        });
      }

      const room = await ChatRoomService.removeMultipleParticipants(roomId, participantIds, adminId);

      if (!room) {
        return res.status(StatusCodes.NOT_FOUND).json({
          success: false,
          message: "Chat room not found or access denied"
        });
      }

      res.status(StatusCodes.OK).json({
        success: true,
        message: "Participants removed successfully",
        data: room
      });
    } catch (error) {
      console.error("Remove multiple participants error:", error);
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: "Failed to remove participants"
      });
    }
  },

  assignAdmin: async (req: Request, res: Response) => {
    try {
      const { roomId } = req.params;
      const { userId: newAdminId } = req.body;
      const adminId = req.context?.user?.id;

      if (!adminId) {
        return res.status(StatusCodes.UNAUTHORIZED).json({
          success: false,
          message: "Authentication required"
        });
      }

      if (!newAdminId) {
        return res.status(StatusCodes.BAD_REQUEST).json({
          success: false,
          message: "User ID is required"
        });
      }

      const room = await ChatRoomService.assignAdmin(roomId, newAdminId, adminId);

      if (!room) {
        return res.status(StatusCodes.NOT_FOUND).json({
          success: false,
          message: "Chat room not found or access denied"
        });
      }

      res.status(StatusCodes.OK).json({
        success: true,
        message: "Admin assigned successfully",
        data: room
      });
    } catch (error) {
      console.error("Assign admin error:", error);
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: "Failed to assign admin"
      });
    }
  },

  removeAdmin: async (req: Request, res: Response) => {
    try {
      const { roomId } = req.params;
      const { userId: adminToRemove } = req.body;
      const adminId = req.context?.user?.id;

      if (!adminId) {
        return res.status(StatusCodes.UNAUTHORIZED).json({
          success: false,
          message: "Authentication required"
        });
      }

      if (!adminToRemove) {
        return res.status(StatusCodes.BAD_REQUEST).json({
          success: false,
          message: "User ID is required"
        });
      }

      const room = await ChatRoomService.removeAdmin(roomId, adminToRemove, adminId);

      if (!room) {
        return res.status(StatusCodes.NOT_FOUND).json({
          success: false,
          message: "Chat room not found or access denied"
        });
      }

      res.status(StatusCodes.OK).json({
        success: true,
        message: "Admin removed successfully",
        data: room
      });
    } catch (error) {
      console.error("Remove admin error:", error);
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: "Failed to remove admin"
      });
    }
  },

  updateNotificationSettings: async (req: Request, res: Response) => {
    try {
      const { roomId } = req.params;
      const settings = req.body;
      const userId = req.context?.user?.id;

      if (!userId) {
        return res.status(StatusCodes.UNAUTHORIZED).json({
          success: false,
          message: "Authentication required"
        });
      }

      const room = await ChatRoomService.updateNotificationSettings(roomId, settings, userId);

      if (!room) {
        return res.status(StatusCodes.NOT_FOUND).json({
          success: false,
          message: "Chat room not found or access denied"
        });
      }

      res.status(StatusCodes.OK).json({
        success: true,
        message: "Notification settings updated successfully",
        data: room
      });
    } catch (error) {
      console.error("Update notification settings error:", error);
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: "Failed to update notification settings"
      });
    }
  },

  updateGroupPermissions: async (req: Request, res: Response) => {
    try {
      const { roomId } = req.params;
      const permissions = req.body;
      const userId = req.context?.user?.id;

      if (!userId) {
        return res.status(StatusCodes.UNAUTHORIZED).json({
          success: false,
          message: "Authentication required"
        });
      }

      const room = await ChatRoomService.updateGroupPermissions(roomId, permissions, userId);

      if (!room) {
        return res.status(StatusCodes.NOT_FOUND).json({
          success: false,
          message: "Chat room not found or access denied"
        });
      }

      res.status(StatusCodes.OK).json({
        success: true,
        message: "Group permissions updated successfully",
        data: room
      });
    } catch (error) {
      console.error("Update group permissions error:", error);
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: "Failed to update group permissions"
      });
    }
  },

  getRoomParticipants: async (req: Request, res: Response) => {
    try {
      const { roomId } = req.params;
      const userId = req.context?.user?.id;

      if (!userId) {
        return res.status(StatusCodes.UNAUTHORIZED).json({
          success: false,
          message: "Authentication required"
        });
      }

      const participants = await ChatRoomService.getRoomParticipants(roomId);

      res.status(StatusCodes.OK).json({
        success: true,
        data: participants
      });
    } catch (error) {
      console.error("Get room participants error:", error);
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: "Failed to get room participants"
      });
    }
  },

  getRoomAdmins: async (req: Request, res: Response) => {
    try {
      const { roomId } = req.params;
      const userId = req.context?.user?.id;

      if (!userId) {
        return res.status(StatusCodes.UNAUTHORIZED).json({
          success: false,
          message: "Authentication required"
        });
      }

      const admins = await ChatRoomService.getRoomAdmins(roomId);

      res.status(StatusCodes.OK).json({
        success: true,
        data: admins
      });
    } catch (error) {
      console.error("Get room admins error:", error);
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: "Failed to get room admins"
      });
    }
  },

  sendGroupNotification: async (req: Request, res: Response) => {
    try {
      const { roomId } = req.params;
      const { message } = req.body;
      const adminId = req.context?.user?.id;

      if (!adminId) {
        return res.status(StatusCodes.UNAUTHORIZED).json({
          success: false,
          message: "Authentication required"
        });
      }

      if (!message || message.trim() === "") {
        return res.status(StatusCodes.BAD_REQUEST).json({
          success: false,
          message: "Notification message is required"
        });
      }

      const success = await ChatRoomService.sendGroupNotification(roomId, message, adminId);

      if (!success) {
        return res.status(StatusCodes.NOT_FOUND).json({
          success: false,
          message: "Chat room not found or access denied"
        });
      }

      res.status(StatusCodes.OK).json({
        success: true,
        message: "Group notification sent successfully"
      });
    } catch (error) {
      console.error("Send group notification error:", error);
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: "Failed to send group notification"
      });
    }
  }
};