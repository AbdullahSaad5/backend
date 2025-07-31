import { Router } from "express";
import { payrollController } from "@/controllers/payroll.controller";
import { adminRoleCheck } from "@/middlewares/auth.middleware";
import { validatePayroll } from "@/validations/payroll.validation";

export const payroll = (router: Router) => {
  router.post(
    "/",
    adminRoleCheck,
    validatePayroll,
    payrollController.createPayroll
  );

  router.patch("/:id", adminRoleCheck, payrollController.updatePayroll);

  router.delete(
    "/payroll/:id",
    adminRoleCheck,
    payrollController.deletePayroll
  );

  router.get("/:id", adminRoleCheck, payrollController.getPayroll);
  router.get("/", adminRoleCheck, payrollController.getAllPayrolls);

  router.get(
    "/:id/calculate",
    adminRoleCheck,
    payrollController.calculateNetSalary
  );

  router.get(
    "/user/:userId/merged",
    adminRoleCheck,
    payrollController.getMergedPayrollByUserId
  );

  router.patch(
    "/user/:userId/merged",
    adminRoleCheck,
    payrollController.updateMergedPayroll
  );
};
