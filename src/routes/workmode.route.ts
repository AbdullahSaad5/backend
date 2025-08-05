import { Router } from "express";
import { workmodeController } from "@/controllers/workmode.controller";
import { adminRoleCheck } from "@/middlewares/auth.middleware";
import { authGuard } from "@/guards";

export const workmode = (router: Router) => {
  // Create a new workmode
  router.post("/", authGuard.isAuth, workmodeController.createWorkmode);

  // Get all workmodes
  router.get("/", authGuard.isAuth, workmodeController.getAllWorkmodes);

  // Get workmode by ID
  router.get("/:id", authGuard.isAuth, workmodeController.getWorkmodeById);
  router.post("/:id", authGuard.isAuth, workmodeController.addEmployeesToWorkmode);
  // Update workmode (full update)
  router.put("/:id", authGuard.isAuth, workmodeController.updateWorkmode);

  // Patch workmode (partial update)
  router.patch("/:id", authGuard.isAuth, workmodeController.patchWorkmode);

  // Delete workmode
  router.delete("/:id", authGuard.isAuth, workmodeController.deleteWorkmode);

  router.delete("/:workmodeId/employees/:employeeId", authGuard.isAuth, workmodeController.unassignEmployee);
};
