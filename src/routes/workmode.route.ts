import { Router } from "express";
import { workmodeController } from "@/controllers/workmode.controller";
import { adminRoleCheck } from "@/middlewares/auth.middleware";

export const workmode = (router: Router) => {
  // Create a new workmode
  router.post("/", adminRoleCheck, workmodeController.createWorkmode);

  // Get all workmodes
  router.get("/", adminRoleCheck, workmodeController.getAllWorkmodes);

  // Get workmode by ID
  router.get("/:id", adminRoleCheck, workmodeController.getWorkmodeById);
  router.post(
    "/:id",
    adminRoleCheck,
    workmodeController.addEmployeesToWorkmode
  );
  // Update workmode (full update)
  router.put("/:id", workmodeController.updateWorkmode);

  // Patch workmode (partial update)
  router.patch("/:id", workmodeController.patchWorkmode);

  // Delete workmode
  router.delete("/:id", workmodeController.deleteWorkmode);

  router.delete("/:workmodeId/employees/:employeeId", workmodeController.unassignEmployee);
};
