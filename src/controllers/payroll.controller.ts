import { Request, Response } from "express";
import { payrollService } from "@/services/payroll.service";
import { Types } from "mongoose";
import { PayrollType, PayrollDocument } from "@/contracts/payroll.contract";

export const payrollController = {
  createPayroll: async (req: Request, res: Response) => {
    try {
      const payrollType = req.body.payrollType || PayrollType.ACTUAL;
      const alreadyExistsPayroll = await payrollService.getPayrollByEmployeeId(
        req.body.userId.toString(),
        payrollType
      );
      if (alreadyExistsPayroll) {
        return res.status(400).json({
          success: false,
          error: `${payrollType} payroll already exists for this employee - Please update the payroll`,
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

  updateMergedPayroll: async (req: Request, res: Response) => {
    try {
      const userId = req.params.userId;
      const updateData = req.body;

      // Check if payrolls exist
      const existingActual = await payrollService.getPayrollByEmployeeId(
        userId,
        PayrollType.ACTUAL
      );
      const existingGovernment = await payrollService.getPayrollByEmployeeId(
        userId,
        PayrollType.GOVERNMENT
      );

      let actualPayroll, governmentPayroll;

      // Update or create actual payroll
      if (existingActual) {
        actualPayroll = await payrollService.updatePayroll(
          existingActual._id.toString(),
          {
            contractType: updateData.contactType,
            baseSalary: updateData.actualBaseSalary,
            hourlyRate: updateData.actualHourlyRate,
            allowances: updateData.actualAllowances || [],
            deductions: updateData.actualDeductions || [],
          }
        );
      } else {
        actualPayroll = await payrollService.createPayroll({
          userId: new Types.ObjectId(userId),
          payrollType: PayrollType.ACTUAL,
          contractType: updateData.contactType,
          baseSalary: updateData.actualBaseSalary,
          hourlyRate: updateData.actualHourlyRate,
          allowances: updateData.actualAllowances || [],
          deductions: updateData.actualDeductions || [],
          category: existingGovernment?.category || new Types.ObjectId(), // Use existing category or create new
        });
      }

      // Update or create government payroll
      if (existingGovernment) {
        governmentPayroll = await payrollService.updatePayroll(
          existingGovernment._id.toString(),
          {
            contractType: updateData.contactType,
            baseSalary:
              updateData.governmentBaseSalary || updateData.actualBaseSalary,
            hourlyRate:
              updateData.governmentHourlyRate || updateData.actualHourlyRate,
            allowances: updateData.sameAllowancesDeductions
              ? updateData.actualAllowances || []
              : updateData.governmentAllowances || [],
            deductions: updateData.sameAllowancesDeductions
              ? updateData.actualDeductions || []
              : updateData.governmentDeductions || [],
          }
        );
      } else {
        governmentPayroll = await payrollService.createPayroll({
          userId: new Types.ObjectId(userId),
          payrollType: PayrollType.GOVERNMENT,
          contractType: updateData.contactType,
          baseSalary:
            updateData.governmentBaseSalary || updateData.actualBaseSalary,
          hourlyRate:
            updateData.governmentHourlyRate || updateData.actualHourlyRate,
          allowances: updateData.sameAllowancesDeductions
            ? updateData.actualAllowances || []
            : updateData.governmentAllowances || [],
          deductions: updateData.sameAllowancesDeductions
            ? updateData.actualDeductions || []
            : updateData.governmentDeductions || [],
          category: existingActual?.category || new Types.ObjectId(), // Use existing category or create new
        });
      }

      res.json({
        success: true,
        data: {
          actual: actualPayroll,
          government: governmentPayroll,
        },
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to update merged payroll",
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

      // Add payroll type filter
      if (req.query.payrollType) {
        query.payrollType = req.query.payrollType;
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

  getMergedPayrollByUserId: async (req: Request, res: Response) => {
    try {
      const userId = req.params.userId;
      const actualPayroll = await payrollService.getPayrollByEmployeeId(
        userId,
        PayrollType.ACTUAL
      );
      const governmentPayroll = await payrollService.getPayrollByEmployeeId(
        userId,
        PayrollType.GOVERNMENT
      );

      // If no payrolls exist, return empty data
      if (!actualPayroll && !governmentPayroll) {
        return res.status(404).json({
          success: false,
          error: "No payroll found for this employee",
        });
      }

      // Merge the payrolls into a single response
      const mergedPayroll = {
        _id: actualPayroll?._id || governmentPayroll?._id,
        category: actualPayroll?.category || governmentPayroll?.category,
        userId: actualPayroll?.userId || governmentPayroll?.userId,
        contractType:
          actualPayroll?.contractType || governmentPayroll?.contractType,
        baseSalary: actualPayroll?.baseSalary || 0,
        hourlyRate: actualPayroll?.hourlyRate || 0,
        allowances: actualPayroll?.allowances || [],
        deductions: actualPayroll?.deductions || [],
        // Government payroll data
        governmentAllowances: governmentPayroll?.allowances || [],
        governmentDeductions: governmentPayroll?.deductions || [],
        governmentBaseSalary: governmentPayroll?.baseSalary,
        governmentHourlyRate: governmentPayroll?.hourlyRate,
        // Flag to indicate if same allowances/deductions are used
        sameAllowancesDeductions: false, // This will be determined by frontend logic
        createdAt: actualPayroll?.createdAt || governmentPayroll?.createdAt,
        updatedAt: actualPayroll?.updatedAt || governmentPayroll?.updatedAt,
      };

      res.json({
        success: true,
        data: mergedPayroll,
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to get merged payroll",
      });
    }
  },
};
