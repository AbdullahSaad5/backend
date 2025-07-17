import { Router } from "express";
import { workmodeController } from "@/controllers/workmode.controller";

export const workmode = (router: Router) => {
  // Create a new workmode
  router.post("/", workmodeController.createWorkmode);

  // Get all workmodes
  router.get("/", workmodeController.getAllWorkmodes);

  // Get workmode by ID
  router.get("/:id", workmodeController.getWorkmodeById);
  router.post("/:id", workmodeController.addEmployeesToWorkmode);
  // Update workmode (full update)
  router.put("/:id", workmodeController.updateWorkmode);

  // Patch workmode (partial update)
  router.patch("/:id", workmodeController.patchWorkmode);

  // Delete workmode
  router.delete("/:id", workmodeController.deleteWorkmode);
};
