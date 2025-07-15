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
  lastHeartbeat: Date;
  heartbeatInterval?: NodeJS.Timeout;
  gracePeriodTimeout?: NodeJS.Timeout;
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
  private heartbeatInterval = 30000; // 30 seconds
  private gracePeriod = 10000; // 10 seconds
  private cleanupInterval = 60000; // 1 minute

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

    // Start periodic cleanup
    this.startPeriodicCleanup();

    console.log("Socket.IO server initialized with enhanced status tracking");
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
        lastHeartbeat: new Date(),
      };

      next();
    } catch (error) {
      next(new Error("Invalid authentication token"));
    }
  }

  private handleConnection(socket: AuthenticatedSocket): void {
    if (!socket.user) return;

    console.log(`=== USER CONNECTION ===`);
    console.log(`User connected: ${socket.user.email} (${socket.id})`);
    console.log(`User ID: ${socket.user.id}`);
    console.log(`Total connected users before adding: ${this.connectedUsers.size}`);

    // Store user connection
    this.connectedUsers.set(socket.user.id, socket.user);
    console.log(`Total connected users after adding: ${this.connectedUsers.size}`);
    console.log(`User isOnline status: ${socket.user.isOnline}`);

    // Start heartbeat for this user
    this.startHeartbeat(socket);

    // Broadcast user online status
    this.broadcastUserStatus(socket.user.id, true);
    console.log(`=== USER CONNECTION COMPLETE ===`);

    // Handle heartbeat from client
    socket.on("heartbeat", () => {
      this.handleHeartbeat(socket);
    });

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
                const updatedMessage = await ChatService.markAsDelivered(message._id as string);
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
                    const updatedMessage = await ChatService.markAsDelivered(message._id as string);
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
      console.log('=== GET ONLINE USERS REQUEST ===');
      console.log('Request from socket:', socket.id);
      console.log('Total connected users:', this.connectedUsers.size);

      const onlineUsers = Array.from(this.connectedUsers.values()).map(
        (user) => ({
          id: user.id,
          email: user.email,
          isOnline: user.isOnline,
          lastSeen: user.lastSeen,
        })
      );

      console.log('Sending online users to client:', onlineUsers);
      console.log('Online users count:', onlineUsers.filter(u => u.isOnline).length);
      console.log('Connected users details:', Array.from(this.connectedUsers.entries()).map(([id, user]) => ({
        id,
        email: user.email,
        isOnline: user.isOnline,
        lastSeen: user.lastSeen
      })));

      socket.emit("online-users", onlineUsers);
      console.log('=== ONLINE USERS SENT ===');
    });

    // Handle disconnect
    socket.on("disconnect", () => {
      this.handleDisconnect(socket);
    });
  }

  // Enhanced heartbeat system
  private startHeartbeat(socket: AuthenticatedSocket): void {
    if (!socket.user) return;

    // Clear any existing heartbeat interval
    if (socket.user.heartbeatInterval) {
      clearInterval(socket.user.heartbeatInterval);
    }

    // Set up heartbeat interval
    socket.user.heartbeatInterval = setInterval(() => {
      this.checkHeartbeat(socket);
    }, this.heartbeatInterval);

    // Send initial heartbeat request
    socket.emit("heartbeat-request");
  }

  private handleHeartbeat(socket: AuthenticatedSocket): void {
    if (!socket.user) return;

    // Update last heartbeat time
    socket.user.lastHeartbeat = new Date();
    socket.user.lastSeen = new Date();

    // Clear grace period timeout if it exists
    if (socket.user.gracePeriodTimeout) {
      clearTimeout(socket.user.gracePeriodTimeout);
      socket.user.gracePeriodTimeout = undefined;
    }

    // Update user status to online if it was offline
    if (!socket.user.isOnline) {
      socket.user.isOnline = true;
      this.connectedUsers.set(socket.user.id, socket.user);
      this.broadcastUserStatus(socket.user.id, true);
      console.log(`User ${socket.user.email} is back online`);
    }

    // Send heartbeat response
    socket.emit("heartbeat-response");
  }

  private checkHeartbeat(socket: AuthenticatedSocket): void {
    if (!socket.user) return;

    const now = new Date();
    const timeSinceLastHeartbeat = now.getTime() - socket.user.lastHeartbeat.getTime();

    // If no heartbeat for more than grace period, mark as offline
    if (timeSinceLastHeartbeat > this.gracePeriod) {
      console.log(`User ${socket.user.email} missed heartbeat, marking as offline`);

      // Set grace period timeout
      socket.user.gracePeriodTimeout = setTimeout(() => {
        this.markUserOffline(socket.user!.id);
      }, this.gracePeriod);

      // Send heartbeat request
      socket.emit("heartbeat-request");
    }
  }

  private markUserOffline(userId: string): void {
    const user = this.connectedUsers.get(userId);
    if (user && user.isOnline) {
      user.isOnline = false;
      user.lastSeen = new Date();
      this.connectedUsers.set(userId, user);

      // Clear heartbeat interval
      if (user.heartbeatInterval) {
        clearInterval(user.heartbeatInterval);
        user.heartbeatInterval = undefined;
      }

      // Clear grace period timeout
      if (user.gracePeriodTimeout) {
        clearTimeout(user.gracePeriodTimeout);
        user.gracePeriodTimeout = undefined;
      }

      this.broadcastUserStatus(userId, false);
      console.log(`User ${user.email} marked as offline`);
    }
  }

  private startPeriodicCleanup(): void {
    setInterval(() => {
      const now = new Date();
      const staleThreshold = 5 * 60 * 1000; // 5 minutes

      for (const [userId, user] of this.connectedUsers.entries()) {
        const timeSinceLastSeen = now.getTime() - user.lastSeen.getTime();

        // Remove stale connections
        if (timeSinceLastSeen > staleThreshold) {
          console.log(`Removing stale connection for user ${user.email}`);
          this.connectedUsers.delete(userId);

          // Clear intervals
          if (user.heartbeatInterval) {
            clearInterval(user.heartbeatInterval);
          }
          if (user.gracePeriodTimeout) {
            clearTimeout(user.gracePeriodTimeout);
          }
        }
      }
    }, this.cleanupInterval);
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

    // Mark user as offline immediately
    this.markUserOffline(socket.user.id);

    // Clean up typing indicators
    this.cleanupTypingIndicators(socket.user.id);

    // Remove from connected users after a delay (in case of reconnection)
    setTimeout(() => {
      this.connectedUsers.delete(socket.user!.id);
    }, 30000); // 30 seconds delay
  }

  private broadcastUserStatus(userId: string, isOnline: boolean): void {
    console.log(`Broadcasting user status change: ${userId} is now ${isOnline ? 'online' : 'offline'}`);
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
