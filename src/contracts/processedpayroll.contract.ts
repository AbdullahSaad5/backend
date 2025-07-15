import { Document, Types, Model } from "mongoose";
import { ContractType } from "./payroll.contract";

export enum ProcessedPayrollStatus {
  PENDING = "pending",
  PROCESSED = "processed",
  PAID = "paid",
  REJECTED = "rejected",
}

export interface DeductionAllowance {
  name: string;
  value: number;
  type: "rate" | "amount";
}

export interface IProcessedPayroll extends Document {
  employeeId: Types.ObjectId; // Reference to User
  payrollPeriod: {
    start: Date;
    end: Date;
  };
  contractType: ContractType;
  baseSalary?: number;
  hourlyRate?: number;
  hoursWorked?: number;
  deductions: DeductionAllowance[];
  allowances: DeductionAllowance[];
  grossPay: number;
  netPay: number;
  status: ProcessedPayrollStatus;
  processedBy?: Types.ObjectId; // Reference to Admin/User
  processedAt?: Date;
  notes?: string;
  pdfUrl?: string; // File path, URL, or blob reference
  createdAt: Date;
  updatedAt: Date;
}

export type ProcessedPayrollModel = Model<IProcessedPayroll>;
