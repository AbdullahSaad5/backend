import { Router } from "express";
import { ChatController, ChatRoomController } from "@/controllers/chat.controller";
import { authMiddleware } from "@/middlewares";
import { upload } from "@/middlewares/fileUpload.middleware";

export const chat = (router: Router) => {
  // Apply authentication middleware to all chat routes
  router.use(authMiddleware);

  // Message routes
  router.post("/messages", ChatController.sendMessage);
  router.post("/upload", (upload.single('file') as any), ChatController.uploadFile);
  router.get("/messages", ChatController.getMessages);
  router.get("/messages/search", ChatController.searchMessages);
  router.get("/conversations", ChatController.getConversations);
  router.get("/conversations/pending", ChatController.getPendingConversations);
  router.get("/conversations/archived", ChatController.getArchivedConversations);
  router.get("/conversations/read", ChatController.getReadConversations);
  router.post("/conversations/archive", ChatController.archiveConversation);
  router.post("/conversations/unarchive", ChatController.unarchiveConversation);
  router.post("/conversations/pending", ChatController.markAsPending);
  router.post("/conversations/not-pending", ChatController.markAsNotPending);
  router.get("/history/:userId", ChatController.getChatHistory);
  router.patch("/messages/:messageId/read", ChatController.markAsRead);
  router.patch("/conversations/:userId/read", ChatController.markConversationAsRead);
  router.patch("/messages/:messageId", ChatController.editMessage);
  router.delete("/messages/:messageId", ChatController.deleteMessage);
  router.post("/messages/:messageId/reactions", ChatController.addReaction);

  // Chat room routes
  router.post("/rooms", ChatRoomController.createRoom);
  router.get("/rooms", ChatRoomController.getRooms);
  router.get("/rooms/:roomId", ChatRoomController.getRoomById);
  router.patch("/rooms/:roomId", ChatRoomController.updateRoom);
  router.delete("/rooms/:roomId", ChatRoomController.deleteRoom);
  router.post("/rooms/:roomId/participants", ChatRoomController.addParticipant);
  router.delete("/rooms/:roomId/participants", ChatRoomController.removeParticipant);
  router.post("/rooms/:roomId/leave", ChatRoomController.leaveRoom);

  // Enhanced group settings routes
  router.patch("/rooms/:roomId/name", ChatRoomController.changeGroupName);
  router.patch("/rooms/:roomId/description", ChatRoomController.changeGroupDescription);
  router.patch("/rooms/:roomId/avatar", ChatRoomController.changeGroupAvatar);
  router.post("/rooms/:roomId/participants/bulk", ChatRoomController.addMultipleParticipants);
  router.delete("/rooms/:roomId/participants/bulk", ChatRoomController.removeMultipleParticipants);
  router.post("/rooms/:roomId/admins", ChatRoomController.assignAdmin);
  router.delete("/rooms/:roomId/admins", ChatRoomController.removeAdmin);
  router.patch("/rooms/:roomId/notifications", ChatRoomController.updateNotificationSettings);
  router.patch("/rooms/:roomId/permissions", ChatRoomController.updateGroupPermissions);
  router.get("/rooms/:roomId/participants", ChatRoomController.getRoomParticipants);
  router.get("/rooms/:roomId/admins", ChatRoomController.getRoomAdmins);
  router.post("/rooms/:roomId/notifications/send", ChatRoomController.sendGroupNotification);
  router.delete("/rooms/:roomId", ChatRoomController.deleteGroup);

  // Delete conversation route
  router.delete("/conversations/:otherUserId", ChatController.deleteConversation);
};