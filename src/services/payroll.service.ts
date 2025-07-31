import { Types } from "mongoose";
import { Payroll } from "../models/payroll.model";
import {
  PayrollDocument,
  ContractType,
  PayrollType,
} from "../contracts/payroll.contract";

export const payrollService = {
  async getPayrollByEmployeeId(
    employeeId: string,
    payrollType: PayrollType = PayrollType.ACTUAL
  ) {
    return await Payroll.findOne({ userId: employeeId, payrollType });
  },

  async createPayroll(
    payrollData: Omit<PayrollDocument, "createdAt" | "updatedAt" | "_id">
  ) {
    try {
      const payroll = new Payroll(payrollData);
      await payroll.validate();
      return await payroll.save();
    } catch (error) {
      throw new Error(
        `Failed to create payroll: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
  },

  async updatePayroll(payrollId: string, updateData: Partial<PayrollDocument>) {
    try {
      const payroll = await Payroll.findByIdAndUpdate(
        payrollId,
        { $set: updateData },
        { new: true, runValidators: true }
      );

      if (!payroll) {
        throw new Error("Payroll not found");
      }

      return payroll;
    } catch (error) {
      throw new Error(
        `Failed to update payroll: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
  },

  async deletePayroll(payrollId: string) {
    try {
      const payroll = await Payroll.findByIdAndDelete(payrollId);

      if (!payroll) {
        throw new Error("Payroll not found");
      }

      return payroll;
    } catch (error) {
      throw new Error(
        `Failed to delete payroll: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
  },

  async getPayrollById(payrollId: string) {
    try {
      const payroll = await Payroll.findById(payrollId)
        .populate("category", "name")
        .populate("userId", "firstName lastName email");

      if (!payroll) {
        throw new Error("Payroll not found");
      }

      return payroll;
    } catch (error) {
      throw new Error(
        `Failed to get payroll: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
  },

  async getAllPayrolls(query: {
    category?: Types.ObjectId;
    userId?: Types.ObjectId;
    contractType?: ContractType;
    payrollType?: PayrollType;
  }) {
    try {
      return await Payroll.find(query)
        .populate("category", "name")
        .populate("userId", "name email")
        .sort({ createdAt: -1 });
    } catch (error) {
      throw new Error(
        `Failed to get payrolls: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
  },

  async calculateNetSalary(payrollId: string) {
    try {
      const payroll = await payrollService.getPayrollById(payrollId);

      let grossSalary =
        payroll.contractType === ContractType.MONTHLY
          ? payroll.baseSalary || 0
          : (payroll.hourlyRate || 0) * 160; // Assuming 160 hours per month

      // Apply deductions
      const totalDeductions = payroll.deductions.reduce((total, deduction) => {
        const value =
          deduction.type === "rate"
            ? grossSalary * (deduction.value / 100)
            : deduction.value;
        return total + value;
      }, 0);

      // Apply allowances
      const totalAllowances = payroll.allowances.reduce((total, allowance) => {
        const value =
          allowance.type === "rate"
            ? grossSalary * (allowance.value / 100)
            : allowance.value;
        return total + value;
      }, 0);

      return {
        grossSalary,
        totalDeductions,
        totalAllowances,
        netSalary: grossSalary - totalDeductions + totalAllowances,
      };
    } catch (error) {
      throw new Error(
        `Failed to calculate net salary: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
  },
};
