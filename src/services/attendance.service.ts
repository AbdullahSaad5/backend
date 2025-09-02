import { IAttendance } from "@/contracts/attendance.contract";
import { Attendance } from "@/models/attendance.model";
import { Address, User } from "@/models";
import { Types } from "mongoose";
import { Location } from "@/models/location.model";
import { Shift } from "@/models/workshift.model";
import { LeaveRequest } from "@/models/leave-request.model";
import { Workmode } from "@/models/workmode.model";
// Helper function to calculate overtime for a record
function calculateOvertime(record: any) {
  try {
    if (record.status !== "present" || !record.checkIn || !record.checkOut || !record.shiftId) {
      return {
        ...record,
        overtimeMinutes: 0,
        earlyMinutes: 0,
        lateMinutes: 0,
        normalHoursMinutes: 0,
      };
    }

    const shift = record.shiftId as any;
    if (!shift || !shift.startTime || !shift.endTime) {
      return {
        ...record,
        overtimeMinutes: 0,
        earlyMinutes: 0,
        lateMinutes: 0,
        normalHoursMinutes: 0,
      };
    }

    // Parse shift times
    const [startHour, startMinute] = shift.startTime.split(":").map(Number);
    const [endHour, endMinute] = shift.endTime.split(":").map(Number);

    // Create Date objects for shift start and end times
    const shiftDate = new Date(record.date);
    const shiftStartTime = new Date(shiftDate);
    shiftStartTime.setHours(startHour, startMinute, 0, 0);

    const shiftEndTime = new Date(shiftDate);
    shiftEndTime.setHours(endHour, endMinute, 0, 0);

    // Handle cases where end time is on the next day
    if (endHour < startHour || (endHour === startHour && endMinute < startMinute)) {
      shiftEndTime.setDate(shiftEndTime.getDate() + 1);
    }

    // Calculate shift duration in minutes
    const shiftDurationMinutes = Math.floor((shiftEndTime.getTime() - shiftStartTime.getTime()) / (1000 * 60));

    // Get break time in minutes
    let breakMinutes = 0;
    if (shift.hasBreak && shift.breakStartTime && shift.breakEndTime) {
      const [breakStartHour, breakStartMinute] = shift.breakStartTime.split(":").map(Number);
      const [breakEndHour, breakEndMinute] = shift.breakEndTime.split(":").map(Number);

      const breakStartTime = new Date(shiftDate);
      breakStartTime.setHours(breakStartHour, breakStartMinute, 0, 0);

      const breakEndTime = new Date(shiftDate);
      breakEndTime.setHours(breakEndHour, breakEndMinute, 0, 0);

      // Handle cases where break end time is on the next day
      if (breakEndHour < breakStartHour || (breakEndHour === breakStartHour && breakEndMinute < breakStartMinute)) {
        breakEndTime.setDate(breakEndTime.getDate() + 1);
      }

      breakMinutes = Math.floor((breakEndTime.getTime() - breakStartTime.getTime()) / (1000 * 60));
    }

    // Calculate early check-in minutes (limited to 1 hour before shift)
    let earlyMinutes = 0;
    const oneHourBeforeShift = new Date(shiftStartTime);
    oneHourBeforeShift.setHours(oneHourBeforeShift.getHours() - 1);

    if (record.checkIn < shiftStartTime && record.checkIn >= oneHourBeforeShift) {
      earlyMinutes = Math.floor((shiftStartTime.getTime() - record.checkIn.getTime()) / (1000 * 60));
    }

    // Calculate late check-in minutes
    let lateMinutes = 0;
    if (record.checkIn > shiftStartTime) {
      lateMinutes = Math.floor((record.checkIn.getTime() - shiftStartTime.getTime()) / (1000 * 60));
    }

    // Calculate late check-out minutes
    let lateCheckoutMinutes = 0;
    if (record.checkOut > shiftEndTime) {
      lateCheckoutMinutes = Math.floor((record.checkOut.getTime() - shiftEndTime.getTime()) / (1000 * 60));
    }

    // Calculate actual worked minutes (excluding breaks if applicable)
    const totalWorkedMinutes = Math.floor((record.checkOut.getTime() - record.checkIn.getTime()) / (1000 * 60));

    // Adjust normal working hours by removing break time
    const adjustedShiftDuration = shiftDurationMinutes - breakMinutes;

    // Calculate overtime minutes based on the rules
    let overtimeMinutes = 0;
    let normalHoursMinutes = 0;

    if (lateMinutes > 0) {
      // For late check-ins, first calculate actual time worked
      normalHoursMinutes = Math.min(totalWorkedMinutes, adjustedShiftDuration);

      // Employee must first complete their normal hours
      // Normal hours are the full shift duration (they need to make up for being late)
      const requiredWorkMinutes = adjustedShiftDuration + lateMinutes;

      if (totalWorkedMinutes > requiredWorkMinutes) {
        // If they worked more than required (shift + late time), the rest is overtime
        overtimeMinutes = totalWorkedMinutes - requiredWorkMinutes;
      } else {
        // They didn't work enough extra time to qualify for overtime
        overtimeMinutes = 0;
      }
    } else {
      // For on-time or early check-ins
      normalHoursMinutes = adjustedShiftDuration;

      // For early check-ins, count early time as overtime
      // For all employees, count time after shift end as overtime
      overtimeMinutes = earlyMinutes + lateCheckoutMinutes;
    }

    // Only count overtime if it's at least 25 minutes
    const finalOvertimeMinutes = overtimeMinutes >= 25 ? overtimeMinutes : 0;

    return {
      ...record,
      overtimeMinutes: finalOvertimeMinutes,
      earlyMinutes,
      lateMinutes,
      normalHoursMinutes,
      shiftDurationMinutes,
      breakMinutes,
      totalWorkedMinutes,
    };
  } catch (error) {
    console.error("Error calculating overtime:", error);
    return {
      ...record,
      overtimeMinutes: 0,
      earlyMinutes: 0,
      lateMinutes: 0,
      normalHoursMinutes: 0,
      error: "Failed to calculate overtime",
    };
  }
}

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
    return attendance.toJSON(); // Convert to plain object
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
    return attendance.toJSON(); // Convert to plain object
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

    // For absent and leave status, clear check-in and check-out times
    if (status === "absent" || status === "leave") {
      checkIn = undefined;
      checkOut = undefined;
    }

    let attendance = await Attendance.findOne({ employeeId, date });
    if (!attendance) {
      attendance = await Attendance.create({
        employeeId,
        date,
        checkIn: checkIn || undefined,
        checkOut: checkOut || undefined,
        shiftId,
        workModeId,
        status,
      });
    } else {
      attendance.status = status;
      if (shiftId) attendance.shiftId = shiftId as any;
      if (workModeId) attendance.workModeId = workModeId as any;

      // Handle check-in and check-out based on status
      if (status === "absent" || status === "leave") {
        // Clear check-in and check-out for absent/leave
        attendance.checkIn = undefined;
        attendance.checkOut = undefined;
      } else {
        // Only set check-in/check-out if provided for present/late status
        if (checkIn !== undefined) attendance.checkIn = checkIn;
        if (checkOut !== undefined) attendance.checkOut = checkOut;
      }

      await attendance.save();
    }
    return attendance.toJSON(); // Convert to plain object
  },

  // Admin: update attendance record
  updateAttendance: async (attendanceId: string, update: Partial<IAttendance>) => {
    const attendance = await Attendance.findByIdAndUpdate(attendanceId, update, { new: true }).lean(); // Add .lean() to return plain object
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
      .sort({ date: -1 })
      .lean(); // Add .lean() to get plain objects instead of Mongoose documents

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
        ...record,
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
  // Option 1: Aggregation Pipeline (Recommended - Single Database Query)
  getAllForDate: async (startDate?: Date, endDate?: Date) => {
    try {
      console.time("getAllForDate");
      const query: any = {};
      if (startDate && endDate) {
        const start = new Date(startDate);
        const end = new Date(endDate);
        start.setHours(0, 0, 0, 0);
        end.setHours(23, 59, 59, 999);
        query.date = { $gte: start, $lte: end };
      }

      // Use aggregation pipeline for better performance with fewer database round trips
      const pipeline: any[] = [
        { $match: query },
        { $sort: { date: -1 as 1 | -1 } },
        {
          $lookup: {
            from: "shifts", // Replace with actual shift collection name
            localField: "shiftId",
            foreignField: "_id",
            as: "shift",
            pipeline: [
              {
                $project: {
                  startTime: 1,
                  endTime: 1,
                  hasBreak: 1,
                  breakStartTime: 1,
                  breakEndTime: 1,
                },
              },
            ],
          },
        },
        {
          $lookup: {
            from: "leaverequests", // Replace with actual leave request collection name
            let: {
              empId: "$employeeId",
              attendanceDate: {
                $dateToString: {
                  format: "%Y-%m-%d",
                  date: "$date",
                },
              },
            },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $and: [
                      { $eq: ["$userId", "$$empId"] },
                      { $eq: ["$status", "approved"] },
                      {
                        $eq: [
                          {
                            $dateToString: {
                              format: "%Y-%m-%d",
                              date: "$date",
                            },
                          },
                          "$$attendanceDate",
                        ],
                      },
                    ],
                  },
                },
              },
              {
                $project: {
                  isPaid: 1,
                },
              },
            ],
            as: "leaveRequest",
          },
        },
        {
          $addFields: {
            shiftId: { $arrayElemAt: ["$shift", 0] },
            isPaid: {
              $cond: {
                if: { $and: [{ $eq: ["$status", "leave"] }, { $gt: [{ $size: "$leaveRequest" }, 0] }] },
                then: { $ifNull: [{ $arrayElemAt: ["$leaveRequest.isPaid", 0] }, false] },
                else: false,
              },
            },
          },
        },
        {
          $project: {
            shift: 0,
            leaveRequest: 0,
          },
        },
      ];

      const attendance = await Attendance.aggregate(pipeline);

      // Process records efficiently
      const results = attendance.map((record) => {
        const result = {
          ...record,
          overtimeMinutes: 0,
          earlyMinutes: 0,
          lateMinutes: 0,
        };

        if (record.status === "present" && record.checkIn && record.checkOut && record.shiftId) {
          Object.assign(result, calculateOvertime(record));
        }

        return result;
      });

      console.timeEnd("getAllForDate");
      return results;
    } catch (err: any) {
      console.error("Error in getAllForDate:", err);
      throw new Error(err.message);
    }
  },

  // Option 2: Optimized Version of Your Original Approach
  getAllForDateOptimized: async (startDate?: Date, endDate?: Date) => {
    try {
      console.time("getAllForDate");
      const query: any = {};
      if (startDate && endDate) {
        const start = new Date(startDate);
        const end = new Date(endDate);
        start.setHours(0, 0, 0, 0);
        end.setHours(23, 59, 59, 999);
        query.date = { $gte: start, $lte: end };
      }

      // Get attendance with minimal projection to reduce data transfer
      const attendance = await Attendance.find(query, {
        employeeId: 1,
        date: 1,
        status: 1,
        checkIn: 1,
        checkOut: 1,
        shiftId: 1,
      })
        .populate({
          path: "shiftId",
          select: "startTime endTime hasBreak breakStartTime breakEndTime",
        })
        .sort({ date: -1 })
        .lean();

      // Early return if no records
      if (!attendance.length) {
        console.timeEnd("getAllForDate");
        return [];
      }

      // Batch process leave records more efficiently
      const leaveRecords = attendance.filter((record) => record.status === "leave");
      let leaveRequestsMap = new Map();

      if (leaveRecords.length > 0) {
        // Use Set for unique values and more efficient date handling
        const uniqueUserIds = [...new Set(leaveRecords.map((record) => record.employeeId.toString()))];

        // Calculate date range more efficiently
        const dates = leaveRecords.map((record) => new Date(record.date).setHours(0, 0, 0, 0));
        const minDate = new Date(Math.min(...dates));
        const maxDate = new Date(Math.max(...dates));
        maxDate.setHours(23, 59, 59, 999);

        // Single optimized query with projection
        const leaveRequests = await LeaveRequest.find(
          {
            userId: { $in: uniqueUserIds },
            status: "approved",
            date: { $gte: minDate, $lte: maxDate },
          },
          {
            userId: 1,
            date: 1,
            isPaid: 1,
          }
        ).lean();

        // Build lookup map more efficiently
        leaveRequests.forEach((request) => {
          const dateStr = new Date(request.date).toISOString().split("T")[0];
          const key = `${request.userId.toString()}_${dateStr}`;
          leaveRequestsMap.set(key, request);
        });
      }

      // Process results with pre-allocated array
      const results = new Array(attendance.length);

      for (let i = 0; i < attendance.length; i++) {
        const record = attendance[i];

        if (record.status === "leave") {
          const dateStr = new Date(record.date).toISOString().split("T")[0];
          const key = `${record.employeeId.toString()}_${dateStr}`;
          const leaveRequest = leaveRequestsMap.get(key);

          results[i] = {
            ...record,
            isPaid: leaveRequest?.isPaid || false,
            overtimeMinutes: 0,
            earlyMinutes: 0,
            lateMinutes: 0,
          };
        } else if (record.status === "present" && record.checkIn && record.checkOut && record.shiftId) {
          results[i] = calculateOvertime(record);
        } else {
          results[i] = {
            ...record,
            overtimeMinutes: 0,
            earlyMinutes: 0,
            lateMinutes: 0,
          };
        }
      }

      console.timeEnd("getAllForDate");
      return results;
    } catch (err: any) {
      console.error("Error in getAllForDate:", err);
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
    // Find user's work mode
    const userObjectId = new Types.ObjectId(userId);
    const userWorkMode = await Workmode.findOne({ employees: { $in: [userObjectId] } });

    if (!userWorkMode) {
      throw new Error("Work mode not found for the employee");
    }

    let isWithinAllowedDistance = false;
    let distanceMessage = "";

    // Check if work mode is "Onsite"
    if (userWorkMode.modeName === "Onsite") {
      // For onsite employees, check against all active locations
      const locations = await Location.find({ isActive: true });

      if (!locations || locations.length === 0) {
        throw new Error("No active office locations found");
      }

      // Check distance against all locations
      let closestDistance = Number.MAX_VALUE;
      let closestLocation = null;

      for (const location of locations) {
        if (!location.latitude || !location.longitude || !location.radius) {
          continue;
        }

        const distance = attendanceService.haversineDistance(
          location.latitude,
          location.longitude,
          latitude,
          longitude
        );

        console.log(
          `Distance from ${location.name}: ${distance.toFixed(2)} meters (allowed: ${location.radius} meters)`
        );

        if (distance <= location.radius) {
          isWithinAllowedDistance = true;
          closestDistance = distance;
          closestLocation = location;
          break; // Found a valid location, no need to check others
        }

        if (distance < closestDistance) {
          closestDistance = distance;
          closestLocation = location;
        }
      }

      if (!isWithinAllowedDistance && closestLocation) {
        distanceMessage = `You are too far from the nearest office location (${closestLocation.name}). Distance: ${closestDistance.toFixed(2)} meters. Maximum allowed distance: ${closestLocation.radius} meters.`;
      }
    } else {
      // For remote/hybrid employees, check against their registered addresses
      // Handle multiple addresses case - find all addresses for the user
      // Only consider active addresses (not soft deleted)
      const addresses = await Address.find({
        userId: userId,
        isActive: { $ne: false }, // Get addresses where isActive is true or not specified
      });

      if (!addresses || addresses.length === 0) {
        throw new Error("No active addresses found for this employee");
      }

      // Check distance against all registered addresses
      let closestDistance = Number.MAX_VALUE;
      let closestAddress = null;
      let anyValidAddressFound = false; // Track if we've found any valid address coordinates
      const allowedDistance = 500; // For personal addresses, use default 500m radius

      for (const address of addresses) {
        if (!address.latitude || !address.longitude || address.latitude === 0 || address.longitude === 0) {
          // Skip addresses without valid coordinates
          continue;
        }

        anyValidAddressFound = true; // At least one address with valid coordinates was found

        console.log(`Checking address: ${address._id}`);
        console.log("address.latitude : ", address.latitude);
        console.log("address.longitude : ", address.longitude);

        const distance = attendanceService.haversineDistance(address.latitude, address.longitude, latitude, longitude);

        console.log(
          `Distance from address ${address._id}: ${distance.toFixed(2)} meters (allowed: ${allowedDistance} meters)`
        );

        if (distance <= allowedDistance) {
          // If within allowed distance of any address, mark as successful and exit loop
          isWithinAllowedDistance = true;
          console.log(`Found valid address within range: ${address._id}, distance: ${distance.toFixed(2)} meters`);
          break; // Exit loop as we found a valid address
        }

        // Keep track of closest address for error message
        if (distance < closestDistance) {
          closestDistance = distance;
          closestAddress = address;
        }
      }

      // If no address had valid coordinates
      if (!anyValidAddressFound) {
        throw new Error("No valid address coordinates found for this employee");
      }

      // If not within allowed distance of any address
      if (!isWithinAllowedDistance) {
        distanceMessage = `You are too far from any of your registered locations. Closest distance: ${closestDistance.toFixed(2)} meters. Maximum allowed distance: ${allowedDistance} meters.`;
      }

      console.log("latitude : ", latitude);
      console.log("longitude : ", longitude);
    }

    if (!isWithinAllowedDistance) {
      throw new Error(distanceMessage);
    }

    // Mark attendance (check-in) if within allowed distance
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const employeeObjectId = new Types.ObjectId(userId);
    let attendance = await Attendance.findOne({
      employeeId: employeeObjectId,
      date: today,
    });
    if (!attendance) {
      const newAttendance = await Attendance.create({
        employeeId: employeeObjectId,
        date: today,
        checkIn: new Date(),
        status: "present",
        workModeId: userWorkMode._id,
      });
      return newAttendance.toJSON(); // Convert to plain object
    } else {
      if (attendance.checkIn) {
        throw new Error("You have already checked in today.");
      }
      attendance.checkIn = new Date();
      attendance.status = "present";
      await attendance.save();
    }
    return attendance.toJSON(); // Convert to plain object
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
        const newAttendance = await Attendance.create({
          employeeId: userId,
          date: attendanceDate,
          checkIn: date,
          status: "present",
        });
        return newAttendance.toJSON(); // Convert to plain object
      } else {
        if (attendance.checkIn) {
          throw new Error("You have already checked in today.");
        }
        attendance.checkIn = date;
        attendance.status = "present";
        await attendance.save();
      }

      return attendance.toJSON(); // Convert to plain object
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

      return attendance.toJSON(); // Convert to plain object
    } catch (error: any) {
      throw new Error(error.message);
    }
  },
};

/**
 * Cron: Mark employees absent if no check-in after shift end + grace period
 * Uses smart date logic to avoid reprocessing the same records multiple times
 */
export const markAbsentForUsers = async () => {
  const GRACE_MINUTES = 120;
  const now = new Date();
  let processedCount = 0;
  let absentMarkedCount = 0;
  let skippedCount = 0;

  console.log(`[MarkAbsent] Starting cron job at ${now.toISOString()}`);

  try {
    const shifts = await Shift.find({ isBlocked: false }).populate("employees");
    console.log(`[MarkAbsent] Found ${shifts.length} active shifts`);

    // Determine which date to process based on current time
    // This prevents processing the same date multiple times
    const targetDate = getTargetDateForProcessing(now);
    if (!targetDate) {
      console.log(`[MarkAbsent] No date needs processing at this time`);
      return;
    }

    console.log(`[MarkAbsent] Processing date: ${targetDate.toDateString()}`);

    for (const shift of shifts) {
      const [endHour, endMinute] = shift.endTime.split(":").map(Number);

      // Calculate when this shift would end with grace period
      const shiftEnd = new Date(targetDate);
      shiftEnd.setHours(endHour, endMinute + GRACE_MINUTES, 0, 0);

      // Handle overnight shifts (end time after midnight)
      if (endHour < 12 && now.getHours() >= 12) {
        // This is likely an overnight shift ending the next day
        shiftEnd.setDate(shiftEnd.getDate() + 1);
      }

      // Only process if grace period has passed
      if (now < shiftEnd) {
        continue;
      }

      for (const employeeId of shift.employees) {
        processedCount++;

        // Check if employee already has attendance record for this date
        const attendance = await Attendance.findOne({
          employeeId,
          date: targetDate,
        });

        if (!attendance) {
          // Create new absent record
          try {
            await Attendance.create({
              employeeId,
              date: targetDate,
              status: "absent",
              shiftId: shift._id as Types.ObjectId,
            });
            absentMarkedCount++;
            console.log(`[MarkAbsent] Marked employee ${employeeId} absent for ${targetDate.toDateString()}`);
          } catch (error: any) {
            if (error.code === 11000) {
              console.log(
                `[MarkAbsent] Duplicate prevented: Employee ${employeeId} for ${targetDate.toDateString()} already exists`
              );
              skippedCount++;
            } else {
              console.error(`[MarkAbsent] Error creating attendance for employee ${employeeId}:`, error);
            }
          }
        } else if (attendance.status !== "present" && attendance.status !== "leave" && attendance.status !== "absent") {
          // Update existing record to absent (only if it's not already properly set)
          attendance.status = "absent";
          attendance.shiftId = shift._id as Types.ObjectId;
          await attendance.save();
          absentMarkedCount++;
          console.log(`[MarkAbsent] Updated employee ${employeeId} status to absent for ${targetDate.toDateString()}`);
        } else {
          skippedCount++;
        }
      }
    }

    console.log(
      `[MarkAbsent] Completed: Processed ${processedCount} records, marked ${absentMarkedCount} as absent, skipped ${skippedCount} existing/duplicates`
    );
  } catch (error) {
    console.error(`[MarkAbsent] Cron job failed:`, error);
  }
};

/**
 * Determines which date should be processed based on current time
 * Returns null if no processing is needed at this time
 */
function getTargetDateForProcessing(now: Date): Date | null {
  const currentHour = now.getHours();

  // 8 AM (08:00): Process yesterday's overnight shifts (22:00-06:00 shifts)
  if (currentHour === 8) {
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    yesterday.setHours(0, 0, 0, 0);
    return yesterday;
  }

  // 4 PM (16:00): Process today's morning shifts (06:00-14:00 shifts)
  if (currentHour === 16) {
    const today = new Date(now);
    today.setHours(0, 0, 0, 0);
    return today;
  }

  // Midnight (00:00): Process yesterday's evening shifts (14:00-22:00 shifts)
  if (currentHour === 0) {
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    yesterday.setHours(0, 0, 0, 0);
    return yesterday;
  }

  // No processing needed at other times
  return null;
}

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
