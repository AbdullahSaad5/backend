import { Router } from "express";
import { processedPayrollController } from "../controllers/processedpayroll.controller";
import { adminRoleCheck } from "@/middlewares/auth.middleware";

export const processedpayroll = (router: Router) => {
  // Create processed payroll
  router.post(
    "/",
    adminRoleCheck,
    processedPayrollController.createProcessedPayroll
  );

  // Create dual processed payrolls (actual and government)
  router.post(
    "/dual",
    adminRoleCheck,
    processedPayrollController.createDualProcessedPayrolls
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

  // Get processed payrolls by employee and period
  router.get(
    "/employee/:employeeId/period/:startDate/:endDate",
    adminRoleCheck,
    processedPayrollController.getProcessedPayrollsByEmployeeAndPeriod
  );

  // Update processed payroll by id
  router.patch(
    "/:id",
    adminRoleCheck,
    processedPayrollController.updateProcessedPayrollById
  );

  // Update dual processed payrolls
  router.patch(
    "/dual/:actualId/:governmentId",
    adminRoleCheck,
    processedPayrollController.updateDualProcessedPayrolls
  );

  // Get merged processed payroll by user and month
  router.get(
    "/user/:userId/month/:month/year/:year/merged",
    adminRoleCheck,
    processedPayrollController.getMergedProcessedPayrollByUserId
  );

  // Update merged processed payroll by user and month
  router.patch(
    "/user/:userId/month/:month/year/:year/merged",
    adminRoleCheck,
    processedPayrollController.updateMergedProcessedPayroll
  );
};
