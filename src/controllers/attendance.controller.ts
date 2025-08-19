import { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import { attendanceService } from "@/services/attendance.service";
import { Shift } from "@/models/workshift.model";
import { Workmode } from "@/models/workmode.model";
import { LeaveRequest } from "@/models/leave-request.model";
import { Types } from "mongoose";
import { IContextRequest, IUserRequest } from "@/contracts/request.contract";
export const attendanceController = {
  checkIn: async (req: IContextRequest<IUserRequest>, res: Response) => {
    try {
      const userId = req.context?.user?.id;
      const userObjectId = Types.ObjectId.isValid(userId) ? new Types.ObjectId(userId) : userId;

      const shift = await Shift.findOne({
        employees: { $in: [userObjectId] },
      });
      if (!shift) {
        return res.status(400).json({ message: "No shift found for user" });
      }
      const workMode = await Workmode.findOne({
        employees: { $in: [userObjectId] },
      });
      if (!workMode) {
        return res.status(400).json({ message: "No work mode found for user" });
      }
      if (!userId) return res.status(401).json({ message: "Unauthorized" });
      const { checkIn } = req.body;
      if (!checkIn) {
        return res.status(400).json({ message: "Check-in time is required" });
      }
      // Convert checkIn to Date object with proper handling
      const checkInDate = new Date(checkIn);
      const attendance = await attendanceService.checkIn(
        userId,
        shift._id as string,
        workMode._id as string,
        checkInDate
      );
      res.status(200).json(attendance);
    } catch (err: any) {
      res.status(400).json({ message: err.message });
    }
  },

  // Employee self check-out
  checkOut: async (req: IContextRequest<IUserRequest>, res: Response) => {
    try {
      const user = req.context?.user;
      if (!user || !user.id) return res.status(401).json({ message: "Unauthorized" });
      const attendance = await attendanceService.checkOut(user.id as string);
      res.status(200).json(attendance);
    } catch (err: any) {
      res.status(400).json({ message: err.message });
    }
  },

  // Employee: get own attendance history
  getOwnAttendance: async (req: Request, res: Response) => {
    try {
      const user = req.context?.user;
      if (!user || !user.id) return res.status(401).json({ message: "Unauthorized" });
      const { startDate, endDate } = req.query;
      const attendance = await attendanceService.getAttendance(
        user.id,
        startDate ? new Date(startDate as string) : undefined,
        endDate ? new Date(endDate as string) : undefined
      );
      res.status(200).json(attendance);
    } catch (err: any) {
      res.status(400).json({ message: err.message });
    }
  },

  adminMark: async (req: Request, res: Response) => {
    try {
      const { employeeId, date, status, shiftId, workModeId, checkIn, checkOut, isPaid } = req.body;

      // Basic validation for required fields
      if (!employeeId || !date || !status) {
        return res.status(400).json({
          message: "Missing required fields: employeeId, date, and status are mandatory",
        });
      }

      // Specific validation based on status
      if (status === "present") {
        if (!checkIn || !checkOut) {
          return res.status(400).json({
            message: "Check-in and Check-out times are required for present status",
          });
        }
      }

      // For leave status, handle leave request creation
      if (status === "leave") {
        try {
          // Create or update leave request
          await LeaveRequest.findOneAndUpdate(
            {
              userId: employeeId,
              date: new Date(date),
            },
            {
              userId: employeeId,
              date: new Date(date),
              reason: "Admin marked leave",
              leaveType: "normal",
              isPaid: isPaid || false,
              status: "approved",
            },
            { upsert: true, new: true }
          );
        } catch (error) {
          console.error("Error creating/updating leave request:", error);
          return res.status(500).json({
            message: "Failed to process leave request",
          });
        }
      }

      // Convert checkIn and checkOut to proper Date objects
      // Ensure we're working with UTC dates to avoid timezone issues
      const checkInDate = checkIn ? new Date(checkIn) : undefined;
      const checkOutDate = checkOut ? new Date(checkOut) : undefined;

      // Create a new date object to avoid any potential mutation issues
      const attendanceDate = new Date(date);

      const attendance = await attendanceService.adminMark(
        employeeId,
        attendanceDate,
        status,
        shiftId,
        workModeId,
        checkInDate,
        checkOutDate
      );
      res.status(200).json(attendance);
    } catch (err: any) {
      res.status(400).json({ message: err.message });
    }
  },

  // Admin: update attendance record
  updateAttendance: async (req: Request, res: Response) => {
    try {
      const { attendanceId } = req.params;
      const update = req.body;

      // If status is leave or absent, remove check-in and check-out times
      if (update.status && (update.status === "leave" || update.status === "absent")) {
        update.checkIn = null;
        update.checkOut = null;
      }

      const attendance = await attendanceService.updateAttendance(attendanceId, update);
      res.status(200).json(attendance);
    } catch (err: any) {
      res.status(400).json({ message: err.message });
    }
  },

  // Admin: get attendance for an employee
  getEmployeeAttendance: async (req: Request, res: Response) => {
    try {
      const { employeeId } = req.params;
      let { startDate, endDate, status } = req.query;
      // If both are missing, set defaults to last 30 days
      if (!startDate && !endDate) {
        const now = new Date();
        endDate = now.toISOString();
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
      } else {
        // If provided, convert to Date
        startDate = startDate ? new Date(startDate as string).toISOString() : undefined;
        endDate = endDate ? new Date(endDate as string).toISOString() : undefined;
      }
      const lowercaseStatus = status ? (status as string).toLowerCase() : undefined;

      // Get attendance with populated shift data and leave request info
      const attendance = await attendanceService.getAttendance(
        employeeId,
        startDate ? new Date(startDate as string) : undefined,
        endDate ? new Date(endDate as string) : undefined,
        lowercaseStatus // Pass the status to get isPaid info for leave records
      );

      res.status(200).json(attendance);
    } catch (err: any) {
      res.status(400).json({ message: err.message });
    }
  },

  // Admin: get all employees' attendance for a date
  getAllForDate: async (req: Request, res: Response) => {
    const { startDate, endDate } = req.query;

    try {
      const attendance = await attendanceService.getAllForDate(
        startDate ? new Date(startDate as string) : undefined,
        endDate ? new Date(endDate as string) : undefined
      );
      res.status(200).json(attendance);
    } catch (err: any) {
      res.status(400).json({ message: err.message });
    }
  },

  // Admin: get geo location
  getGeoLocation: async (req: IContextRequest<IUserRequest>, res: Response) => {
    try {
      const userId = req.context?.user?.id;
      const { latitude, longitude } = req.body;
      if (!userId || !latitude || !longitude) return res.status(400).json({ message: "Missing required fields" });

      const attendance = await attendanceService.geoLocationAttendanceMark(userId, latitude, longitude);
      res.status(200).json(attendance);
    } catch (err: any) {
      res.status(400).json({ message: err.message });
    }
  },
  punchIn: async (req: Request, res: Response) => {
    try {
      const { employeeId } = req.params;

      if (!employeeId) {
        return res.status(StatusCodes.BAD_REQUEST).json({
          success: false,
          message: "Employee ID is required",
        });
      }

      const employeeDetails = await attendanceService.getPunchInDetails(employeeId);

      res.status(StatusCodes.OK).json({
        success: true,
        data: employeeDetails,
      });
    } catch (err: any) {
      res.status(StatusCodes.BAD_REQUEST).json({
        success: false,
        message: err.message,
      });
    }
  },
  punchInCheckIn: async (req: Request, res: Response) => {
    try {
      const { employeeId } = req.params;
      const { date, locationId, location } = req.body;

      if (!employeeId) {
        return res.status(StatusCodes.BAD_REQUEST).json({
          success: false,
          message: "Employee ID is required",
        });
      }

      if (!date) {
        return res.status(StatusCodes.BAD_REQUEST).json({
          success: false,
          message: "Date is required",
        });
      }

      if (!locationId || !Types.ObjectId.isValid(locationId)) {
        return res.status(StatusCodes.BAD_REQUEST).json({
          success: false,
          message: "Location ID is required",
        });
      }

      // Parse date and validate
      const parsedDate = new Date(date);
      if (isNaN(parsedDate.getTime())) {
        return res.status(StatusCodes.BAD_REQUEST).json({
          success: false,
          message: "Invalid date format",
        });
      }

      // Validate location if provided
      if (location) {
        const { latitude, longitude } = location;
        if (typeof latitude !== "number" || typeof longitude !== "number") {
          return res.status(StatusCodes.BAD_REQUEST).json({
            success: false,
            message: "Invalid location format. Latitude and longitude must be numbers",
          });
        }
      }

      const attendance = await attendanceService.punchInCheckIn(employeeId, parsedDate, locationId, location);

      res.status(StatusCodes.OK).json({
        success: true,
        data: attendance,
      });
    } catch (err: any) {
      res.status(StatusCodes.BAD_REQUEST).json({
        success: false,
        message: err.message,
      });
    }
  },
  punchInCheckout: async (req: Request, res: Response) => {
    try {
      const { employeeId } = req.params;
      const { date, locationId, location } = req.body;

      if (!employeeId) {
        return res.status(StatusCodes.BAD_REQUEST).json({
          success: false,
          message: "Employee ID is required",
        });
      }

      if (!date) {
        return res.status(StatusCodes.BAD_REQUEST).json({
          success: false,
          message: "Date is required",
        });
      }

      if (!locationId || !Types.ObjectId.isValid(locationId)) {
        return res.status(StatusCodes.BAD_REQUEST).json({
          success: false,
          message: "Location ID is required",
        });
      }

      // Parse date and validate
      const parsedDate = new Date(date);
      if (isNaN(parsedDate.getTime())) {
        return res.status(StatusCodes.BAD_REQUEST).json({
          success: false,
          message: "Invalid date format",
        });
      }

      // Validate location if provided
      if (location) {
        const { latitude, longitude } = location;
        if (typeof latitude !== "number" || typeof longitude !== "number") {
          return res.status(StatusCodes.BAD_REQUEST).json({
            success: false,
            message: "Invalid location format. Latitude and longitude must be numbers",
          });
        }
      }

      const attendance = await attendanceService.punchInCheckout(employeeId, parsedDate, locationId, location);

      res.status(StatusCodes.OK).json({
        success: true,
        data: attendance,
      });
    } catch (err: any) {
      res.status(StatusCodes.BAD_REQUEST).json({
        success: false,
        message: err.message,
      });
    }
  },
};
