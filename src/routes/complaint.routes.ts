import express from "express";
import { complaintController } from "../controllers/complaint.controller";
import { Router } from "express";

export const complaint = (router: Router) => {
  router.post("/", complaintController.createComplaint);

  // Get single complaint
  router.get("/:id", complaintController.getComplaint);

  // Get all complaints
  router.get("/", complaintController.getAllComplaints);

  // Update complaint
  router.patch("/:id", complaintController.updateComplaint);

  // Delete complaint
  router.delete("/:id", complaintController.deleteComplaint);

  // Add files to complaint
  router.post("/:id/files", complaintController.addFiles);

  router.patch(
    "/:id/status",
    // BlogValidation.editblog,
    complaintController.toggleticketstatus
  );
  router.patch("/:id/priority", complaintController.toggleprioritystatus);

  // Resolve complaint
  router.patch("/:id/resolve", complaintController.resolveComplaint);

  router.patch("/:id/note", complaintController.noteComplaint);
};

// Create complaint
