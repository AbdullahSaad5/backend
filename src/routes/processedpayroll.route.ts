import { Router } from "express";
import { processedPayrollController } from "../controllers/processedpayroll.controller";

const processedPayroll = (router: Router) => {
  // Create processed payroll
  router.post("/", processedPayrollController.createProcessedPayroll);

  // Get all processed payrolls
  router.get("/", processedPayrollController.getAllProcessedPayrolls);

  // Get processed payroll by id
  router.get("/:id", processedPayrollController.getProcessedPayrollById);

  // Update processed payroll by id
  router.patch("/:id", processedPayrollController.updateProcessedPayrollById);
};

export default processedPayroll;
