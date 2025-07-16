import { ProcessedPayroll } from "../models/processedpayroll.model";
import { IProcessedPayroll } from "../contracts/processedpayroll.contract";

export const processedPayrollService = {
  async createProcessedPayroll(data: Partial<IProcessedPayroll>) {
    if (!data.employeeId || !data.payrollPeriod?.start) {
      throw new Error("Employee and payroll period start date are required.");
    }

    // Get the first and last day of the month for the given start date
    const startDate = new Date(data.payrollPeriod.start);
    const monthStart = new Date(
      startDate.getFullYear(),
      startDate.getMonth(),
      1
    );
    const monthEnd = new Date(
      startDate.getFullYear(),
      startDate.getMonth() + 1,
      0,
      23,
      59,
      59,
      999
    );

    // Check if a payroll already exists for this user and month
    const existing = await ProcessedPayroll.findOne({
      employeeId: data.employeeId,
      "payrollPeriod.start": { $gte: monthStart, $lte: monthEnd },
    });

    if (existing) {
      throw new Error("Payroll for that month already exists.");
    }

    const processedPayroll = new ProcessedPayroll(data);
    return await processedPayroll.save();
  },

  async getAllProcessedPayrolls() {
    return await ProcessedPayroll.find()
      .populate("employeeId", "firstName lastName email")
      .populate("processedBy", "firstName lastName email");
  },

  async getProcessedPayrollById(id: string) {
    return await ProcessedPayroll.findById(id)
      .populate("employeeId", "firstName lastName email")
      .populate("processedBy", "firstName lastName email");
  },

  async updateProcessedPayrollById(
    id: string,
    update: Partial<IProcessedPayroll>
  ) {
    return await ProcessedPayroll.findByIdAndUpdate(id, update, { new: true })
      .populate("employeeId", "firstName lastName email")
      .populate("processedBy", "firstName lastName email");
  },
};
