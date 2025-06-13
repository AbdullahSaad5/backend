import { Request, Response } from "express";
import { Shift } from "@/models/workshift.model";
import { StatusCodes } from "http-status-codes";
import { isValidObjectId, Types } from "mongoose";
import { IUser } from "@/contracts/user.contract";





// Define interface for the transformed shift
interface TransformedShift {
  _id: unknown;
  shiftName: string;
  shiftDescription: string;
  startTime: string;
  endTime: string;
  // ... include all other shift properties
  employees: {
    _id: unknown;
    firstName: string;
    lastName: string;
    email: string;
    isBlocked: boolean;
    role?: string; // Make optional if userType might be undefined
  }[];
  // ... include any other fields from shiftObj
  __v: number;
}


export const shiftController = {
  // Create a new shift
  createShift: async (req: Request, res: Response) => {
    try {
      const { shiftName, shiftDescription, startTime, endTime, mode, employees } = req.body;

      // Validate employee IDs
      const invalidEmployees = employees.filter((id: string) => !isValidObjectId(id));
      if (invalidEmployees.length > 0) {
        return res.status(StatusCodes.BAD_REQUEST).json({
          success: false,
          message: "Invalid employee IDs provided",
          invalidEmployees,
        });
      }

      const newShift = await Shift.create({
        shiftName,
        shiftDescription,
        startTime,
        endTime,
        mode,
        employees,
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

  // Get all shifts
  getAllShifts: async (req: Request, res: Response) => {
    try {
      const shifts = await Shift.find()
        .populate<{
          employees: (Omit<IUser, 'userType'> & {
            userType?: { role: string };
          })[];
        }>({
          path: 'employees',
          select: 'firstName lastName email isBlocked userType',
          populate: {
            path: 'userType',
            select: 'role',
            model: 'UserCategory'
          }
        })
        .sort({ createdAt: -1 });
  
      // Properly type the transformation
      const transformedShifts: TransformedShift[] = shifts.map((shift) => {
        const shiftObj = shift.toObject();
        return {
          ...shiftObj,
          employees: shiftObj.employees.map((employee) => ({
            _id: employee._id,
            firstName: employee.firstName,
            lastName: employee.lastName,
            email: employee.email,
            isBlocked: employee.isBlocked,
            role: employee.userType?.role
          }))
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

      const shift = await Shift.findById(id).populate(
        "employees",
        "firstName lastName email"
      );

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

  // Update shift
  updateShift: async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const updateData = req.body;

      if (!isValidObjectId(id)) {
        return res.status(StatusCodes.BAD_REQUEST).json({
          success: false,
          message: "Invalid shift ID",
        });
      }

      // Validate employee IDs if provided in update
      if (updateData.employees) {
        const invalidEmployees = updateData.employees.filter(
          (id: string) => !isValidObjectId(id)
        );
        if (invalidEmployees.length > 0) {
          return res.status(StatusCodes.BAD_REQUEST).json({
            success: false,
            message: "Invalid employee IDs provided",
            invalidEmployees,
          });
        }
      }

      const updatedShift = await Shift.findByIdAndUpdate(id, updateData, {
        new: true,
        runValidators: true,
      }).populate("employees", "firstName lastName email");

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
};