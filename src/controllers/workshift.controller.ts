import { Request, Response } from "express";
import { Shift } from "@/models/workshift.model";
import { StatusCodes } from "http-status-codes";
import { isValidObjectId } from "mongoose";

export const shiftController = {
  createShift: async (req: Request, res: Response) => {
    try {
      const { shiftName, shiftDescription, startTime, endTime, employees } = req.body;

      // Validate employee IDs if employees is provided
      if (employees) {
        const invalidEmployees = employees.filter((id: string) => !isValidObjectId(id));
        if (invalidEmployees.length > 0) {
          return res.status(StatusCodes.BAD_REQUEST).json({
            success: false,
            message: "Invalid employee IDs provided",
            invalidEmployees,
          });
        }
      }

      const newShift = await Shift.create({
        shiftName,
        shiftDescription,
        startTime,
        endTime,
        ...(employees && { employees }), // Only add employees if provided
      });

      // Populate employee details in the response
      const populatedShift = await Shift.findById(newShift._id)
        .populate("employees", "firstName lastName email userType")
        .lean();

      res.status(StatusCodes.CREATED).json({
        success: true,
        message: "Shift created successfully",
        data: populatedShift,
      });
    } catch (error: any) {
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: "Failed to create shift",
        error: error.message,
      });
    }
  },

  assignShift: async (req: Request, res: Response) => {
    try {
      const { shiftId, userIds } = req.body;

      const shift = await Shift.findById(shiftId);

      if (!shift) {
        return res.status(StatusCodes.NOT_FOUND).json({
          success: false,
          message: "Shift not found",
        });
      }

      // check for array of employeeIds
      if (!Array.isArray(userIds)) {
        return res.status(StatusCodes.BAD_REQUEST).json({
          success: false,
          message: "Employee IDs must be an array",
        });
      }
      shift.employees = userIds;
      await shift.save();

      res.status(StatusCodes.OK).json({
        success: true,
        message: "Shift assigned successfully",
        data: shift,
      });
    } catch (error: any) {
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: "Failed to assign shift",
        error: error.message,
      });
    }
  },

  // Get all shifts
  getAllShifts: async (req: Request, res: Response) => {
    try {
      const shifts = await Shift.find()
        .populate({
          path: "employees",
          select: "firstName lastName email isBlocked userType",
          populate: {
            path: "userType",
            select: "role",
            model: "UserCategory",
          },
        })
        .sort({ createdAt: -1 });

      const transformedShifts = shifts.map((shift: any) => {
        const shiftObj = shift.toObject();
        return {
          ...shiftObj,
          employees: (shiftObj.employees || []).map((employee: any) => ({
            _id: employee._id,
            firstName: employee.firstName,
            lastName: employee.lastName,
            email: employee.email,
            isBlocked: employee.isBlocked,
            role: employee.userType?.role,
          })),
        };
      });

      res.status(StatusCodes.OK).json({
        success: true,
        count: transformedShifts.length,
        data: transformedShifts,
      });
    } catch (error: any) {
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: "Failed to fetch shifts",
        error: error.message,
      });
    }
  },

  // Get shift by ID
  getShiftById: async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      if (!isValidObjectId(id)) {
        return res.status(StatusCodes.BAD_REQUEST).json({
          success: false,
          message: "Invalid shift ID",
        });
      }

      const shift = await Shift.findById(id).populate("employees", "firstName lastName email");

      if (!shift) {
        return res.status(StatusCodes.NOT_FOUND).json({
          success: false,
          message: "Shift not found",
        });
      }

      res.status(StatusCodes.OK).json({
        success: true,
        data: shift,
      });
    } catch (error: any) {
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: "Failed to fetch shift",
        error: error.message,
      });
    }
  },

  updateShift: async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { shiftName, shiftDescription, startTime, endTime } = req.body;

      if (!isValidObjectId(id)) {
        return res.status(StatusCodes.BAD_REQUEST).json({
          success: false,
          message: "Invalid shift ID",
        });
      }

      const updatedShift = await Shift.findByIdAndUpdate(
        id,
        {
          shiftName,
          shiftDescription,
          startTime,
          endTime,
        },
        {
          new: true,
          runValidators: true,
        }
      );

      if (!updatedShift) {
        return res.status(StatusCodes.NOT_FOUND).json({
          success: false,
          message: "Shift not found",
        });
      }

      res.status(StatusCodes.OK).json({
        success: true,
        message: "Shift updated successfully",
        data: updatedShift,
      });
    } catch (error: any) {
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: "Failed to update shift",
        error: error.message,
      });
    }
  },

  // Delete shift
  deleteShift: async (req: Request, res: Response) => {
    try {
      const { id } = req.params;

      if (!isValidObjectId(id)) {
        return res.status(StatusCodes.BAD_REQUEST).json({
          success: false,
          message: "Invalid shift ID",
        });
      }

      const deletedShift = await Shift.findByIdAndDelete(id);

      if (!deletedShift) {
        return res.status(StatusCodes.NOT_FOUND).json({
          success: false,
          message: "Shift not found",
        });
      }

      res.status(StatusCodes.OK).json({
        success: true,
        message: "Shift deleted successfully",
      });
    } catch (error: any) {
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: "Failed to delete shift",
        error: error.message,
      });
    }
  },

  // Get shifts for a specific employee
  getShiftsByEmployee: async (req: Request, res: Response) => {
    try {
      const { employeeId } = req.params;

      if (!isValidObjectId(employeeId)) {
        return res.status(StatusCodes.BAD_REQUEST).json({
          success: false,
          message: "Invalid employee ID",
        });
      }

      const shifts = await Shift.find({ employees: employeeId })
        .sort({ startTime: 1 })
        .populate("employees", "firstName lastName");

      res.status(StatusCodes.OK).json({
        success: true,
        count: shifts.length,
        data: shifts,
      });
    } catch (error: any) {
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: "Failed to fetch employee shifts",
        error: error.message,
      });
    }
  },
  // Unassign an employee from a shift
  unassignEmployee: async (req: Request, res: Response) => {
    try {
      const { shiftId, employeeId } = req.params;

      if (!isValidObjectId(shiftId) || !isValidObjectId(employeeId)) {
        return res.status(StatusCodes.BAD_REQUEST).json({
          success: false,
          message: "Invalid shift ID or employee ID",
        });
      }

      const shift = await Shift.findById(shiftId);
      if (!shift) {
        return res.status(StatusCodes.NOT_FOUND).json({
          success: false,
          message: "Shift not found",
        });
      }

      // Remove employee from shift
      shift.employees = shift.employees.filter((empId: any) => empId.toString() !== employeeId);
      await shift.save();

      res.status(StatusCodes.OK).json({
        success: true,
        message: "Employee unassigned from shift successfully",
        data: shift,
      });
    } catch (error: any) {
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: "Failed to unassign employee from shift",
        error: error.message,
      });
    }
  },
};
