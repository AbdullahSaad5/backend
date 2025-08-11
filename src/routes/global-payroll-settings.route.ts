import { Router } from "express";
import { globalPayrollSettingsController } from "@/controllers/global-payroll-settings.controller";
import { authGuard } from "@/guards/auth.guard";

export const globalPayrollSettings = (router: Router) => {
  // Get all global payroll settings
  router.get(
    "/",
    authGuard.isAuth,
    globalPayrollSettingsController.getAllGlobalPayrollSettings
  );

  // Get active global payroll settings
  router.get(
    "/active",
    authGuard.isAuth,
    globalPayrollSettingsController.getActiveGlobalPayrollSettings
  );

  // Get global payroll settings by ID
  router.get(
    "/:id",
    authGuard.isAuth,
    globalPayrollSettingsController.getGlobalPayrollSettingsById
  );

  // Create new global payroll settings
  router.post(
    "/",
    authGuard.isAuth,
    globalPayrollSettingsController.createGlobalPayrollSettings
  );

  // Update global payroll settings
  router.patch(
    "/:id",
    authGuard.isAuth,
    globalPayrollSettingsController.updateGlobalPayrollSettings
  );

  // Delete global payroll settings
  router.delete(
    "/:id",
    authGuard.isAuth,
    globalPayrollSettingsController.deleteGlobalPayrollSettings
  );
};
