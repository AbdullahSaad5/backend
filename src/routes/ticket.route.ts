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
  router.post("/:ticketId/resolution", tickerControler.addResolution);       // Add resolution
  router.patch("/:ticketId/resolution", tickerControler.updateResolution);  // Update resolution
  router.delete("/:ticketId/resolution", tickerControler.deleteResolution);
  // New route for uploading images
  router.post("/:id/upload-images", uploadMultipleFiles("images", 5), tickerControler.uploadImages);
};