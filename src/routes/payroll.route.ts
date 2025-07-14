import { Router } from "express";
import { PayrollController } from "../controllers/payroll.controller";
import { adminRoleCheck } from "@/middlewares/auth.middleware";
import { validatePayroll } from "@/validations/payroll.validation";

export const payroll = (router: Router) => {
  const controller = new PayrollController();

  router.post(
    "/",
    adminRoleCheck,
    validatePayroll,
    controller.createPayroll.bind(controller)
  );

  router.put(
    "/:id",
    adminRoleCheck,
    validatePayroll,
    controller.updatePayroll.bind(controller)
  );

  router.delete(
    "/payroll/:id",
    adminRoleCheck,
    controller.deletePayroll.bind(controller)
  );

  router.get("/:id", adminRoleCheck, controller.getPayroll.bind(controller));
  router.get("/", adminRoleCheck, controller.getAllPayrolls.bind(controller));

  router.get(
    "/:id/calculate",
    adminRoleCheck,
    controller.calculateNetSalary.bind(controller)
  );
};

export default payroll;
