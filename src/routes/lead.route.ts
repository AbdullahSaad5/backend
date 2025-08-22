// src/routes/lead.route.ts
import { LeadController } from "../controllers/lead.controller";
import { Router } from "express";
import { uploadMultipleFiles } from "@/middlewares/uploadMiddlewares";

export const lead = (router: Router) => {
  router.post("/", LeadController.createLead);

  router.get("/search", LeadController.searchAndFilterLead);

  // Get single lead
  router.get("/:id", LeadController.getLead);

  // Get all leads
  router.get("/", LeadController.getAllLeads);

  // Update lead
  router.patch("/:id", LeadController.updateLead);

  // Delete lead
  router.delete("/:id", LeadController.deleteLead);

  // Update lead status (separate route as requested)
  router.patch("/:id/status", LeadController.updateLeadStatus);

  // Get leads by status
  router.get("/status/:status", LeadController.getLeadsByStatus);

  // Get leads by category
  router.get("/category/:categoryId", LeadController.getLeadsByCategory);

  // Get leads by assigned user
  router.get("/assigned/:userId", LeadController.getLeadsByAssignedUser);

  // Post notes in leads
  router.post(
    "/:id/notes",
    uploadMultipleFiles("images", 10),
    LeadController.addNote
  );

  //Delete notes
  router.delete("/:id/notes/:noteId", LeadController.deleteNote);
};

