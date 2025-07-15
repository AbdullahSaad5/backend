import { Request, Response } from "express";
import { processedPayrollService } from "../services/processedpayroll.service";

export const processedPayrollController = {
  async createProcessedPayroll(req: Request, res: Response) {
    try {
      const data = req.body;
      const processedPayroll =
        await processedPayrollService.createProcessedPayroll(data);
      res.status(201).json({ success: true, data: processedPayroll });
    } catch (error: any) {
      res.status(400).json({ success: false, message: error.message });
    }
  },

  async getAllProcessedPayrolls(_req: Request, res: Response) {
    try {
      const processedPayrolls =
        await processedPayrollService.getAllProcessedPayrolls();
      res.status(200).json({ success: true, data: processedPayrolls });
    } catch (error: any) {
      res.status(400).json({ success: false, message: error.message });
    }
  },

  async getProcessedPayrollById(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const processedPayroll =
        await processedPayrollService.getProcessedPayrollById(id);
      if (!processedPayroll) {
        return res
          .status(404)
          .json({ success: false, message: "Processed payroll not found" });
      }
      res.status(200).json({ success: true, data: processedPayroll });
    } catch (error: any) {
      res.status(400).json({ success: false, message: error.message });
    }
  },

  async updateProcessedPayrollById(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const update = req.body;
      const processedPayroll =
        await processedPayrollService.updateProcessedPayrollById(id, update);
      if (!processedPayroll) {
        return res
          .status(404)
          .json({ success: false, message: "Processed payroll not found" });
      }
      res.status(200).json({ success: true, data: processedPayroll });
    } catch (error: any) {
      res.status(400).json({ success: false, message: error.message });
    }
  },
};
