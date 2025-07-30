import { Request, NextFunction } from "express";
import multer, { FileFilterCallback } from "multer";
import { StatusCodes } from "http-status-codes";
import { digitalOceanSpacesStorage } from "@/config/digitalOceanSpaces";

// Enhanced file filter for multiple file types
const fileFilter = (req: any, file: Express.Multer.File, cb: FileFilterCallback) => {
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
    "text/csv"
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
    fileSize: 1024 * 1024 * 50, // 50MB limit (increased for videos)
    files: 10 // Maximum 10 files
  },
  fileFilter: fileFilter,
});

const NUMBER_OF_FILES_LIMIT = 10;

// Middleware function
const uploadMiddleware = (req: any, res: any, next: NextFunction) => {
  upload.single("file")(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      switch (err.code) {
        case "LIMIT_FILE_SIZE":
          return res.status(StatusCodes.BAD_REQUEST).json({
            status: StatusCodes.BAD_REQUEST,
            error: "File size is too large. Max limit is 5MB",
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
    next();
  });
};

export { uploadMiddleware };
