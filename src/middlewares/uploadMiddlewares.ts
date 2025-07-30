import { NextFunction, Request, Response } from "express";
import multer from "multer";
import { StatusCodes } from "http-status-codes";
import { digitalOceanSpacesStorage } from "@/config/digitalOceanSpaces";

// Enhanced file filter for multiple file types
const fileFilter = (req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const allowedTypes = [
    // Excel files
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "application/vnd.ms-excel",
    // Images
    "image/jpeg",
    "image/jpg",
    "image/png",
    "image/gif",
    "image/webp",
    // Videos
    "video/mp4",
    "video/avi",
    "video/mov",
    "video/wmv",
    "video/flv",
    "video/mkv",
    "video/webm",
    // Documents
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/vnd.ms-powerpoint",
    "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    "text/plain",
    "text/csv",
  ];

  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error(`File type ${file.mimetype} is not allowed`));
  }
};

// Create multer upload instance with DigitalOcean Spaces
const upload = multer({
  storage: digitalOceanSpacesStorage,
  limits: {
    fileSize: 1024 * 1024 * 50, // 50MB limit
    files: 10, // Maximum 10 files
  },
  fileFilter: fileFilter,
});

// Error handler for multer errors
const handleMulterError = (err: any, res: Response) => {
  if (err instanceof multer.MulterError) {
    switch (err.code) {
      case "LIMIT_FILE_SIZE":
        return res.status(StatusCodes.BAD_REQUEST).json({
          status: StatusCodes.BAD_REQUEST,
          error: "File size is too large. Max limit is 50MB",
        });
      case "LIMIT_FILE_COUNT":
        return res.status(StatusCodes.BAD_REQUEST).json({
          status: StatusCodes.BAD_REQUEST,
          error: "Too many files. Max limit is 10 files",
        });
      case "LIMIT_UNEXPECTED_FILE":
        return res.status(StatusCodes.BAD_REQUEST).json({
          status: StatusCodes.BAD_REQUEST,
          error: "Unexpected field name",
        });
      default:
        return res.status(StatusCodes.BAD_REQUEST).json({
          status: StatusCodes.BAD_REQUEST,
          error: err.message,
        });
    }
  } else if (err) {
    return res.status(StatusCodes.BAD_REQUEST).json({
      status: StatusCodes.BAD_REQUEST,
      error: err.message,
    });
  }
};

// Single file upload middleware
export const uploadSingleFile = (fieldName: string = "file") => {
  return (req: any | Request, res: any | Response, next: NextFunction) => {
    upload.single(fieldName)(req, res, (err) => {
      if (err) {
        return handleMulterError(err, res);
      }
      next();
    });
  };
};

// Multiple files upload middleware (same field name)
export const uploadMultipleFiles = (fieldName: string = "files", maxCount: number = 10) => {
  return (req: any | Request, res: any | Response, next: NextFunction) => {
    upload.array(fieldName, maxCount)(req, res, (err) => {
      if (err) {
        return handleMulterError(err, res);
      }
      next();
    });
  };
};

// Multiple files with different field names
export const uploadFields = (fields: { name: string; maxCount?: number }[]) => {
  return (req: any | Request, res: any | Response, next: NextFunction) => {
    upload.fields(fields)(req, res, (err) => {
      if (err) {
        return handleMulterError(err, res);
      }
      next();
    });
  };
};

// Chat file upload middleware (for chat functionality)
export const uploadChatFile = (req: any | Request, res: any | Response, next: NextFunction) => {
  upload.single("chatFile")(req, res, (err) => {
    if (err) {
      return handleMulterError(err, res);
    }
    next();
  });
};

// Profile picture upload middleware
export const uploadProfilePicture = (req: any | Request, res: any | Response, next: NextFunction) => {
  // Create a specific filter for images only
  const imageUpload = multer({
    storage: digitalOceanSpacesStorage,
    limits: {
      fileSize: 1024 * 1024 * 5, // 5MB limit for profile pictures
    },
    fileFilter: (req, file, cb) => {
      const allowedImageTypes = ["image/jpeg", "image/jpg", "image/png", "image/gif", "image/webp"];

      if (allowedImageTypes.includes(file.mimetype)) {
        cb(null, true);
      } else {
        cb(new Error("Only image files are allowed for profile pictures"));
      }
    },
  });

  imageUpload.single("profilePicture")(req, res, (err) => {
    if (err) {
      return handleMulterError(err, res);
    }
    next();
  });
};

// Legacy middleware for backward compatibility
export const uploadMiddleware = uploadSingleFile("file");
