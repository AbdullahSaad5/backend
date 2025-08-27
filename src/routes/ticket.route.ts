import { tickerControler } from "@/controllers/ticket.controller";
import { Router } from "express";
import { uploadMultipleFiles } from "@/middlewares/uploadMiddlewares";

export const ticket = (router: Router) => {
  router.post("/", tickerControler.addticket);
  router.get("/", tickerControler.getAllTicket);
  router.patch("/:id", tickerControler.editTicket);
  router.delete("/:id", tickerControler.deleteTicket);
  router.get("/:id", tickerControler.getSpecificTicket);
  router.patch("/:id/status", tickerControler.toggleticketstatus);
  router.patch("/:id/priority", tickerControler.toggleprioritystatus);
  router.patch("/:id/role", tickerControler.toggleRole); // Changed from department to role
  router.patch("/:id/assignment", tickerControler.updateAssignment); // New assignment endpoint
  router.post("/:id/resolution", uploadMultipleFiles("images", 10), tickerControler.addResolution);       // Add resolution with images
  router.patch("/:id/resolution", tickerControler.updateResolution);  // Update resolution
  router.delete("/:id/resolution", tickerControler.deleteResolution);
  // Multiple resolutions routes
  router.get("/:id/resolutions", tickerControler.getResolutions);     // Get all resolutions
  router.delete("/:id/resolutions/:resolutionId", tickerControler.deleteResolutionById); // Delete specific resolution
  // New route for uploading images
  router.post("/:id/upload-images", uploadMultipleFiles("images", 5), tickerControler.uploadImages);
  // Notes routes
  router.post("/:id/notes", uploadMultipleFiles("images", 10), tickerControler.addNote);
  router.delete("/:id/notes/:noteId", tickerControler.deleteNote);
  // Comment routes
  router.post("/:id/comments", tickerControler.addComment);
  router.patch("/:id/comments/:commentId", tickerControler.updateComment);
  router.delete("/:id/comments/:commentId", tickerControler.deleteComment);
  // Manual escalation routes
  router.patch("/:id/manual-escalate", tickerControler.manualEscalate);
  router.patch("/:id/de-escalate", tickerControler.deEscalate);
};