import express from "express";
import { complaintController } from "../controllers/complaint.controller";
import { Router } from "express";

export const complaint = (router: Router) => {
    router.post(
        "/",
        complaintController.createComplaint
      );
      
      // Get single complaint
      router.get("/:id", complaintController.getComplaint);
      
      // Get all complaints
      router.get("/", complaintController.getAllComplaints);
      
      // Update complaint
      router.put("/:id", complaintController.updateComplaint);
      
      // Delete complaint
      router.delete("/:id", complaintController.deleteComplaint);
      
      // Add files to complaint
      router.post(
        "/:id/files",
        complaintController.addFiles
      );
      
      // Resolve complaint
      router.post("/:id/resolve", complaintController.resolveComplaint);
}

// Create complaint


