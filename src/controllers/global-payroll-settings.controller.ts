import { Request, Response } from "express";
import { globalPayrollSettingsService } from "@/services/global-payroll-settings.service";

export const globalPayrollSettingsController = {
  createGlobalPayrollSettings: async (req: Request, res: Response) => {
    try {
      const globalSettings =
        await globalPayrollSettingsService.createGlobalPayrollSettings(
          req.body
        );

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
      const globalSettings =
        await globalPayrollSettingsService.updateGlobalPayrollSettings(
          req.params.id,
          req.body
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
