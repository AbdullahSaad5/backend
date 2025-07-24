import { Request, Response } from "express";
import { attendanceService } from "@/services/attendance.service";
import { Shift } from "@/models/workshift.model";
import { Workmode } from "@/models/workmode.model";
import { jwtVerify } from "@/utils/jwt.util";
import { Types } from "mongoose";
export const attendanceController = {
  checkIn: async (req: Request, res: Response) => {
    try {
      console.log("req.body : ", req.body);
      console.log("req.headers : ", req.headers);
      const token = req.headers.authorization?.split(" ")[1];
      const decoded = jwtVerify(token as string);
      const userId = decoded.id.toString();
      const userObjectId = Types.ObjectId.isValid(userId)
        ? new Types.ObjectId(userId)
        : userId;

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
      // Convert checkIn to Date object
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
  checkOut: async (req: Request, res: Response) => {
    try {
      const user = req.context?.user;
      if (!user || !user.id)
        return res.status(401).json({ message: "Unauthorized" });
      const attendance = await attendanceService.checkOut(user.id);
      res.status(200).json(attendance);
    } catch (err: any) {
      res.status(400).json({ message: err.message });
    }
  },

  // Employee: get own attendance history
  getOwnAttendance: async (req: Request, res: Response) => {
    try {
      const user = req.context?.user;
      if (!user || !user.id)
        return res.status(401).json({ message: "Unauthorized" });
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

  // Admin: mark attendance for any employee
  adminMark: async (req: Request, res: Response) => {
    try {
      const {
        employeeId,
        date,
        status,
        shiftId,
        workModeId,
        checkIn,
        checkOut,
      } = req.body;

      // Basic validation for required fields
      if (!employeeId || !date || !status) {
        return res.status(400).json({
          message:
            "Missing required fields: employeeId, date, and status are mandatory",
        });
      }

      // Specific validation based on status
      if (status === "present") {
        if (!checkIn || !checkOut) {
          return res.status(400).json({
            message:
              "Check-in and Check-out times are required for present status",
          });
        }
      }
      const attendance = await attendanceService.adminMark(
        employeeId,
        new Date(date),
        status,
        shiftId,
        workModeId,
        checkIn ? new Date(checkIn) : undefined,
        checkOut ? new Date(checkOut) : undefined
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
      const attendance = await attendanceService.updateAttendance(
        attendanceId,
        update
      );
      res.status(200).json(attendance);
    } catch (err: any) {
      res.status(400).json({ message: err.message });
    }
  },

  // Admin: get attendance for an employee
  getEmployeeAttendance: async (req: Request, res: Response) => {
    try {
      const { employeeId } = req.params;
      let { startDate, endDate } = req.query;
      // If both are missing, set defaults to last 30 days
      if (!startDate && !endDate) {
        const now = new Date();
        endDate = now.toISOString();
        startDate = new Date(
          now.getTime() - 30 * 24 * 60 * 60 * 1000
        ).toISOString();
      } else {
        // If provided, convert to Date
        startDate = startDate
          ? new Date(startDate as string).toISOString()
          : undefined;
        endDate = endDate
          ? new Date(endDate as string).toISOString()
          : undefined;
      }
      const attendance = await attendanceService.getAttendance(
        employeeId,
        startDate ? new Date(startDate as string) : undefined,
        endDate ? new Date(endDate as string) : undefined
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
  getGeoLocation: async (req: Request, res: Response) => {
    try {
      const token = req.headers.authorization?.split(" ")[1];
      const decoded = jwtVerify(token as string);
      const userId = decoded.id.toString();
      const { latitude, longitude } = req.body;
      if (!userId || !latitude || !longitude)
        return res.status(400).json({ message: "Missing required fields" });

      const attendance = await attendanceService.geoLocationAttendanceMark(
        userId,
        latitude,
        longitude
      );
      res.status(200).json(attendance);
    } catch (err: any) {
      res.status(400).json({ message: err.message });
    }
  },
};
