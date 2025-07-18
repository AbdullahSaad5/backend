import { Request, Response, NextFunction } from "express";
import { ContractType } from "../contracts/payroll.contract";

export const validatePayroll = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const {
    category,
    userId,
    contractType,
    baseSalary,
    hourlyRate,
    deductions,
    allowances,
  } = req.body;

  // Required fields
  if (!category || !userId || !contractType) {
    return res.status(400).json({
      success: false,
      error: "Category, userId, and contractType are required",
    });
  }

  // Valid contract type
  if (!Object.values(ContractType).includes(contractType)) {
    return res.status(400).json({
      success: false,
      error: "Invalid contract type",
    });
  }

  // Validate based on contract type
  if (contractType === ContractType.MONTHLY && !baseSalary) {
    return res.status(400).json({
      success: false,
      error: "Base salary is required for monthly contracts",
    });
  }

  if (contractType === ContractType.HOURLY && !hourlyRate) {
    return res.status(400).json({
      success: false,
      error: "Hourly rate is required for hourly contracts",
    });
  }

  // Validate deductions and allowances if provided
  if (deductions) {
    if (!Array.isArray(deductions)) {
      return res.status(400).json({
        success: false,
        error: "Deductions must be an array",
      });
    }

    for (const deduction of deductions) {
      if (!deduction.name || !deduction.value || !deduction.type) {
        return res.status(400).json({
          success: false,
          error: "Each deduction must have name, value, and type",
        });
      }

      if (!["rate", "amount"].includes(deduction.type)) {
        return res.status(400).json({
          success: false,
          error: 'Deduction type must be either "rate" or "amount"',
        });
      }
    }
  }

  if (allowances) {
    if (!Array.isArray(allowances)) {
      return res.status(400).json({
        success: false,
        error: "Allowances must be an array",
      });
    }

    for (const allowance of allowances) {
      if (!allowance.name || !allowance.value || !allowance.type) {
        return res.status(400).json({
          success: false,
          error: "Each allowance must have name, value, and type",
        });
      }

      if (!["rate", "amount"].includes(allowance.type)) {
        return res.status(400).json({
          success: false,
          error: 'Allowance type must be either "rate" or "amount"',
        });
      }
    }
  }

  next();
};
