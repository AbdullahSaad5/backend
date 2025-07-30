import { IBodyRequest } from "@/contracts/request.contract";
import { Response } from "express";
import { ReasonPhrases, StatusCodes } from "http-status-codes";

// Enhanced upload controller for DigitalOcean Spaces
export const multerController = {
  upload: async (
    req: IBodyRequest<{ files: Express.Multer.File[] }>, 
    res: Response
  ) => {
    // The `req.files` object is populated by `multer-s3`
    if (!req.files?.length) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        message: "No files were uploaded.",
        status: StatusCodes.BAD_REQUEST,
      });
    }

    // Format the response to include the file URLs from DigitalOcean Spaces
    const files = (req.files as any[]).map(file => ({
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
  uploadSingle: async (
    req: IBodyRequest<{ file: Express.Multer.File }>, 
    res: Response
  ) => {
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
  uploadProfilePic: async (
    req: IBodyRequest<{ file: Express.Multer.File }>, 
    res: Response
  ) => {
    if (!req.file) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        message: "No profile picture was uploaded.",
        status: StatusCodes.BAD_REQUEST,
      });
    }

    const file = req.file as any;
    const user = (req as any).user; // Assuming user is attached by auth middleware

    // TODO: Add logic here to save the profile picture URL to the user's record in the database
    // For example: 
    // await User.findByIdAndUpdate(user.id, { profilePicture: file.location });

    res.status(StatusCodes.OK).json({
      message: "Profile picture updated successfully",
      status: StatusCodes.OK,
      profilePictureUrl: file.location,
    });
  },
  
  // Controller for handling chat file uploads
  uploadChatFile: async (
    req: IBodyRequest<{ file: Express.Multer.File }>, 
    res: Response
  ) => {
    if (!req.file) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        message: "No chat file was uploaded.",
        status: StatusCodes.BAD_REQUEST,
      });
    }

    const file = req.file as any;

    // TODO: Add logic to process the chat file, e.g., save details to a chat message

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
    });
  }
};
