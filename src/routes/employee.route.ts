import { employeeController } from "@/controllers/employee.controller";
import { authGuard } from "@/guards";
import { adminRoleCheck } from "@/middlewares/auth.middleware";
import { router } from "./index.route";

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

  router.get("/employee-leaves",authGuard.isAuth as any, employeeController.getEmployeeLeaves);
  router.get("/admin/employee-leaves/:id", authGuard.isAuth as any, adminRoleCheck, employeeController.getEmployeeLeavesById);
};
