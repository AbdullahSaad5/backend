import { Router } from "express";
import { gtinController } from "@/controllers";
import { uploadMiddleware } from "@/middlewares/multer.middleware";

export const gtin = (router: Router) => {
  router.post("/upload", uploadMiddleware, gtinController.uploadCsv);
  router.get("/", gtinController.getAllGtins);
  router.post("/assign", gtinController.assignGtinToListing);
};
