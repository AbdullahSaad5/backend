
import { Model, Document } from "mongoose";

export interface IAllowances {
  housing: number;
  travel: number;
  other: number;
}

export interface IBenefitsProvided {
  health: boolean;
  retirement: boolean;
  insurance: boolean;
}

export interface ISalaryStructure extends Document {
    _id: string;
  position: string;
  baseSalary: number;
  hourlyRate: number;
  bonuses: number;
  allowances: IAllowances;
  benefitsProvided: IBenefitsProvided;
  isBlocked: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export type ISalaryStructureModel = Model<ISalaryStructure>;