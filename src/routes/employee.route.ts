import { Router } from "express";
import { employeeController } from "@/controllers/employee.controller";
import { authGuard } from "@/guards";
import { adminRoleCheck } from "@/middlewares/auth.middleware";

export const employee = (router: Router) => {
  router.get(
    "/",
    authGuard.isAuth as any,
    adminRoleCheck,
    employeeController.getEmployeeList
  );
  router.get("/me", authGuard.isAuth as any, employeeController.getMyInfo);
  router.get(
    "/profile-details/:userId",
    authGuard.isAuth as any,
    adminRoleCheck,
    employeeController.getEmployeeProfileDetails
  );
};
