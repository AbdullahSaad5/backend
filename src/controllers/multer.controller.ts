import { IBodyRequest } from "@/contracts/request.contract";
import { User } from "@/models";
import { Response } from "express";
import { ReasonPhrases, StatusCodes } from "http-status-codes";
import { ChatService } from "@/services/chat.service";
import { MessageType, MessageStatus } from "@/contracts/chat.contract";

// Enhanced upload controller for DigitalOcean Spaces
export const multerController = {
  upload: async (req: IBodyRequest<{ files: Express.Multer.File[] }>, res: Response) => {
    // The `req.files` object is populated by `multer-s3`
    if (!req.files?.length) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        message: "No files were uploaded.",
        status: StatusCodes.BAD_REQUEST,
      });
    }

    // Format the response to include the file URLs from DigitalOcean Spaces
    const files = (req.files as any[]).map((file) => ({
      url: file.location, // The S3 URL
      name: file.key, // The unique key in your bucket
      originalName: file.originalname,
      size: file.size,
      type: file.contentType,
    }));

    res.status(StatusCodes.OK).json({
      message: "Files uploaded successfully to DigitalOcean Spaces",
      status: StatusCodes.OK,
      files,
    });
  },

  // Controller for handling single file uploads
  uploadSingle: async (req: IBodyRequest<{ file: Express.Multer.File }>, res: Response) => {
    if (!req.file) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        message: "No file was uploaded.",
        status: StatusCodes.BAD_REQUEST,
      });
    }

    const file = req.file as any;

    res.status(StatusCodes.OK).json({
      message: "File uploaded successfully",
      status: StatusCodes.OK,
      file: {
        url: file.location,
        name: file.key,
        originalName: file.originalname,
        size: file.size,
        type: file.contentType,
      },
    });
  },

  // Controller for handling profile picture uploads
  uploadProfilePic: async (req: IBodyRequest<{ file: Express.Multer.File }>, res: Response) => {
    if (!req.file) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        message: "No profile picture was uploaded.",
        status: StatusCodes.BAD_REQUEST,
      });
    }

    const file = req.file as any;
    const user = (req as any).user; // Assuming user is attached by auth middleware

    try {
      // Save the profile picture URL to the user's record in the database
      if (user && user._id) {
        await User.findByIdAndUpdate(user._id, { profileImage: file.location }, { new: true });
      }

      res.status(StatusCodes.OK).json({
        message: "Profile picture updated successfully",
        status: StatusCodes.OK,
        profilePictureUrl: file.location,
      });
    } catch (error) {
      console.error("Error updating profile picture:", error);
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        message: "Failed to update profile picture",
        status: StatusCodes.INTERNAL_SERVER_ERROR,
      });
    }
  },

  // Controller for handling chat file uploads
  uploadChatFile: async (req: IBodyRequest<{ file: Express.Multer.File }>, res: Response) => {
    if (!req.file) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        message: "No chat file was uploaded.",
        status: StatusCodes.BAD_REQUEST,
      });
    }

    const file = req.file as any;
    const user = (req as any).user; // Assuming user is attached by auth middleware

    try {
      // Determine message type based on file type
      let messageType = MessageType.FILE;
      if (file.contentType?.startsWith("image/")) {
        messageType = MessageType.IMAGE;
      } else if (file.contentType?.startsWith("video/")) {
        messageType = MessageType.VIDEO;
      }

      // Create a chat message with the uploaded file
      const messageData = {
        sender: user?._id || user?.id,
        content: "", // Empty content for file messages
        messageType,
        fileUrl: file.location,
        fileName: file.originalname,
        fileSize: file.size,
        fileType: file.contentType,
        status: MessageStatus.SENT,
      };

      // Save the chat message to the database
      const savedMessage = await ChatService.sendMessage(messageData);

      res.status(StatusCodes.OK).json({
        message: "Chat file uploaded successfully",
        status: StatusCodes.OK,
        file: {
          url: file.location,
          name: file.key,
          originalName: file.originalname,
          size: file.size,
          type: file.contentType,
        },
        savedMessage: savedMessage,
      });
    } catch (error) {
      console.error("Error processing chat file:", error);
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        message: "Failed to process chat file",
        status: StatusCodes.INTERNAL_SERVER_ERROR,
      });
    }
  },
};
