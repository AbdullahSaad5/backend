import { Router } from "express";
import { attendanceController } from "@/controllers/attendance.controller";
import { authMiddleware, adminRoleCheck } from "@/middlewares/auth.middleware";
import { authGuard } from "@/guards/auth.guard";

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
};
