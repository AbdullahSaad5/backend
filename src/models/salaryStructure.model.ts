
import { ISalaryStructure, ISalaryStructureModel } from "@/contracts/salaryStructure.contract";
import { Schema, model } from "mongoose";

const SalaryStructureSchema = new Schema<ISalaryStructure, ISalaryStructureModel>({
  position: {
    type: String,
    required: [true, "Position is required"],
    unique: true,
    trim: true,
    maxlength: [100, "Position cannot exceed 100 characters"],
  },
  baseSalary: {
    type: Number,
    required: [true, "Base salary is required"],
    min: [0, "Base salary cannot be negative"],
  },
  hourlyRate: {
    type: Number,
    required: [true, "Hourly rate is required"],
    min: [0, "Hourly rate cannot be negative"],
  },
  bonuses: {
    type: Number,
    default: 0,
    min: [0, "Bonuses cannot be negative"],
  },
  allowances: {
    housing: { type: Number, default: 0, min: [0, "Housing allowance cannot be negative"] },
    travel: { type: Number, default: 0, min: [0, "Travel allowance cannot be negative"] },
    other: { type: Number, default: 0, min: [0, "Other allowance cannot be negative"] },
  },
  benefitsProvided: {
    health: { type: Boolean, default: false },
    retirement: { type: Boolean, default: false },
    insurance: { type: Boolean, default: false },
  },
  isBlocked: {
    type: Boolean,
    default: false,
  },
}, { timestamps: true });

export const SalaryStructureModel = model<ISalaryStructure>("SalaryStructure", SalaryStructureSchema);