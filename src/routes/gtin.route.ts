import { Router } from "express";
import { gtinController } from "@/controllers";

export const gtin = (router: Router) => {
  router.post("/upload", gtinController.uploadCsv);
  router.get("/", gtinController.getAllGtins);
  router.post("/assign", gtinController.assignGtinToListing);
};
