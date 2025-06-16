// src/controllers/salary-structure.controller.ts
import { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import { SalaryStructureService } from "@/services/salaryStructure.service";

export const SalaryStructureController = {
  /**
   * @desc    Create a new Salary Structure
   * @route   POST /api/salary-structures
   * @access  Private/Admin
   */
  createSalaryStructure: async (req: Request, res: Response) => {
    try {
      const { 
        position, 
        baseSalary, 
        hourlyRate, 
        bonuses = 0,
        allowances = { housing: 0, travel: 0, other: 0 },
        benefitsProvided = { health: false, retirement: false, insurance: false }
      } = req.body;
      
      if (!position || baseSalary === undefined || hourlyRate === undefined) {
        return res.status(StatusCodes.BAD_REQUEST).json({
          success: false,
          message: "Position, baseSalary, and hourlyRate are required fields"
        });
      }

      if (baseSalary < 0 || hourlyRate < 0 || bonuses < 0) {
        return res.status(StatusCodes.BAD_REQUEST).json({
          success: false,
          message: "Salary values cannot be negative"
        });
      }

      const existingPosition = await SalaryStructureService.getSalaryStructureByPosition(position);
      if (existingPosition) {
        return res.status(StatusCodes.BAD_REQUEST).json({
          success: false,
          message: "Salary structure for this position already exists"
        });
      }

      const newSalaryStructure = await SalaryStructureService.createSalaryStructure(
        position,
        baseSalary,
        hourlyRate,
        bonuses,
        allowances,
        benefitsProvided
      );

      res.status(StatusCodes.CREATED).json({ 
        success: true, 
        message: "Salary structure created successfully", 
        data: newSalaryStructure 
      });
    } catch (error) {
      console.error("Error creating Salary structure:", error);
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ 
        success: false,
        message: "Error creating Salary structure" 
      });
    }
  },

  /**
   * @desc    Update a Salary Structure
   * @route   PUT /api/salary-structures/:id
   * @access  Private/Admin
   */
  updateSalaryStructure: async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { 
        position, 
        baseSalary, 
        hourlyRate, 
        bonuses,
        allowances,
        benefitsProvided,
        isBlocked
      } = req.body;

      if (!id) {
        return res.status(StatusCodes.BAD_REQUEST).json({
          success: false,
          message: "Salary structure ID is required"
        });
      }

      const updateData: any = {};

      if (position) {
        const existingPosition = await SalaryStructureService.getSalaryStructureByPosition(position);
        if (existingPosition && existingPosition._id.toString() !== id) {
          return res.status(StatusCodes.BAD_REQUEST).json({
            success: false,
            message: "Salary structure for this position already exists"
          });
        }
        updateData.position = position;
      }
      if (baseSalary !== undefined) {
        if (baseSalary < 0) {
          return res.status(StatusCodes.BAD_REQUEST).json({
            success: false,
            message: "Base salary cannot be negative"
          });
        }
        updateData.baseSalary = baseSalary;
      }
      if (hourlyRate !== undefined) {
        if (hourlyRate < 0) {
          return res.status(StatusCodes.BAD_REQUEST).json({
            success: false,
            message: "Hourly rate cannot be negative"
          });
        }
        updateData.hourlyRate = hourlyRate;
      }
      if (bonuses !== undefined) {
        if (bonuses < 0) {
          return res.status(StatusCodes.BAD_REQUEST).json({
            success: false,
            message: "Bonuses cannot be negative"
          });
        }
        updateData.bonuses = bonuses;
      }
      if (allowances) {
        updateData.allowances = {};
        if (allowances.housing !== undefined) {
          if (allowances.housing < 0) {
            return res.status(StatusCodes.BAD_REQUEST).json({
              success: false,
              message: "Housing allowance cannot be negative"
            });
          }
          updateData.allowances.housing = allowances.housing;
        }
        if (allowances.travel !== undefined) {
          if (allowances.travel < 0) {
            return res.status(StatusCodes.BAD_REQUEST).json({
              success: false,
              message: "Travel allowance cannot be negative"
            });
          }
          updateData.allowances.travel = allowances.travel;
        }
        if (allowances.other !== undefined) {
          if (allowances.other < 0) {
            return res.status(StatusCodes.BAD_REQUEST).json({
              success: false,
              message: "Other allowance cannot be negative"
            });
          }
          updateData.allowances.other = allowances.other;
        }
      }
      if (benefitsProvided) {
        updateData.benefitsProvided = {};
        if (benefitsProvided.health !== undefined) {
          updateData.benefitsProvided.health = benefitsProvided.health;
        }
        if (benefitsProvided.retirement !== undefined) {
          updateData.benefitsProvided.retirement = benefitsProvided.retirement;
        }
        if (benefitsProvided.insurance !== undefined) {
          updateData.benefitsProvided.insurance = benefitsProvided.insurance;
        }
      }
      if (typeof isBlocked !== 'undefined') {
        updateData.isBlocked = isBlocked;
      }

      const updatedSalaryStructure = await SalaryStructureService.updateSalaryStructure(id, updateData);

      if (!updatedSalaryStructure) {
        return res.status(StatusCodes.NOT_FOUND).json({
          success: false,
          message: "Salary structure not found"
        });
      }

      res.status(StatusCodes.OK).json({ 
        success: true, 
        message: "Salary structure updated successfully", 
        data: updatedSalaryStructure 
      });
    } catch (error) {
      console.error("Error updating Salary structure:", error);
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ 
        success: false,
        message: "Error updating Salary structure" 
      });
    }
  },

  /**
   * @desc    Delete a Salary Structure
   * @route   DELETE /api/salary-structures/:id
   * @access  Private/Admin
   */
  deleteSalaryStructure: async (req: Request, res: Response) => {
    try {
      const { id } = req.params;

      if (!id) {
        return res.status(StatusCodes.BAD_REQUEST).json({
          success: false,
          message: "Salary structure ID is required"
        });
      }

      const deletedSalaryStructure = await SalaryStructureService.deleteSalaryStructure(id);

      if (!deletedSalaryStructure) {
        return res.status(StatusCodes.NOT_FOUND).json({
          success: false,
          message: "Salary structure not found"
        });
      }

      res.status(StatusCodes.OK).json({ 
        success: true, 
        message: "Salary structure deleted successfully", 
        data: deletedSalaryStructure 
      });
    } catch (error) {
      console.error("Error deleting Salary structure:", error);
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ 
        success: false,
        message: "Error deleting Salary structure" 
      });
    }
  },

  /**
   * @desc    Get all Salary Structures
   * @route   GET /api/salary-structures
   * @access  Public
   */
  getAllSalaryStructures: async (req: Request, res: Response) => {
    try {
      const { isBlocked } = req.query;
      
      const filter: { isBlocked?: boolean } = {};
      if (isBlocked !== undefined) {
        filter.isBlocked = isBlocked === 'true';
      }
      
      const salaryStructures = await SalaryStructureService.getAllSalaryStructures(filter);

      res.status(StatusCodes.OK).json({ 
        success: true, 
        count: salaryStructures.length,
        data: salaryStructures 
      });
    } catch (error) {
      console.error("Error getting Salary structures:", error);
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ 
        success: false,
        message: "Error getting Salary structures" 
      });
    }
  },

  /**
   * @desc    Get single Salary Structure by ID
   * @route   GET /api/salary-structures/:id
   * @access  Public
   */
  getSalaryStructureById: async (req: Request, res: Response) => {
    try {
      const { id } = req.params;

      if (!id) {
        return res.status(StatusCodes.BAD_REQUEST).json({
          success: false,
          message: "Salary structure ID is required"
        });
      }

      const salaryStructure = await SalaryStructureService.getSalaryStructureById(id);

      if (!salaryStructure) {
        return res.status(StatusCodes.NOT_FOUND).json({
          success: false,
          message: "Salary structure not found"
        });
      }

      res.status(StatusCodes.OK).json({ 
        success: true, 
        data: salaryStructure 
      });
    } catch (error) {
      console.error("Error getting Salary structure:", error);
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ 
        success: false,
        message: "Error getting Salary structure" 
      });
    }
  },

  /**
   * @desc    Get Salary Structure by Position
   * @route   GET /api/salary-structures/position/:position
   * @access  Public
   */
  getSalaryStructureByPosition: async (req: Request, res: Response) => {
    try {
      const { position } = req.params;

      if (!position) {
        return res.status(StatusCodes.BAD_REQUEST).json({
          success: false,
          message: "Position is required"
        });
      }

      const salaryStructure = await SalaryStructureService.getSalaryStructureByPosition(position);

      if (!salaryStructure) {
        return res.status(StatusCodes.NOT_FOUND).json({
          success: false,
          message: "Salary structure for this position not found"
        });
      }

      res.status(StatusCodes.OK).json({ 
        success: true, 
        data: salaryStructure 
      });
    } catch (error) {
      console.error("Error getting Salary structure by position:", error);
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ 
        success: false,
        message: "Error getting Salary structure by position" 
      });
    }
  },
};