import { Request, Response } from "express";
import { globalPayrollSettingsService } from "@/services/global-payroll-settings.service";
import { Types } from "mongoose";

export const globalPayrollSettingsController = {
  createGlobalPayrollSettings: async (req: Request, res: Response) => {
    try {
      const data = {
        ...req.body,
        createdBy: (req as any).user?._id || new Types.ObjectId(),
      };

      const globalSettings =
        await globalPayrollSettingsService.createGlobalPayrollSettings(data);

      res.status(201).json({
        success: true,
        data: globalSettings,
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to create global payroll settings",
      });
    }
  },

  getAllGlobalPayrollSettings: async (req: Request, res: Response) => {
    try {
      const globalSettings =
        await globalPayrollSettingsService.getAllGlobalPayrollSettings();

      res.json({
        success: true,
        data: globalSettings,
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to get global payroll settings",
      });
    }
  },

  getActiveGlobalPayrollSettings: async (req: Request, res: Response) => {
    try {
      const globalSettings =
        await globalPayrollSettingsService.getAllGlobalPayrollSettings();

      res.json({
        success: true,
        data: globalSettings,
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to get global payroll settings",
      });
    }
  },

  getGlobalPayrollSettingsById: async (req: Request, res: Response) => {
    try {
      const globalSettings =
        await globalPayrollSettingsService.getGlobalPayrollSettingsById(
          req.params.id
        );

      if (!globalSettings) {
        return res.status(404).json({
          success: false,
          error: "Global payroll settings not found",
        });
      }

      res.json({
        success: true,
        data: globalSettings,
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to get global payroll settings",
      });
    }
  },

  updateGlobalPayrollSettings: async (req: Request, res: Response) => {
    try {
      const data = {
        ...req.body,
        updatedBy: (req as any).user?._id || new Types.ObjectId(),
      };

      const globalSettings =
        await globalPayrollSettingsService.updateGlobalPayrollSettings(
          req.params.id,
          data
        );

      if (!globalSettings) {
        return res.status(404).json({
          success: false,
          error: "Global payroll settings not found",
        });
      }

      res.json({
        success: true,
        data: globalSettings,
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to update global payroll settings",
      });
    }
  },

  deleteGlobalPayrollSettings: async (req: Request, res: Response) => {
    try {
      const deleted =
        await globalPayrollSettingsService.deleteGlobalPayrollSettings(
          req.params.id
        );

      if (!deleted) {
        return res.status(404).json({
          success: false,
          error: "Global payroll settings not found",
        });
      }

      res.json({
        success: true,
        message: "Global payroll settings deleted successfully",
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to delete global payroll settings",
      });
    }
  },
};
