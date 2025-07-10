import { Router } from "express";
import { leaveRequestController } from "@/controllers";
import { adminRoleCheck } from "@/middlewares/auth.middleware";

export const leaveRequest = (router: Router) => {
  router.post("/", leaveRequestController.createLeaveRequest);
  router.patch(
    "/:id",
    adminRoleCheck,
    leaveRequestController.updateLeaveRequestStatus
  );
  router.get("/history", leaveRequestController.getUserLeaveRequests);
  router.get("/", adminRoleCheck, leaveRequestController.getAllLeaveRequests);
  router.get("/id/:id", leaveRequestController.getLeaveRequestById);
};
