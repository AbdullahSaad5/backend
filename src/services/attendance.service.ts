import { IAttendance } from "@/contracts/attendance.contract";
import { Attendance } from "@/models/attendance.model";
import { Address, User } from "@/models";
import { Types } from "mongoose";
import { Location } from "@/models/location.model";
import { Shift } from "@/models/workshift.model";
import { LeaveRequest } from "@/models/leave-request.model";
import { Workmode } from "@/models/workmode.model";
export const attendanceService = {
  // Get employee punch-in details by employee ID
  getPunchInDetails: async (employeeId: string) => {
    try {
      // Find user by employee ID
      const user = await User.findOne({ employeeId })
        .populate({
          path: "userType",
          select: "role",
        })
        .select("firstName lastName employeeId profileImage");

      if (!user) {
        throw new Error("Employee not found");
      }

      // Get today's date at midnight
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // Get attendance for today if exists
      const attendance = await Attendance.findOne({
        employeeId: user._id,
        date: today,
      })
        .populate({
          path: "shiftId",
          select: "startTime endTime hasBreak breakStartTime breakEndTime",
        })
        .populate({
          path: "workModeId",
          select: "name description",
        });

      // Get assigned shift for the employee
      const shift = await Shift.findOne({
        employees: user._id,
        isBlocked: false,
      }).select("startTime endTime hasBreak breakStartTime breakEndTime");
      const mode = await Workmode.findOne({
        employees: user._id,
      }).select("modeName description");

      return {
        employee: {
          id: user._id,
          employeeId: user.employeeId,
          name: `${user.firstName} ${user.lastName || ""}`.trim(),
          role: (user.userType as any)?.role || null,
          profileImage: user.profileImage || null,
        },
        shift: shift || null,
        workMode: mode || null,
        attendance: attendance
          ? {
              id: attendance._id,
              date: attendance.date,
              checkIn: attendance.checkIn,
              checkOut: attendance.checkOut,
              status: attendance.status,
            }
          : null,
      };
    } catch (error: any) {
      throw new Error(`Failed to get punch-in details: ${error.message}`);
    }
  },
  // Employee self check-in
  checkIn: async (employeeId: string, shiftId: string, workModeId: string, checkIn: Date) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    // Removed isEmployee check as requested
    let attendance = await Attendance.findOne({ employeeId, date: today });
    if (!attendance) {
      attendance = await Attendance.create({
        employeeId,
        date: today,
        checkIn: checkIn,
        checkOut: undefined,
        shiftId,
        workModeId,
        status: "present",
      });
    } else {
      if (attendance.checkIn) {
        throw new Error("You have already checked in today.");
      }
      attendance.checkIn = new Date();
      attendance.status = "present";
      await attendance.save();
    }
    return attendance;
  },

  // Employee self check-out
  checkOut: async (employeeId: string) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    let attendance = await Attendance.findOne({ employeeId, date: today });
    if (!attendance || !attendance.checkIn) {
      throw new Error("No check-in found for today");
    }
    if (attendance.checkOut) {
      throw new Error("You have already checked out today.");
    }
    attendance.checkOut = new Date();
    await attendance.save();
    return attendance;
  },

  // Admin: mark attendance (present/absent/leave/late)
  adminMark: async (
    employeeId: string,
    date: Date,
    status: "present" | "absent" | "leave" | "late",
    shiftId?: string,
    workModeId?: string,
    checkIn?: Date,
    checkOut?: Date
  ) => {
    date.setHours(0, 0, 0, 0);
    let attendance = await Attendance.findOne({ employeeId, date });
    if (!attendance) {
      attendance = await Attendance.create({
        employeeId,
        date,
        checkIn,
        checkOut,
        shiftId,
        workModeId,
        status,
      });
    } else {
      attendance.status = status;
      if (shiftId) attendance.shiftId = shiftId as any;
      if (workModeId) attendance.workModeId = workModeId as any;
      if (checkIn) attendance.checkIn = checkIn;
      if (checkOut) attendance.checkOut = checkOut;
      await attendance.save();
    }
    return attendance;
  },

  // Admin: update attendance record
  updateAttendance: async (attendanceId: string, update: Partial<IAttendance>) => {
    const attendance = await Attendance.findByIdAndUpdate(attendanceId, update, { new: true });
    return attendance;
  },

  // Get attendance for employee (self or admin)
  getAttendance: async (employeeId: string, startDate?: Date, endDate?: Date, status?: string) => {
    const query: any = { employeeId };
    if (startDate && endDate) {
      query.date = { $gte: startDate, $lte: endDate };
    }
    if (status) {
      query.status = status.toLowerCase();
    }

    const attendance = await Attendance.find(query)
      .populate({
        path: "shiftId",
        select: "hasBreak breakStartTime breakEndTime",
      })
      .sort({ date: -1 });

    // Helper function to get leave request info
    const getLeaveInfo = async (record: any) => {
      const attendanceDate = new Date(record.date);
      const year = attendanceDate.getFullYear();
      const month = attendanceDate.getMonth();
      const day = attendanceDate.getDate();

      const startOfDay = new Date(year, month, day, 0, 0, 0);
      const endOfDay = new Date(year, month, day, 23, 59, 59, 999);

      const leaveRequest = await LeaveRequest.findOne({
        userId: record.employeeId,
        status: "approved",
        date: {
          $gte: startOfDay,
          $lte: endOfDay,
        },
      }).lean();

      console.log("Leave request found:", {
        employeeId: record.employeeId,
        date: attendanceDate,
        leaveRequest: leaveRequest,
      });

      return {
        ...record.toObject(),
        isPaid: leaveRequest?.isPaid || false,
      };
    };

    // If status is leave, only process leave records
    if (status === "leave") {
      const results = await Promise.all(attendance.map(async (record) => await getLeaveInfo(record)));
      return results;
    }

    // If no status filter, process all records but add isPaid for leave records
    const results = await Promise.all(
      attendance.map(async (record) => {
        if (record.status === "leave") {
          return await getLeaveInfo(record);
        }
        return record;
      })
    );
    return results;
  },

  // Admin: get all employees' attendance for a date
  getAllForDate: async (startDate?: Date, endDate?: Date) => {
    try {
      const query: any = {};
      if (startDate && endDate) {
        query.date = { $gte: startDate, $lte: endDate };
      }

      const attendance = await Attendance.find(query)
        .populate({
          path: "shiftId",
          select: "hasBreak breakStartTime breakEndTime",
        })
        .sort({ date: -1 });

      // Add leave payment information for records with leave status
      const results = await Promise.all(
        attendance.map(async (record) => {
          if (record.status === "leave") {
            // Convert both dates to local midnight for comparison
            const attendanceDate = new Date(record.date);
            // Get the local date parts
            const year = attendanceDate.getFullYear();
            const month = attendanceDate.getMonth();
            const day = attendanceDate.getDate();

            // Create start and end of the day in local time
            const startOfDay = new Date(year, month, day, 0, 0, 0);
            const endOfDay = new Date(year, month, day, 23, 59, 59, 999);

            const leaveRequest = await LeaveRequest.findOne({
              userId: record.employeeId,
              status: "approved",
              date: {
                $gte: startOfDay,
                $lte: endOfDay,
              },
            }).lean();

            console.log("Leave request found:", {
              employeeId: record.employeeId,
              date: attendanceDate,
              leaveRequest: leaveRequest,
            });

            return {
              ...record.toObject(),
              isPaid: leaveRequest?.isPaid || false,
            };
          }
          return record;
        })
      );
      return results;
    } catch (err: any) {
      throw new Error(err.message);
    }
  },

  haversineDistance: (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const toRad = (value: number) => (value * Math.PI) / 180;
    const R = 6371000; // Radius of Earth in meters
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  },

  // Admin: geo location attendance mark
  geoLocationAttendanceMark: async (userId: string, latitude: number, longitude: number) => {
    const address = await Address.findOne({ userId: userId });
    if (!address) {
      throw new Error("Address not found");
    }
    console.log("address.latitude : ", address);

    if (!address.latitude || !address.longitude || address.latitude === 0 || address.longitude === 0) {
      throw new Error("Latitude and longitude for employee not found in db");
    }
    console.log("address.latitude : ", address.latitude);
    console.log("address.longitude : ", address.longitude);
    console.log("latitude : ", latitude);
    console.log("longitude : ", longitude);

    const distance = attendanceService.haversineDistance(address.latitude, address.longitude, latitude, longitude);

    if (distance > 500) {
      throw new Error(`You are too far from the registered location. Distance: ${distance.toFixed(2)} meters.`);
    }

    // Mark attendance (check-in) if within 500m
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const employeeObjectId = new Types.ObjectId(userId);
    let attendance = await Attendance.findOne({
      employeeId: employeeObjectId,
      date: today,
    });
    if (!attendance) {
      attendance = await Attendance.create({
        employeeId: employeeObjectId,
        date: today,
        checkIn: new Date(),
        status: "present",
      });
    } else {
      if (attendance.checkIn) {
        throw new Error("You have already checked in today.");
      }
      attendance.checkIn = new Date();
      attendance.status = "present";
      await attendance.save();
    }
    return attendance;
  },

  // Get userId from employeeId
  getUserIdFromEmployeeId: async (employeeId: string) => {
    try {
      const user = await User.findOne({ employeeId });
      if (!user) {
        throw new Error("Employee not found");
      }
      return user._id;
    } catch (error: any) {
      throw new Error(`Failed to get user ID: ${error.message}`);
    }
  },

  punchInCheckIn: async (
    employeeId: string,
    date: Date,
    locationId: string,
    location?: { latitude: number; longitude: number }
  ) => {
    try {
      // Get userId from employeeId
      const userId = await attendanceService.getUserIdFromEmployeeId(employeeId);

      // Get location from locationId
      const locationData = await Location.findById(locationId);
      if (!locationData) {
        throw new Error("Location not found");
      }

      // Check if location is active
      if (!locationData.isActive) {
        throw new Error("This location is not active for attendance");
      }

      // Check if user exists and is active
      const user = await User.findById(userId);
      if (!user || user.isBlocked) {
        throw new Error("User is not active or has been blocked");
      }

      // Set date to midnight for consistent comparison
      const attendanceDate = new Date(date);
      attendanceDate.setHours(0, 0, 0, 0);

      let attendance = await Attendance.findOne({
        employeeId: userId,
        date: attendanceDate,
      });

      // Check if location coordinates are provided
      if (!location || !location.latitude || !location.longitude) {
        throw new Error("Current location coordinates are required");
      }

      // Calculate distance between provided location and office location
      const distance = attendanceService.haversineDistance(
        location.latitude,
        location.longitude,
        locationData.latitude,
        locationData.longitude
      );

      // Check if user is within allowed radius of the office location
      if (distance > locationData.radius) {
        throw new Error(
          `You are too far from the office location. Distance: ${distance.toFixed(2)} meters. Maximum allowed distance: ${locationData.radius} meters.`
        );
      }

      if (!attendance) {
        // Create new attendance record
        attendance = await Attendance.create({
          employeeId: userId,
          date: attendanceDate,
          checkIn: date,
          status: "present",
        });
      } else {
        if (attendance.checkIn) {
          throw new Error("You have already checked in today.");
        }
        attendance.checkIn = date;
        attendance.status = "present";
        await attendance.save();
      }

      return attendance;
    } catch (error: any) {
      throw new Error(error.message);
    }
  },
  punchInCheckout: async (
    employeeId: string,
    date: Date,
    locationId: string,
    location?: { latitude: number; longitude: number }
  ) => {
    try {
      // Get userId from employeeId
      const userId = await attendanceService.getUserIdFromEmployeeId(employeeId);

      // Get location from locationId
      const locationData = await Location.findById(locationId);
      if (!locationData) {
        throw new Error("Location not found");
      }

      // Check if location is active
      if (!locationData.isActive) {
        throw new Error("This location is not active for attendance");
      }

      // Check if user exists and is active
      const user = await User.findById(userId);
      if (!user || user.isBlocked) {
        throw new Error("User is not active or has been blocked");
      }

      // Set date to midnight for consistent comparison
      const attendanceDate = new Date(date);
      attendanceDate.setHours(0, 0, 0, 0);

      let attendance = await Attendance.findOne({
        employeeId: userId,
        date: attendanceDate,
      });

      // Check if location coordinates are provided
      if (!location || !location.latitude || !location.longitude) {
        throw new Error("Current location coordinates are required");
      }

      // Calculate distance between provided location and office location
      const distance = attendanceService.haversineDistance(
        location.latitude,
        location.longitude,
        locationData.latitude,
        locationData.longitude
      );

      // Check if user is within allowed radius of the office location
      if (distance > locationData.radius) {
        throw new Error(
          `You are too far from the office location. Distance: ${distance.toFixed(2)} meters. Maximum allowed distance: ${locationData.radius} meters.`
        );
      }

      if (!attendance) {
        throw new Error("No check-in record found for today.");
      }

      if (attendance.checkOut) {
        throw new Error("You have already checked out today.");
      }

      attendance.checkOut = date;
      await attendance.save();

      return attendance;
    } catch (error: any) {
      throw new Error(error.message);
    }
  },
};

/**
 * Cron: Mark employees absent if no check-in after shift end + grace period
 * Handles midnight/next-day edge cases: marks absent for the correct day (the day the shift ended),
 * even if the cron runs after midnight.
 */
export const markAbsentForUsers = async () => {
  const GRACE_MINUTES = 120;
  const now = new Date();
  const shifts = await Shift.find({ isBlocked: false }).populate("employees");
  for (const shift of shifts) {
    const [endHour, endMinute] = shift.endTime.split(":").map(Number);
    for (const employeeId of shift.employees) {
      // Try for both today and yesterday
      for (let offset = 0; offset <= 1; offset++) {
        const shiftDate = new Date(now);
        shiftDate.setDate(now.getDate() - offset);
        shiftDate.setHours(0, 0, 0, 0);
        const shiftEnd = new Date(shiftDate);
        shiftEnd.setHours(endHour, endMinute + GRACE_MINUTES, 0, 0);
        if (now >= shiftEnd) {
          const attendance = await Attendance.findOne({
            employeeId,
            date: shiftDate,
          });
          if (!attendance) {
            await Attendance.create({
              employeeId,
              date: shiftDate,
              status: "absent",
              shiftId: shift._id as Types.ObjectId,
            });
          } else if (
            attendance.status !== "present" &&
            attendance.status !== "leave" &&
            attendance.status !== "absent"
          ) {
            attendance.status = "absent";
            attendance.shiftId = shift._id as Types.ObjectId;
            await attendance.save();
          }
        }
      }
    }
  }
};

/**
 * Cron: Auto-checkout employees if checked in but not checked out after shift end + buffer
 * Handles midnight/next-day edge cases: auto-checkout for the correct day (the day the shift ended),
 * even if the cron runs after midnight.
 */
export const autoCheckoutForUsers = async () => {
  const BUFFER_MINUTES = 120;
  const now = new Date();
  const shifts = await Shift.find({ isBlocked: false }).populate("employees");
  for (const shift of shifts) {
    const [endHour, endMinute] = shift.endTime.split(":").map(Number);
    for (const employeeId of shift.employees) {
      for (let offset = 0; offset <= 1; offset++) {
        const shiftDate = new Date(now);
        shiftDate.setDate(now.getDate() - offset);
        shiftDate.setHours(0, 0, 0, 0);
        const shiftEnd = new Date(shiftDate);
        shiftEnd.setHours(endHour, endMinute + BUFFER_MINUTES, 0, 0);
        if (now >= shiftEnd) {
          const attendance = await Attendance.findOne({
            employeeId,
            date: shiftDate,
          });
          if (attendance && attendance.checkIn && !attendance.checkOut) {
            attendance.checkOut = shiftEnd;
            await attendance.save();
          }
        }
      }
    }
  }
};
