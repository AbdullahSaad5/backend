import { ProcessedPayroll } from "../models/processedpayroll.model";
import { IProcessedPayroll } from "../contracts/processedpayroll.contract";

export const processedPayrollService = {
  async createProcessedPayroll(data: Partial<IProcessedPayroll>) {
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
