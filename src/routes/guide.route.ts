import { guideController } from "@/controllers/guide.controller";
import express, { Router } from "express";


const router = express.Router();

export const guide = (router: Router) => {
  router.post("/", guideController.createGuide);

  // Get single expense
  router.get("/:id", guideController.getGuide);

  // Get all expenses with optional filters
  router.get("/", guideController.getAllGuides);

  // Update expense
  router.patch("/:id", guideController.updateGuide);

  router.patch("/block/:id", guideController.updateGuide);


  // Delete expense
  router.delete("/:id", guideController.deleteGuide);


};