import { Request, Response } from "express";
import { payrollService } from "../services/payroll.service";
import { Types } from "mongoose";

export const payrollController = {
  createPayroll: async (req: Request, res: Response) => {
    try {
      const alreadyExistsPayroll = await payrollService.getPayrollByEmployeeId(
        req.body.userId.toString()
      );
      if (alreadyExistsPayroll) {
        return res.status(400).json({
          success: false,
          error: "Payroll already exists- Please update the payroll",
        });
      }

      const payroll = await payrollService.createPayroll(req.body);
      res.status(201).json({
        success: true,
        data: payroll,
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        error:
          error instanceof Error ? error.message : "Failed to create payroll",
      });
    }
  },

  updatePayroll: async (req: Request, res: Response) => {
    try {
      const payroll = await payrollService.updatePayroll(
        req.params.id,
        req.body
      );
      res.json({
        success: true,
        data: payroll,
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        error:
          error instanceof Error ? error.message : "Failed to update payroll",
      });
    }
  },

  deletePayroll: async (req: Request, res: Response) => {
    try {
      await payrollService.deletePayroll(req.params.id);
      res.json({
        success: true,
        message: "Payroll deleted successfully",
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        error:
          error instanceof Error ? error.message : "Failed to delete payroll",
      });
    }
  },

  getPayroll: async (req: Request, res: Response) => {
    try {
      const payroll = await payrollService.getPayrollById(req.params.id);
      res.json({
        success: true,
        data: payroll,
      });
    } catch (error) {
      res.status(404).json({
        success: false,
        error: error instanceof Error ? error.message : "Failed to get payroll",
      });
    }
  },

  getAllPayrolls: async (req: Request, res: Response) => {
    try {
      const query: any = {};

      if (req.query.category) {
        query.category = new Types.ObjectId(req.query.category as string);
      }

      if (req.query.userId) {
        query.userId = new Types.ObjectId(req.query.userId as string);
      }

      if (req.query.contractType) {
        query.contractType = req.query.contractType;
      }

      const payrolls = await payrollService.getAllPayrolls(query);
      res.json({
        success: true,
        data: payrolls,
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        error:
          error instanceof Error ? error.message : "Failed to get payrolls",
      });
    }
  },

  calculateNetSalary: async (req: Request, res: Response) => {
    try {
      const salary = await payrollService.calculateNetSalary(req.params.id);
      res.json({
        success: true,
        data: salary,
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to calculate net salary",
      });
    }
  },
};
