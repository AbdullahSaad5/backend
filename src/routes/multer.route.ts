import { multerController } from "@/controllers/multer.controller";
import { authGuard } from "@/guards";
import { authMiddleware } from "@/middlewares";
import { uploadMiddleware } from "@/middlewares/multer.middleware";
import {
  uploadSingleFile,
  uploadSingleFileGlobal,
  uploadMultipleFiles,
  uploadChatFile,
  uploadProfilePicture,
} from "@/middlewares/uploadMiddlewares";
import { Router } from "express";

export const multer = (router: Router) => {
  // Legacy route for backward compatibility
  router.post("/upload", authGuard.isAuth, uploadMiddleware, multerController.upload);

  // Global file upload (accepts all file types)
  router.post("/upload/global", authGuard.isAuth, uploadSingleFileGlobal("file"), multerController.uploadSingle);

  // Single file upload
  router.post("/upload/single", authGuard.isAuth, uploadSingleFile(), multerController.uploadSingle);

  // Multiple files upload
  router.post("/upload/multiple", authGuard.isAuth, uploadMultipleFiles("files", 10), multerController.upload);

  // Chat file upload
  router.post("/upload/chat", authGuard.isAuth, uploadChatFile, multerController.uploadChatFile);

  // Profile picture upload
  router.post("/upload/profile-picture", authGuard.isAuth, uploadProfilePicture, multerController.uploadProfilePic);

  // Document upload (for specific document types)
  router.post("/upload/document", authGuard.isAuth, uploadSingleFile("document"), multerController.uploadSingle);

  // Image upload (for galleries, posts, etc.)
  router.post("/upload/image", authGuard.isAuth, uploadSingleFile("image"), multerController.uploadSingle);

  // Video upload
  router.post("/upload/video", authGuard.isAuth, uploadSingleFile("video"), multerController.uploadSingle);
};
