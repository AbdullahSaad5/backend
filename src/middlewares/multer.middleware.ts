import { Request as ExpressRequest, Response, NextFunction } from "express";
import { Request } from "express-serve-static-core";
import multer, { FileFilterCallback } from "multer";
import path from "path";
import fs from "fs";
import { StatusCodes } from "http-status-codes";

// Check if "uploads" directory exists, else create it
const uploadsDir = path.join(__dirname, "../uploads");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir);
}

// Configure storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, file.fieldname + "-" + uniqueSuffix + path.extname(file.originalname));
  },
});

// File filter function
// const fileFilter = (
//   req: Request,
//   file: Express.Multer.File,
//   cb: FileFilterCallback
// ) => {
//   const allowedFileTypes = /jpeg|jpg|png|gif/;
//   const extname = allowedFileTypes.test(
//     path.extname(file.originalname).toLowerCase()
//   );
//   const mimetype = allowedFileTypes.test(file.mimetype);

//   if (extname && mimetype) {
//     return cb(null, true);
//   } else {
//     cb(new Error("Error: Only images are allowed (jpeg, jpg, png, gif)"));
//   }
// };

// Create multer upload instance
const upload = multer({
  storage: storage,
  limits: { fileSize: 1024 * 1024 * 50 }, // 5MB file size limit
  // fileFilter: fileFilter,
});

const NUMBER_OF_FILES_LIMIT = 10;

// Middleware function
export const uploadMiddleware = (req: any, res: any, next: NextFunction) => {
  // upload.array("files", NUMBER_OF_FILES_LIMIT)(req, res, (err): any => {
  //   if (err instanceof multer.MulterError) {
  //     // A Multer error occurred when uploading.
  //     switch (err.code) {
  //       case "LIMIT_FILE_SIZE":
  //         return res.status(StatusCodes.BAD_REQUEST).json({
  //           status: StatusCodes.BAD_REQUEST,
  //           error: "Error: File size is too large. Max limit is 5MB",
  //         });
  //       case "LIMIT_UNEXPECTED_FILE":
  //         return res.status(StatusCodes.BAD_REQUEST).json({
  //           status: StatusCodes.BAD_REQUEST,
  //           error: `Error: More than ${NUMBER_OF_FILES_LIMIT} files are not allowed`,
  //         });
  //       case "LIMIT_FILE_COUNT":
  //         return res.status(StatusCodes.BAD_REQUEST).json({
  //           status: StatusCodes.BAD_REQUEST,
  //           error: "Error: More than 10 files are not allowed",
  //         });
  //       case "LIMIT_FIELD_KEY":
  //         return res.status(StatusCodes.BAD_REQUEST).json({
  //           status: StatusCodes.BAD_REQUEST,
  //           error: "Error: Field name is too long",
  //         });
  //       case "LIMIT_FIELD_VALUE":
  //         return res.status(StatusCodes.BAD_REQUEST).json({
  //           status: StatusCodes.BAD_REQUEST,
  //           error: "Error: Field value is too long",
  //         });
  //       case "LIMIT_PART_COUNT":
  //         return res.status(StatusCodes.BAD_REQUEST).json({
  //           status: StatusCodes.BAD_REQUEST,
  //           error: "Error: Too many parts",
  //         });
  //       case "LIMIT_FIELD_COUNT":
  //         return res.status(StatusCodes.BAD_REQUEST).json({
  //           status: StatusCodes.BAD_REQUEST,
  //           error: "Error: Too many fields",
  //         });
  //       case "LIMIT_UNEXPECTED_FILE":
  //         return res.status(StatusCodes.BAD_REQUEST).json({
  //           status: StatusCodes.BAD_REQUEST,
  //           error: "Error: Unexpected field",
  //         });
  //       default:
  //         return res.status(StatusCodes.BAD_REQUEST).json({
  //           status: StatusCodes.BAD_REQUEST,
  //           error: err.message,
  //         });
  //     }
  //   } else if (err) {
  //     console.error(err);
  //     // An unknown error occurred when uploading.
  //     return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
  //       status: StatusCodes.INTERNAL_SERVER_ERROR,
  //       error: err.message,
  //     });
  //   }
  //   // Everything went fine.
  //   next();
  // });

  upload.single("file")(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      // Handle multer errors
      switch (err.code) {
        case "LIMIT_FILE_SIZE":
          return res.status(StatusCodes.BAD_REQUEST).json({
            status: StatusCodes.BAD_REQUEST,
            error: "Error: File size is too large. Max limit is 5MB",
          });
        default:
          return res.status(StatusCodes.BAD_REQUEST).json({
            status: StatusCodes.BAD_REQUEST,
            error: err.message,
          });
      }
    } else if (err) {
      // Handle unknown errors
      return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        status: StatusCodes.INTERNAL_SERVER_ERROR,
        error: err.message,
      });
    }
    // Everything went fine.
    next();
  });
};
