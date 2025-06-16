// src/services/salary-structure.service.ts
import { ISalaryStructure } from "@/contracts/salaryStructure.contract";
import { SalaryStructureModel } from "@/models/salaryStructure.model";
import { FilterQuery } from "mongoose";

export const SalaryStructureService = {
  createSalaryStructure: (
    position: string,
    baseSalary: number,
    hourlyRate: number,
    bonuses: number,
    allowances: {
      housing: number;
      travel: number;
      other: number;
    },
    benefitsProvided: {
      health: boolean;
      retirement: boolean;
      insurance: boolean;
    }
  ) => {
    const newSalaryStructure = new SalaryStructureModel({ 
      position, 
      baseSalary, 
      hourlyRate, 
      bonuses, 
      allowances, 
      benefitsProvided 
    });
    return newSalaryStructure.save();
  },

  updateSalaryStructure: (id: string, data: {
    position?: string;
    baseSalary?: number;
    hourlyRate?: number;
    bonuses?: number;
    allowances?: {
      housing?: number;
      travel?: number;
      other?: number;
    };
    benefitsProvided?: {
      health?: boolean;
      retirement?: boolean;
      insurance?: boolean;
    };
    isBlocked?: boolean;
  }) => {
    return SalaryStructureModel.findByIdAndUpdate(id, data, { new: true });
  },

  deleteSalaryStructure: (id: string) => {
    return SalaryStructureModel.findByIdAndDelete(id);
  },

  getAllSalaryStructures: (filter: FilterQuery<ISalaryStructure> = {}) => {
    return SalaryStructureModel.find(filter).sort({ position: 1 });
  },

  getSalaryStructureById: (id: string) => {
    return SalaryStructureModel.findById(id);
  },

  getSalaryStructureByPosition: (position: string) => {
    return SalaryStructureModel.findOne({ position });
  },
};