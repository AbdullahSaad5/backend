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
  private connections = new Map<string, string>();
  private io: Server | null = null;
  private groupRooms = new Map<string, Set<string>>();

  private initializeServer(server: HttpServer): void {
    this.io = new Server(server, {
      cors: { origin: "*" },
    });
  }

  private setupMiddleware(): void {
    this.io!.use(async (socket: Socket, next) => {
      try {
        const { accessToken } = getAccessTokenFromHeaders(socket.handshake.headers);
        if (!accessToken) return next(new Error("No access token"));

        const user = jwtVerify(accessToken);
        (socket as SocketWithUser).user = { id: user.id.toString() };
        next();
      } catch (error) {
        console.log("Authentication error:", error);
        next(new Error("Authentication failed"));
      }
    });
  }

  private handleConnection(socket: SocketWithUser): void {
    console.log(`User connected: ${socket.user.id}`);
    this.connections.set(socket.user.id, socket.id);

    // Personal messaging
    socket.on("message", async (conversationId: string, message: string) => {
      try {
        const conversation = await conversationService.getConversationById(conversationId);
        if (!conversation) {
          return socket.emit("error", "Conversation not found");
        }

        const senderId = new mongoose.Types.ObjectId(socket.user.id);
        
        // Verify participant
        const isParticipant = conversation.participants.some(p => p.equals(senderId));
        if (!isParticipant) {
          return socket.emit("error", "Not authorized");
        }

        // Create message
        const newMessage = await messageService.createMessage(
          senderId,
          message,
          new mongoose.Types.ObjectId(conversationId)
        );

        // Add message to conversation
        await conversationService.addMessageToConversation(
          conversationId,
          newMessage._id
        );

        // Find other participants
        const receivers = conversation.participants
          .filter(p => !p.equals(senderId))
          .map(p => p.toString());

        // Send to online participants
        receivers.forEach(receiverId => {
          if (this.connections.has(receiverId)) {
            this.io!.to(this.connections.get(receiverId)!).emit("message", newMessage);
          }
        });

      } catch (error) {
        console.log("Message error:", error);
        socket.emit("error", "Failed to send message");
      }
    });

    // Group messaging
    socket.on("groupMessage", async (groupId: string, message: string) => {
      try {
        const group = await conversationService.getConversationById(groupId);
        if (!group?.isGroup) {
          return socket.emit("error", "Group not found");
        }

        const senderId = new mongoose.Types.ObjectId(socket.user.id);
        const newMessage = await messageService.createMessage(
          senderId,
          message,
          new mongoose.Types.ObjectId(groupId)
        );

        await conversationService.addMessageToConversation(groupId, newMessage._id);

        // Broadcast to group
        this.io!.to(groupId).emit("groupMessage", newMessage);

      } catch (error) {
        console.log("Group message error:", error);
        socket.emit("error", "Failed to send group message");
      }
    });

    // Group management
    socket.on("joinGroup", (groupId: string) => {
      socket.join(groupId);
      console.log(`User ${socket.user.id} joined group ${groupId}`);
    });

    socket.on("disconnect", () => {
      console.log(`User disconnected: ${socket.user.id}`);
      this.connections.delete(socket.user.id);
    });
  }

  public run(server: HttpServer): void {
    this.initializeServer(server);
    this.setupMiddleware();
    
    this.io!.on("connection", (socket: Socket) => {
      this.handleConnection(socket as SocketWithUser);
    });

    console.log("Socket server running");
  }
}

export const socketManager = new SocketManager();