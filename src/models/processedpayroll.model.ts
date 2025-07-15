import { Schema, model } from "mongoose";
import {
  IProcessedPayroll,
  ProcessedPayrollStatus,
} from "../contracts/processedpayroll.contract";
import { ContractType } from "../contracts/payroll.contract";

const deductionAllowanceSchema = new Schema(
  {
    name: { type: String, required: true },
    value: { type: Number, required: true },
    type: { type: String, enum: ["rate", "amount"], required: true },
  },
  { _id: false }
);

const processedPayrollSchema = new Schema<IProcessedPayroll>(
  {
    employeeId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    payrollPeriod: {
      start: { type: Date, required: true },
      end: { type: Date, required: true },
    },
    contractType: {
      type: String,
      enum: Object.values(ContractType),
      required: true,
    },
    baseSalary: { type: Number },
    hourlyRate: { type: Number },
    hoursWorked: { type: Number },
    deductions: { type: [deductionAllowanceSchema], default: [] },
    allowances: { type: [deductionAllowanceSchema], default: [] },
    grossPay: { type: Number, required: true },
    netPay: { type: Number, required: true },
    status: {
      type: String,
      enum: Object.values(ProcessedPayrollStatus),
      default: ProcessedPayrollStatus.PENDING,
      required: true,
    },
    processedBy: { type: Schema.Types.ObjectId, ref: "User" },
    processedAt: { type: Date },
    notes: { type: String },
    pdfUrl: { type: String },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

export const ProcessedPayroll = model<IProcessedPayroll>(
  "ProcessedPayroll",
  processedPayrollSchema
);
