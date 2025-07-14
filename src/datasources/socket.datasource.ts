import { Server, Socket } from "socket.io";
import { Server as HttpServer } from "http";
import jwt from "jsonwebtoken";
import { ChatService, ChatRoomService } from "@/services/chat.service";
import { MessageType, MessageStatus } from "@/contracts/chat.contract";
import { User } from "@/models/user.model";

interface SocketUser {
  id: string;
  email: string;
  socketId: string;
  isOnline: boolean;
  lastSeen: Date;
  currentRoom?: string;
}

interface AuthenticatedSocket extends Socket {
  user?: SocketUser;
}

interface TypingUsers {
  [key: string]: {
    userId: string;
    userName: string;
    timestamp: Date;
  };
}

class SocketManager {
  private io: Server | null = null;
  private connectedUsers: Map<string, SocketUser> = new Map();
  private typingUsers: Map<string, TypingUsers> = new Map();

  public run(httpServer: HttpServer): void {
    this.io = new Server(httpServer, {
      cors: {
        origin: process.env.FRONTEND_URL || "http://localhost:3000",
        methods: ["GET", "POST"],
        credentials: true,
      },
      pingTimeout: 60000,
      pingInterval: 25000,
    });

    this.io.use(this.authMiddleware.bind(this));
    this.io.on("connection", this.handleConnection.bind(this));

    console.log("Socket.IO server initialized");
  }

  private authMiddleware(
    socket: AuthenticatedSocket,
    next: (err?: Error) => void
  ): void {
    try {
      const token =
        socket.handshake.auth.token ||
        socket.handshake.headers.authorization?.replace("Bearer ", "");

      if (!token) {
        return next(new Error("Authentication token required"));
      }

      const decoded = jwt.verify(
        token,
        process.env.JWT_SECRET || "fallback-secret"
      ) as any;

      socket.user = {
        id: decoded.id,
        email: decoded.email,
        socketId: socket.id,
        isOnline: true,
        lastSeen: new Date(),
      };

      next();
    } catch (error) {
      next(new Error("Invalid authentication token"));
    }
  }

  private handleConnection(socket: AuthenticatedSocket): void {
    if (!socket.user) return;

    console.log(`User connected: ${socket.user.email} (${socket.id})`);

    // Store user connection
    this.connectedUsers.set(socket.user.id, socket.user);

    // Broadcast user online status
    this.broadcastUserStatus(socket.user.id, true);

    // Handle user joining a room
    socket.on("join-room", (roomId: string) => {
      socket.join(roomId);
      if (socket.user) {
        socket.user.currentRoom = roomId;
        this.connectedUsers.set(socket.user.id, socket.user);
      }
      console.log(`User ${socket.user?.email} joined room: ${roomId}`);
    });

    // Handle user leaving a room
    socket.on("leave-room", (roomId: string) => {
      socket.leave(roomId);
      if (socket.user) {
        socket.user.currentRoom = undefined;
        this.connectedUsers.set(socket.user.id, socket.user);
      }
      console.log(`User ${socket.user?.email} left room: ${roomId}`);
    });

    // Handle private message
    socket.on(
      "send-message",
      async (data: {
        receiver?: string;
        chatRoom?: string;
        content: string;
        messageType?: MessageType;
        fileUrl?: string;
        fileName?: string;
        fileSize?: number;
        fileType?: string;
        replyTo?: string;
      }) => {
        try {
          console.log('=== BACKEND SOCKET MESSAGE RECEIVED ===');
          console.log('Socket user:', socket.user);
          console.log('Message data received:', data);

          if (!socket.user) {
            console.error('No socket user found');
            socket.emit("message-error", {
              success: false,
              message: "Authentication required",
            });
            return;
          }

          const messageData = {
            sender: socket.user.id,
            receiver: data.receiver,
            chatRoom: data.chatRoom,
            content: data.content,
            messageType: data.messageType || MessageType.TEXT,
            fileUrl: data.fileUrl,
            fileName: data.fileName,
            fileSize: data.fileSize,
            fileType: data.fileType,
            replyTo: data.replyTo,
            status: MessageStatus.SENT,
          };

          console.log('Prepared message data:', messageData);
          console.log('Message data details:', {
            sender: messageData.sender,
            receiver: messageData.receiver,
            chatRoom: messageData.chatRoom,
            content: messageData.content,
            contentLength: messageData.content?.length,
            contentTrimmed: messageData.content?.trim(),
            messageType: messageData.messageType,
            fileUrl: messageData.fileUrl,
            fileName: messageData.fileName,
            fileSize: messageData.fileSize,
            fileType: messageData.fileType,
            hasFile: !!messageData.fileUrl
          });
          console.log('Calling ChatService.sendMessage...');

          const message = await ChatService.sendMessage(messageData);
          console.log('Message saved successfully:', message);

          // Emit to sender (including the sender in the message)
          socket.emit("message-sent", {
            success: true,
            data: message,
          });

          // Emit to receiver(s) with notification data
          if (data.receiver) {
            // Private message - emit to the private room
            const roomId = [socket.user.id, data.receiver].sort().join('_');
            this.io?.to(roomId).emit("new-message", message);

            // Check if receiver is online and mark as delivered immediately
            const receiverUser = this.connectedUsers.get(data.receiver);
            if (receiverUser) {
              // Receiver is online, mark as delivered immediately
              try {
                console.log('Receiver is online, marking message as delivered:', message._id);
                const updatedMessage = await ChatService.markAsDelivered(message._id);
                if (updatedMessage) {
                  console.log('Message marked as delivered, notifying sender');
                  // Notify sender about delivery status
                  this.io?.to(socket.user!.socketId).emit("message-delivered", {
                    messageId: message._id,
                    status: MessageStatus.DELIVERED
                  });
                  console.log('Message-delivered event emitted to sender');

                  // Also emit to the room for real-time updates
                  if (data.receiver) {
                    const roomId = [socket.user!.id, data.receiver].sort().join('_');
                    this.io?.to(roomId).emit("message-delivered", {
                      messageId: message._id,
                      status: MessageStatus.DELIVERED
                    });
                    console.log('Message-delivered event emitted to room:', roomId);
                  }
                }
              } catch (error) {
                console.error("Error marking message as delivered:", error);
              }
            } else {
              console.log('Receiver is not online, message will remain as SENT');
            }

            // Get sender's actual user data for notification
            try {
              const senderUser = await User.findById(socket.user.id);
              const senderName = senderUser ? `${senderUser.firstName} ${senderUser.lastName}` : socket.user.email || 'Unknown User';

              // Emit notification to receiver
              this.io?.to(data.receiver).emit("new-message-notification", {
                messageId: message._id,
                senderId: socket.user.id,
                senderName: senderName,
                content: data.content,
                messageType: data.messageType || MessageType.TEXT,
                timestamp: new Date(),
                isGroup: false
              });
            } catch (error) {
              console.error("Error fetching sender user data:", error);
              // Fallback to email if user data fetch fails
              this.io?.to(data.receiver).emit("new-message-notification", {
                messageId: message._id,
                senderId: socket.user.id,
                senderName: socket.user.email || 'Unknown User',
                content: data.content,
                messageType: data.messageType || MessageType.TEXT,
                timestamp: new Date(),
                isGroup: false
              });
            }
          } else if (data.chatRoom) {
            // Group message - emit to all users in the room including sender
            this.io?.to(data.chatRoom).emit("new-message", message);

            // Get chat room participants and emit notifications to all except sender
            try {
              const chatRoom = await ChatRoomService.getRoomById(data.chatRoom);
              if (chatRoom && socket.user) {
                // Get sender's actual user data for notification
                const senderUser = await User.findById(socket.user.id);
                const senderName = senderUser ? `${senderUser.firstName} ${senderUser.lastName}` : socket.user.email || 'Unknown User';

                // Mark as delivered for all online participants immediately
                const onlineParticipants = chatRoom.participants.filter(participantId =>
                  participantId !== socket.user!.id && this.connectedUsers.has(participantId)
                );

                if (onlineParticipants.length > 0) {
                  try {
                    console.log('Group message: marking as delivered for online participants');
                    const updatedMessage = await ChatService.markAsDelivered(message._id);
                    if (updatedMessage) {
                      // Notify sender about delivery status
                      this.io?.to(socket.user!.socketId).emit("message-delivered", {
                        messageId: message._id,
                        status: MessageStatus.DELIVERED
                      });
                      console.log('Group message-delivered event emitted to sender');

                      // Also emit to the group room for real-time updates
                      this.io?.to(data.chatRoom).emit("message-delivered", {
                        messageId: message._id,
                        status: MessageStatus.DELIVERED
                      });
                      console.log('Group message-delivered event emitted to room:', data.chatRoom);
                    }
                  } catch (error) {
                    console.error("Error marking group message as delivered:", error);
                  }
                } else {
                  console.log('No online participants for group message');
                }

                chatRoom.participants.forEach((participantId: string) => {
                  if (participantId !== socket.user!.id) {
                    this.io?.to(participantId).emit("new-message-notification", {
                      messageId: message._id,
                      senderId: socket.user!.id,
                      senderName: senderName,
                      content: data.content,
                      messageType: data.messageType || MessageType.TEXT,
                      timestamp: new Date(),
                      isGroup: true,
                      groupName: chatRoom.name,
                      groupId: data.chatRoom
                    });
                  }
                });
              }
            } catch (error) {
              console.error("Error getting chat room for notifications:", error);
            }
          }

          // Stop typing indicator
          this.handleStopTyping(socket, data.receiver, data.chatRoom);
          console.log('=== BACKEND SOCKET MESSAGE PROCESSED SUCCESSFULLY ===');
        } catch (error) {
          console.error("=== BACKEND SOCKET MESSAGE ERROR ===");
          console.error("Send message error:", error);

          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          const errorName = error instanceof Error ? error.name : 'Unknown';
          const errorStack = error instanceof Error ? error.stack : 'No stack trace';

          console.error("Error details:", {
            name: errorName,
            message: errorMessage,
            stack: errorStack
          });

          socket.emit("message-error", {
            success: false,
            message: `Failed to send message: ${errorMessage}`,
          });
        }
      }
    );

    // Handle typing indicators
    socket.on(
      "typing-start",
      (data: { receiver?: string; chatRoom?: string }) => {
        this.handleStartTyping(socket, data.receiver, data.chatRoom);
      }
    );

    socket.on(
      "typing-stop",
      (data: { receiver?: string; chatRoom?: string }) => {
        this.handleStopTyping(socket, data.receiver, data.chatRoom);
      }
    );

    // Handle message read status
    socket.on("mark-as-read", async (data: { messageId: string }) => {
      try {
        if (!socket.user) return;

        const message = await ChatService.markAsRead(
          data.messageId,
          socket.user.id
        );

        if (message) {
          // Notify sender that message was read
          const senderUser = this.connectedUsers.get(message.sender);
          if (senderUser) {
            this.io?.to(senderUser.socketId).emit("message-read", {
              messageId: message._id,
              readBy: socket.user.id,
              readAt: message.readAt,
            });
          }
        }
      } catch (error) {
        console.error("Mark as read error:", error);
      }
    });

    // Handle conversation read status
    socket.on(
      "mark-conversation-read",
      async (data: { otherUserId: string }) => {
        try {
          if (!socket.user) return;

          await ChatService.markConversationAsRead(
            socket.user.id,
            data.otherUserId
          );

          // Notify the other user
          const otherUser = this.connectedUsers.get(data.otherUserId);
          if (otherUser) {
            this.io?.to(otherUser.socketId).emit("conversation-read", {
              userId: socket.user.id,
            });
          }
        } catch (error) {
          console.error("Mark conversation as read error:", error);
        }
      }
    );

    // Handle message reactions
    socket.on(
      "add-reaction",
      async (data: { messageId: string; emoji: string }) => {
        try {
          if (!socket.user) return;

          const message = await ChatService.addReaction(
            data.messageId,
            socket.user.id,
            data.emoji
          );

          if (message) {
            // Broadcast reaction to all participants
            if (message.chatRoom) {
              this.io?.to(message.chatRoom).emit("reaction-added", {
                messageId: message._id,
                userId: socket.user.id,
                emoji: data.emoji,
                reactions: message.reactions,
              });
            } else if (message.receiver) {
              const receiverUser = this.connectedUsers.get(message.receiver);
              if (receiverUser) {
                this.io?.to(receiverUser.socketId).emit("reaction-added", {
                  messageId: message._id,
                  userId: socket.user.id,
                  emoji: data.emoji,
                  reactions: message.reactions,
                });
              }
            }
          }
        } catch (error) {
          console.error("Add reaction error:", error);
        }
      }
    );

    // Handle getting online users
    socket.on("get-online-users", () => {
      const onlineUsers = Array.from(this.connectedUsers.values()).map(
        (user) => ({
          id: user.id,
          email: user.email,
          isOnline: user.isOnline,
          lastSeen: user.lastSeen,
        })
      );

      socket.emit("online-users", onlineUsers);
    });

    // Handle disconnect
    socket.on("disconnect", () => {
      this.handleDisconnect(socket);
    });
  }

  private handleStartTyping(
    socket: AuthenticatedSocket,
    receiver?: string,
    chatRoom?: string
  ): void {
    if (!socket.user) return;

    const typingData = {
      userId: socket.user.id,
      userName: socket.user.email,
      timestamp: new Date(),
    };

    if (receiver) {
      // Private chat typing
      const roomId = [socket.user.id, receiver].sort().join('_');
      const typingUsers = this.typingUsers.get(roomId) || {};
      typingUsers[socket.user.id] = typingData;
      this.typingUsers.set(roomId, typingUsers);

      this.io?.to(roomId).emit("user-typing", {
        userId: socket.user.id,
        userName: socket.user.email,
        isTyping: true,
      });
    } else if (chatRoom) {
      // Group chat typing
      const typingUsers = this.typingUsers.get(chatRoom) || {};
      typingUsers[socket.user.id] = typingData;
      this.typingUsers.set(chatRoom, typingUsers);

      socket.to(chatRoom).emit("user-typing", {
        userId: socket.user.id,
        userName: socket.user.email,
        isTyping: true,
      });
    }
  }

  private handleStopTyping(
    socket: AuthenticatedSocket,
    receiver?: string,
    chatRoom?: string
  ): void {
    if (!socket.user) return;

    if (receiver) {
      // Private chat stop typing
      const roomId = [socket.user.id, receiver].sort().join('_');
      const typingUsers = this.typingUsers.get(roomId) || {};
      delete typingUsers[socket.user.id];
      this.typingUsers.set(roomId, typingUsers);

      this.io?.to(roomId).emit("user-typing", {
        userId: socket.user.id,
        userName: socket.user.email,
        isTyping: false,
      });
    } else if (chatRoom) {
      // Group chat stop typing
      const typingUsers = this.typingUsers.get(chatRoom) || {};
      delete typingUsers[socket.user.id];
      this.typingUsers.set(chatRoom, typingUsers);

      socket.to(chatRoom).emit("user-typing", {
        userId: socket.user.id,
        userName: socket.user.email,
        isTyping: false,
      });
    }
  }

  private handleDisconnect(socket: AuthenticatedSocket): void {
    if (!socket.user) return;

    console.log(`User disconnected: ${socket.user.email} (${socket.id})`);

    // Update user status
    const user = this.connectedUsers.get(socket.user.id);
    if (user) {
      user.isOnline = false;
      user.lastSeen = new Date();
      this.connectedUsers.set(socket.user.id, user);
    }

    // Broadcast user offline status
    this.broadcastUserStatus(socket.user.id, false);

    // Clean up typing indicators
    this.cleanupTypingIndicators(socket.user.id);

    // Remove from connected users after a delay (in case of reconnection)
    setTimeout(() => {
      this.connectedUsers.delete(socket.user!.id);
    }, 30000); // 30 seconds delay
  }

  private broadcastUserStatus(userId: string, isOnline: boolean): void {
    this.io?.emit("user-status-changed", {
      userId,
      isOnline,
      timestamp: new Date(),
    });
  }

  private cleanupTypingIndicators(userId: string): void {
    // Clean up typing indicators for this user
    for (const [key, typingUsers] of this.typingUsers.entries()) {
      if (typingUsers[userId]) {
        delete typingUsers[userId];
        this.typingUsers.set(key, typingUsers);
      }
    }
  }

  // Cleanup typing indicators periodically
  private startTypingCleanup(): void {
    setInterval(() => {
      const now = new Date();
      for (const [key, typingUsers] of this.typingUsers.entries()) {
        for (const [userId, typingData] of Object.entries(typingUsers)) {
          // Remove typing indicator if it's older than 10 seconds
          if (now.getTime() - typingData.timestamp.getTime() > 10000) {
            delete typingUsers[userId];
          }
        }
        this.typingUsers.set(key, typingUsers);
      }
    }, 5000); // Check every 5 seconds
  }

  public getIO(): Server | null {
    return this.io;
  }

  public getConnectedUsers(): Map<string, SocketUser> {
    return this.connectedUsers;
  }
}

export const socketManager = new SocketManager();
