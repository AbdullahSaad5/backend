import { Router } from "express";
import { processedPayrollController } from "../controllers/processedpayroll.controller";
import { adminRoleCheck } from "@/middlewares/auth.middleware";

const processedpayroll = (router: Router) => {
  // Create processed payroll
  router.post(
    "/",
    adminRoleCheck,
    processedPayrollController.createProcessedPayroll
  );

  // Get all processed payrolls
  router.get(
    "/",
    adminRoleCheck,
    processedPayrollController.getAllProcessedPayrolls
  );

  // Get processed payroll by id
  router.get(
    "/:id",
    adminRoleCheck,
    processedPayrollController.getProcessedPayrollById
  );

  // Update processed payroll by id
  router.patch(
    "/:id",
    adminRoleCheck,
    processedPayrollController.updateProcessedPayrollById
  );
};

export default processedpayroll;
