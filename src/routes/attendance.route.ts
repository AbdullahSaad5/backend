import { Router } from "express";
import { attendanceController } from "@/controllers/attendance.controller";
import { locationController } from "@/controllers/location.controller";
import { authMiddleware, adminRoleCheck } from "@/middlewares/auth.middleware";
import { authGuard } from "@/guards/auth.guard";
import { locationValidation } from "@/validations/location.validation";

export const attendance = (router: Router) => {
  // Employee self-service routes
  router.post("/check-in", authGuard.isAuth, attendanceController.checkIn);
  router.post("/check-out", authGuard.isAuth, attendanceController.checkOut);
  router.get("/me", attendanceController.getOwnAttendance);
  router.post(
    "/geo-location",
    authGuard.isAuth,
    attendanceController.getGeoLocation
  );

  // Admin routes
  router.post("/admin/mark", adminRoleCheck, attendanceController.adminMark);

  router.patch(
    "/admin/:attendanceId",
    authMiddleware,
    adminRoleCheck,
    attendanceController.updateAttendance
  );
  router.get(
    "/admin/employee/:employeeId",
    authMiddleware,
    adminRoleCheck,
    attendanceController.getEmployeeAttendance
  );
  router.get(
    "/admin/all",
    authMiddleware,
    adminRoleCheck,
    attendanceController.getAllForDate
  );

  // Location routes
  router.get("/locations", locationController.getAllLocations);
  router.get("/punch-in/:employeeId", attendanceController.punchIn);
  router.post(
    "/punch-in/check-in/:employeeId",
    attendanceController.punchInCheckIn
  );

  router.post(
    "/locations",
    authMiddleware,
    adminRoleCheck,
    locationValidation.validateCreate,
    locationController.createLocation
  );

  router.patch(
    "/locations/:locationId",
    authMiddleware,
    adminRoleCheck,
    locationValidation.validateUpdate,
    locationController.updateLocation
  );

  router.delete(
    "/locations/:locationId",
    authMiddleware,
    adminRoleCheck,
    locationController.deleteLocation
  );
};
