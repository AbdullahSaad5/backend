import { model, Schema } from "mongoose";

const deductionAllowanceSchema = new Schema(
  {
    name: { type: String, required: true },
    value: { type: Number, required: true },
    type: { type: String, enum: ["rate", "amount"], required: true },
  },
  { _id: false }
);

const globalPayrollSettingsSchema = new Schema(
  {
    allowances: {
      type: [deductionAllowanceSchema],
      default: [],
    },
    deductions: {
      type: [deductionAllowanceSchema],
      default: [],
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    updatedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

// Validation for allowances and deductions
globalPayrollSettingsSchema.pre("validate", function (next) {
  // Validate allowances
  if (this.allowances && this.allowances.length > 0) {
    for (const allowance of this.allowances) {
      if (!allowance.name || allowance.name.trim() === "") {
        return next(new Error("Allowance name is required"));
      }
      if (allowance.value === undefined || allowance.value === null) {
        return next(new Error("Allowance value is required"));
      }
      if (allowance.value < 0) {
        return next(new Error("Allowance value cannot be negative"));
      }
      if (allowance.type === "rate" && allowance.value > 100) {
        return next(new Error("Allowance rate cannot exceed 100%"));
      }
    }
  }

  // Validate deductions
  if (this.deductions && this.deductions.length > 0) {
    for (const deduction of this.deductions) {
      if (!deduction.name || deduction.name.trim() === "") {
        return next(new Error("Deduction name is required"));
      }
      if (deduction.value === undefined || deduction.value === null) {
        return next(new Error("Deduction value is required"));
      }
      if (deduction.value < 0) {
        return next(new Error("Deduction value cannot be negative"));
      }
      if (deduction.type === "rate" && deduction.value > 100) {
        return next(new Error("Deduction rate cannot exceed 100%"));
      }
    }
  }

  next();
});

export const GlobalPayrollSettings = model(
  "GlobalPayrollSettings",
  globalPayrollSettingsSchema
);
