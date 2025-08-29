import { Request, Response } from "express";
import { payrollService } from "@/services/payroll.service";
import { globalPayrollSettingsService } from "@/services/global-payroll-settings.service";
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

      // Get active global payroll settings and apply them ONLY if allowances/deductions are undefined/null
      // NOT if they are empty arrays (which means user intentionally removed them)
      let payrollData = { ...req.body };

      if (
        (req.body.allowances === undefined || req.body.allowances === null) &&
        (req.body.deductions === undefined || req.body.deductions === null)
      ) {
        const activeGlobalSettings =
          await globalPayrollSettingsService.getActiveGlobalPayrollSettings();

        if (activeGlobalSettings.length > 0) {
          // Use the first active global settings
          const globalSettings = activeGlobalSettings[0];
          payrollData.allowances = globalSettings.allowances || [];
          payrollData.deductions = globalSettings.deductions || [];
        }
      }

      const payroll = await payrollService.createPayroll(payrollData);
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
          (existingActual as any)._id.toString(),
          {
            contractType: updateData.contactType,
            baseSalary: updateData.actualBaseSalary,
            hourlyRate: updateData.actualHourlyRate,
            allowances: updateData.actualAllowances || [],
            deductions: updateData.actualDeductions || [],
          }
        );
      } else {
        // Get active global payroll settings for new payrolls ONLY if allowances/deductions are undefined/null
        // NOT if they are empty arrays (which means user intentionally removed them)
        let actualAllowances = updateData.actualAllowances || [];
        let actualDeductions = updateData.actualDeductions || [];

        if (
          (updateData.actualAllowances === undefined ||
            updateData.actualAllowances === null) &&
          (updateData.actualDeductions === undefined ||
            updateData.actualDeductions === null)
        ) {
          const activeGlobalSettings =
            await globalPayrollSettingsService.getActiveGlobalPayrollSettings();
          if (activeGlobalSettings.length > 0) {
            const globalSettings = activeGlobalSettings[0];
            actualAllowances = globalSettings.allowances || [];
            actualDeductions = globalSettings.deductions || [];
          }
        }

        const actualPayload = {
          userId: new Types.ObjectId(userId),
          payrollType: PayrollType.ACTUAL,
          contractType: updateData.contactType,
          baseSalary: updateData.actualBaseSalary,
          hourlyRate: updateData.actualHourlyRate,
          allowances: actualAllowances,
          deductions: actualDeductions,
          category:
            (existingGovernment as any)?.category || new Types.ObjectId(),
        };
        actualPayroll = await payrollService.createPayroll(
          actualPayload as any
        );
      }

      // Update or create government payroll
      if (existingGovernment) {
        governmentPayroll = await payrollService.updatePayroll(
          (existingGovernment as any)._id.toString(),
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
        // Get active global payroll settings for new government payrolls ONLY if allowances/deductions are undefined/null
        // NOT if they are empty arrays (which means user intentionally removed them)
        let governmentAllowances = updateData.sameAllowancesDeductions
          ? updateData.actualAllowances || []
          : updateData.governmentAllowances || [];
        let governmentDeductions = updateData.sameAllowancesDeductions
          ? updateData.actualDeductions || []
          : updateData.governmentDeductions || [];

        if (
          (updateData.governmentAllowances === undefined ||
            updateData.governmentAllowances === null) &&
          (updateData.governmentDeductions === undefined ||
            updateData.governmentDeductions === null)
        ) {
          const activeGlobalSettings =
            await globalPayrollSettingsService.getActiveGlobalPayrollSettings();
          if (activeGlobalSettings.length > 0) {
            const globalSettings = activeGlobalSettings[0];
            governmentAllowances = globalSettings.allowances || [];
            governmentDeductions = globalSettings.deductions || [];
          }
        }

        const governmentPayload = {
          userId: new Types.ObjectId(userId),
          payrollType: PayrollType.GOVERNMENT,
          contractType: updateData.contactType,
          baseSalary:
            updateData.governmentBaseSalary || updateData.actualBaseSalary,
          hourlyRate:
            updateData.governmentHourlyRate || updateData.actualHourlyRate,
          allowances: governmentAllowances,
          deductions: governmentDeductions,
          category: (existingActual as any)?.category || new Types.ObjectId(),
        };
        governmentPayroll = await payrollService.createPayroll(
          governmentPayload as any
        );
      }

      // Determine if we have dual payrolls
      const hasDualPayrolls = existingActual && existingGovernment;

      res.json({
        success: true,
        data: {
          actual: actualPayroll,
          government: governmentPayroll,
          hasDualPayrolls: hasDualPayrolls,
        },
      });
    } catch (error) {
      console.error("Error updating merged payroll:", error);
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

      // Determine if we have dual payrolls
      const hasDualPayrolls = actualPayroll && governmentPayroll;

      // Get employee name from populated user data
      const getEmployeeName = (user: any) => {
        if (user?.firstName && user?.lastName) {
          return `${user.firstName} ${user.lastName}`;
        }
        if (user?.firstName) {
          return user.firstName;
        }
        if (user?.lastName) {
          return user.lastName;
        }
        if (user?.email) {
          const emailName = user.email.split("@")[0];
          return emailName
            .replace(/[._]/g, " ")
            .replace(/\b\w/g, (l: string) => l.toUpperCase());
        }
        return "Unknown Employee";
      };

      // Get user data from either actual or government payroll
      const userData = actualPayroll?.userId || governmentPayroll?.userId;
      const employeeName = getEmployeeName(userData);

      // Merge the payrolls into a single response
      const mergedPayroll = {
        _id: actualPayroll?._id || governmentPayroll?._id,
        category: actualPayroll?.category || governmentPayroll?.category,
        userId: actualPayroll?.userId || governmentPayroll?.userId,
        employeeName: employeeName, // Add employee name
        contractType:
          actualPayroll?.contractType || governmentPayroll?.contractType,
        baseSalary: actualPayroll?.baseSalary || 0,
        hourlyRate: actualPayroll?.hourlyRate || 0,
        allowances: actualPayroll?.allowances || [],
        deductions: actualPayroll?.deductions || [],
        // Government payroll data
        governmentAllowances:
          governmentPayroll?.allowances || actualPayroll?.allowances || [],
        governmentDeductions:
          governmentPayroll?.deductions || actualPayroll?.deductions || [],
        governmentBaseSalary:
          governmentPayroll?.baseSalary || actualPayroll?.baseSalary,
        governmentHourlyRate:
          governmentPayroll?.hourlyRate || actualPayroll?.hourlyRate,
        // Flag to indicate if same allowances/deductions are used
        sameAllowancesDeductions: !hasDualPayrolls, // If only one payroll exists, they're the same
        hasDualPayrolls: hasDualPayrolls,
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
