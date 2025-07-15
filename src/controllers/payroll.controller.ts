import { Request, Response } from "express";
import { PayrollService } from "../services/payroll.service";
import { Types } from "mongoose";

export class PayrollController {
  private payrollService: PayrollService;

  constructor() {
    this.payrollService = new PayrollService();
  }

  async createPayroll(req: Request, res: Response) {
    try {
      const alreadyExistsPayroll =
        await this.payrollService.getPayrollByEmployeeId(
          req.body.userId.toString()
        );
      console.log("payroll : ", alreadyExistsPayroll);
      console.log("req.body : ", req.body);
      if (alreadyExistsPayroll) {
        return res.status(400).json({
          success: false,
          error: "Payroll already exists- Please update the payroll",
        });
      }

      const payroll = await this.payrollService.createPayroll(req.body);
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
  }

  async updatePayroll(req: Request, res: Response) {
    try {
      const payroll = await this.payrollService.updatePayroll(
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
  }

  async deletePayroll(req: Request, res: Response) {
    try {
      await this.payrollService.deletePayroll(req.params.id);
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
  }

  async getPayroll(req: Request, res: Response) {
    try {
      const payroll = await this.payrollService.getPayrollById(req.params.id);
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
  }

  async getAllPayrolls(req: Request, res: Response) {
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

      const payrolls = await this.payrollService.getAllPayrolls(query);
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
  }

  async calculateNetSalary(req: Request, res: Response) {
    try {
      const salary = await this.payrollService.calculateNetSalary(
        req.params.id
      );
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
  }
}
