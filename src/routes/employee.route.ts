import { Router } from "express";
import { employeeController } from "@/controllers/employee.controller";
import { authGuard } from "@/guards";

export const employee = (router: Router) => {
  router.get("/", employeeController.getEmployeeList);
  router.get("/me", authGuard.isAuth as any, employeeController.getMyInfo);
  router.get(
    "/profile-details/:userId",
    employeeController.getEmployeeProfileDetails
  );
};
