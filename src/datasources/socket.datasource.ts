import { getAccessTokenFromHeaders } from "@/utils/headers.util";
import { jwtVerify } from "@/utils/jwt.util";
import { Server as HttpServer } from "http";
import { Server, Socket } from "socket.io";
import { conversationService, messageService } from "@/services";
import mongoose, { Types } from "mongoose";

interface User {
  id: string;
}

interface SocketWithUser extends Socket {
  user: User;
}

class SocketManager {
  private io: Server | null = null;
  private userSockets = new Map<string, string>(); // userId -> socketId
  private socketUsers = new Map<string, string>(); // socketId -> userId
  private typingUsers = new Map<string, NodeJS.Timeout>(); // conversationId -> timeout

  public initialize(server: HttpServer): void {
    this.io = new Server(server, {
      cors: {
        origin: "*",
        methods: ["GET", "POST"]
      },
      pingInterval: 10000,
      pingTimeout: 5000,
    });

    this.setupMiddleware();
    this.setupEventHandlers();
    
    console.log("Socket server initialized");
  }

  // Alias for initialize to match your existing code
  public run(server: HttpServer): void {
    this.initialize(server);
  }

  private setupMiddleware(): void {
    this.io!.use(async (socket: Socket, next) => {
      try {
        const { accessToken } = getAccessTokenFromHeaders(socket.handshake.headers);
        if (!accessToken) {
          return next(new Error("Authentication error: No token provided"));
        }

        const user = jwtVerify(accessToken);
        (socket as SocketWithUser).user = { id: user.id.toString() };
        next();
      } catch (error) {
        next(new Error("Authentication error: Invalid token"));
      }
    });
  }

  private setupEventHandlers(): void {
    this.io!.on("connection", (socket: Socket) => {
      const userSocket = socket as SocketWithUser;
      const userId = userSocket.user.id;

      // Track user connection
      this.userSockets.set(userId, socket.id);
      this.socketUsers.set(socket.id, userId);

      console.log(`User connected: ${userId}`);

      // Join all conversation rooms the user is part of
      this.joinConversationRooms(userSocket);

      // Message events
      socket.on("sendMessage", async (data: {
        conversationId: string;
        content: string;
        type?: 'text' | 'image' | 'video' | 'file';
        metadata?: any;
      }) => {
        await this.handleSendMessage(userSocket, data);
      });

      // Typing indicator
      socket.on("typing", (conversationId: string) => {
        this.handleTyping(userSocket, conversationId);
      });

      // Message read receipt
      socket.on("markAsRead", async (messageId: string) => {
        await this.handleMarkAsRead(userSocket, messageId);
      });

      // Join specific conversation room
      socket.on("joinConversation", (conversationId: string) => {
        socket.join(conversationId);
        console.log(`User ${userId} joined conversation ${conversationId}`);
      });

      // Disconnect handler
      socket.on("disconnect", () => {
        this.handleDisconnect(userSocket);
      });
    });
  }

  private async joinConversationRooms(socket: SocketWithUser): Promise<void> {
    try {
      const conversations = await conversationService.getConversationsForUser(socket.user.id, 1, 100);
      conversations.forEach(conversation => {
        socket.join(conversation._id.toString());
      });
    } catch (error) {
      console.error("Error joining conversation rooms:", error);
    }
  }

  private async handleSendMessage(
    socket: SocketWithUser,
    data: {
      conversationId: string;
      content: string;
      type?: 'text' | 'image' | 'video' | 'file';
      metadata?: any;
    }
  ): Promise<void> {
    try {
      const { conversationId, content, type = 'text', metadata } = data;
      const senderId = new Types.ObjectId(socket.user.id);

      // Verify conversation exists and user is participant
      const isParticipant = await conversationService.isParticipant(conversationId, senderId);
      if (!isParticipant) {
        socket.emit("error", { message: "Not authorized to send message" });
        return;
      }

      // Create message
      const message = await messageService.createMessage(
        senderId,
        content,
        new Types.ObjectId(conversationId),
        type,
        metadata
      );

      // Add message to conversation and update lastMessage
      const updatedConversation = await conversationService.addMessageToConversation(
        conversationId,
        message._id
      );

      if (!updatedConversation) {
        socket.emit("error", { message: "Conversation not found" });
        return;
      }

      // Populate sender info for real-time emission
      const populatedMessage = await messageService.getMessageById(message._id.toString());
      if (!populatedMessage) {
        socket.emit("error", { message: "Failed to send message" });
        return;
      }

      // Broadcast to conversation room
      this.io!.to(conversationId).emit("newMessage", {
        message: populatedMessage,
        conversation: updatedConversation
      });

      // Emit to sender for confirmation
      socket.emit("messageSent", populatedMessage);

      // Notify participants (except sender) if they're online
      const participants = updatedConversation.participants
        .filter(p => p.toString() !== socket.user.id)
        .map(p => p.toString());

      participants.forEach(participantId => {
        if (this.userSockets.has(participantId)) {
          this.io!.to(this.userSockets.get(participantId)!).emit("messageNotification", {
            conversationId,
            message: populatedMessage
          });
        }
      });

    } catch (error) {
      console.error("Error sending message:", error);
      socket.emit("error", { message: "Failed to send message" });
    }
  }

  private handleTyping(socket: SocketWithUser, conversationId: string): void {
    // Clear previous timeout if exists
    if (this.typingUsers.has(conversationId)) {
      clearTimeout(this.typingUsers.get(conversationId)!);
    }

    // Broadcast typing event to conversation room (except sender)
    socket.to(conversationId).emit("typing", {
      userId: socket.user.id,
      conversationId,
      isTyping: true
    });

    // Set timeout to stop typing indicator after 3 seconds
    const timeout = setTimeout(() => {
      socket.to(conversationId).emit("typing", {
        userId: socket.user.id,
        conversationId,
        isTyping: false
      });
      this.typingUsers.delete(conversationId);
    }, 3000);

    this.typingUsers.set(conversationId, timeout);
  }

  private async handleMarkAsRead(socket: SocketWithUser, messageId: string): Promise<void> {
    try {
      const message = await messageService.markMessageAsRead(
        messageId,
        new Types.ObjectId(socket.user.id)
      );

      if (message) {
        // Notify conversation participants that message was read
        this.io!.to(message.conversation.toString()).emit("messageRead", {
          messageId,
          readBy: socket.user.id,
          conversationId: message.conversation
        });
      }
    } catch (error) {
      console.error("Error marking message as read:", error);
    }
  }

  private handleDisconnect(socket: SocketWithUser): void {
    const userId = socket.user.id;
    const socketId = socket.id;

    console.log(`User disconnected: ${userId}`);

    // Remove from connection tracking
    this.userSockets.delete(userId);
    this.socketUsers.delete(socketId);

    // Clear any typing indicators
    this.typingUsers.forEach((timeout, conversationId) => {
      socket.to(conversationId).emit("typing", {
        userId,
        conversationId,
        isTyping: false
      });
      clearTimeout(timeout);
    });
    this.typingUsers.clear();
  }
}

export const socketManager = new SocketManager();