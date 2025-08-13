import { Document } from "mongoose";

export interface DeductionAllowance {
  name: string;
  value: number;
  type: "rate" | "amount";
}

export interface GlobalPayrollSettingsDocument extends Document {
  allowances: DeductionAllowance[];
  deductions: DeductionAllowance[];
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateGlobalPayrollSettingsRequest {
  allowances: DeductionAllowance[];
  deductions: DeductionAllowance[];
}

export interface UpdateGlobalPayrollSettingsRequest {
  allowances?: DeductionAllowance[];
  deductions?: DeductionAllowance[];
}
