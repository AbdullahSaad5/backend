import { model, Schema } from "mongoose";
import {
  PayrollDocument,
  ContractType,
  PayrollType,
} from "../contracts/payroll.contract";

const deductionAllowanceSchema = new Schema(
  {
    name: { type: String, required: true },
    value: { type: Number, required: true },
    type: { type: String, enum: ["rate", "amount"], required: true },
  },
  { _id: false }
);

const payrollSchema = new Schema(
  {
    category: {
      type: Schema.Types.ObjectId,
      ref: "UserCategory",
      required: true,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    payrollType: {
      type: String,
      enum: Object.values(PayrollType),
      default: PayrollType.ACTUAL,
      required: true,
    },
    contractType: {
      type: String,
      enum: Object.values(ContractType),
      required: true,
    },
    baseSalary: {
      type: Number,
      required: function (this: PayrollDocument) {
        return this.contractType === ContractType.MONTHLY;
      },
    },
    hourlyRate: {
      type: Number,
      required: function (this: PayrollDocument) {
        return this.contractType === ContractType.HOURLY;
      },
    },
    deductions: {
      type: [deductionAllowanceSchema],
      default: [],
    },
    allowances: {
      type: [deductionAllowanceSchema],
      default: [],
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

// Add compound index to ensure one payroll per type per user
payrollSchema.index({ userId: 1, payrollType: 1 }, { unique: true });

// Validation for either baseSalary or hourlyRate
payrollSchema.pre("validate", function (this: PayrollDocument, next: Function) {
  if (this.contractType === ContractType.MONTHLY && !this.baseSalary) {
    next(new Error("Base salary is required for monthly contracts"));
  } else if (this.contractType === ContractType.HOURLY && !this.hourlyRate) {
    next(new Error("Hourly rate is required for hourly contracts"));
  } else {
    next();
  }
});

export const Payroll = model<PayrollDocument>("Payroll", payrollSchema);
