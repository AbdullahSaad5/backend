import { Request, Response } from "express";
import { workmodeService } from "@/services/workmode.service";
import { StatusCodes } from "http-status-codes";
import { isValidObjectId } from "mongoose";
import { Shift } from "@/models/workshift.model";
import { Workmode } from "@/models/workmode.model";

// Remove user from all workmodes and workshifts
async function removeUserFromAllModesAndShifts(userId: string) {
  await Workmode.updateMany(
    { employees: userId },
    { $pull: { employees: userId } }
  );
  await Shift.updateMany(
    { employees: userId },
    { $pull: { employees: userId } }
  );
}

export const workmodeController = {
  async createWorkmode(req: Request, res: Response) {
    try {
      const { modeName, description, employees } = req.body;
      if (!modeName) {
        return res.status(StatusCodes.BAD_REQUEST).json({
          success: false,
          message: "modeName is required",
        });
      }
      if (employees && employees.some((id: string) => !isValidObjectId(id))) {
        return res.status(StatusCodes.BAD_REQUEST).json({
          success: false,
          message: "Invalid employee IDs provided",
        });
      }
      if (employees && Array.isArray(employees)) {
        for (const userId of employees) {
          await removeUserFromAllModesAndShifts(userId);
        }
      }
      const newWorkmode = await workmodeService.createWorkmode({
        modeName,
        description,
        employees,
      });
      const populated = await workmodeService.getWorkmodeById(
        newWorkmode._id as string
      );
      return res.status(StatusCodes.CREATED).json({
        success: true,
        message: "Workmode created successfully",
        data: populated,
      });
    } catch (error: any) {
      return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: "Error creating workmode",
        error: error.message,
      });
    }
  },

  async getAllWorkmodes(req: Request, res: Response) {
    try {
      const workmodes = await workmodeService.getAllWorkmodes();
      return res.status(StatusCodes.OK).json({
        success: true,
        count: workmodes.length,
        data: workmodes,
      });
    } catch (error: any) {
      return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: "Error fetching workmodes",
        error: error.message,
      });
    }
  },

  async getWorkmodeById(req: Request, res: Response) {
    try {
      const { id } = req.params;
      if (!isValidObjectId(id)) {
        return res.status(StatusCodes.BAD_REQUEST).json({
          success: false,
          message: "Invalid workmode ID",
        });
      }
      const workmode = await workmodeService.getWorkmodeById(id);
      if (!workmode) {
        return res.status(StatusCodes.NOT_FOUND).json({
          success: false,
          message: "Workmode not found",
        });
      }
      return res.status(StatusCodes.OK).json({
        success: true,
        data: workmode,
      });
    } catch (error: any) {
      return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: "Error fetching workmode",
        error: error.message,
      });
    }
  },

  async addEmployeesToWorkmode(req: Request, res: Response) {
    const workmode = await Workmode.findById(req.params.id);
    if (!workmode) {
      return res.status(StatusCodes.NOT_FOUND).json({
        success: false,
        message: "Workmode not found",
      });
    }
    const { employees } = req.body;
    if (!employees || !Array.isArray(employees)) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        success: false,
        message: "Employees array is required",
      });
    }
    workmode.employees = employees;
    await workmode.save();
    return res.status(StatusCodes.OK).json({
      success: true,
      message: "Employees updated successfully",
      data: workmode,
    });
  },

  async updateWorkmode(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const updateData = req.body;
      if (!isValidObjectId(id)) {
        return res.status(StatusCodes.BAD_REQUEST).json({
          success: false,
          message: "Invalid workmode ID",
        });
      }
      if (updateData.employees && Array.isArray(updateData.employees)) {
        for (const userId of updateData.employees) {
          await removeUserFromAllModesAndShifts(userId);
        }
      }
      if (
        updateData.employees &&
        updateData.employees.some((eid: string) => !isValidObjectId(eid))
      ) {
        return res.status(StatusCodes.BAD_REQUEST).json({
          success: false,
          message: "Invalid employee IDs provided",
        });
      }
      const updated = await workmodeService.updateWorkmode(id, updateData);
      if (!updated) {
        return res.status(StatusCodes.NOT_FOUND).json({
          success: false,
          message: "Workmode not found",
        });
      }
      return res.status(StatusCodes.OK).json({
        success: true,
        message: "Workmode updated successfully",
        data: updated,
      });
    } catch (error: any) {
      return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: "Error updating workmode",
        error: error.message,
      });
    }
  },

  async patchWorkmode(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { employees } = req.body;

      if (!isValidObjectId(id)) {
        return res.status(StatusCodes.BAD_REQUEST).json({
          success: false,
          message: "Invalid workmode ID",
        });
      }

      if (!employees || !Array.isArray(employees)) {
        return res.status(StatusCodes.BAD_REQUEST).json({
          success: false,
          message: "Employees array is required",
        });
      }

      if (employees.some((id) => !isValidObjectId(id))) {
        return res.status(StatusCodes.BAD_REQUEST).json({
          success: false,
          message: "Invalid employee IDs provided",
        });
      }

      const updated = await workmodeService.patchWorkmode(id, employees);

      if (!updated) {
        return res.status(StatusCodes.NOT_FOUND).json({
          success: false,
          message: "Workmode not found",
        });
      }

      return res.status(StatusCodes.OK).json({
        success: true,
        message: "Workmode updated successfully",
        data: updated,
      });
    } catch (error: any) {
      return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: "Error updating workmode",
        error: error.message,
      });
    }
  },

  async deleteWorkmode(req: Request, res: Response) {
    try {
      const { id } = req.params;
      if (!isValidObjectId(id)) {
        return res.status(StatusCodes.BAD_REQUEST).json({
          success: false,
          message: "Invalid workmode ID",
        });
      }
      const deleted = await workmodeService.deleteWorkmode(id);
      if (!deleted) {
        return res.status(StatusCodes.NOT_FOUND).json({
          success: false,
          message: "Workmode not found",
        });
      }
      return res.status(StatusCodes.OK).json({
        success: true,
        message: "Workmode deleted successfully",
      });
    } catch (error: any) {
      return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: "Error deleting workmode",
        error: error.message,
      });
    }
  },
};
