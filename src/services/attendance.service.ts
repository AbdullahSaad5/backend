import { IAttendance } from "@/contracts/attendance.contract";
import { Attendance } from "@/models/attendance.model";
import { Address, User } from "@/models";
import { Types } from "mongoose";
import { Shift } from "@/models/workshift.model";

export const attendanceService = {
  // Employee self check-in
  checkIn: async (
    employeeId: string,
    shiftId: string,
    workModeId: string,
    checkIn: Date
  ) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const isEmployee = await User.findOne({
      _id: employeeId,
      isEmployee: true,
    });
    if (!isEmployee) {
      throw new Error("Only Employee can check in");
    }
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
  updateAttendance: async (
    attendanceId: string,
    update: Partial<IAttendance>
  ) => {
    const attendance = await Attendance.findByIdAndUpdate(
      attendanceId,
      update,
      { new: true }
    );
    return attendance;
  },

  // Get attendance for employee (self or admin)
  getAttendance: async (
    employeeId: string,
    startDate?: Date,
    endDate?: Date
  ) => {
    const query: any = { employeeId };
    if (startDate && endDate) {
      query.date = { $gte: startDate, $lte: endDate };
    }
    return Attendance.find(query).sort({ date: -1 });
  },

  // Admin: get all employees' attendance for a date
  getAllForDate: async (startDate?: Date, endDate?: Date) => {
    try {
      const query: any = {};
      if (startDate && endDate) {
        query.date = { $gte: startDate, $lte: endDate };
      }
      const attendance = await Attendance.find(query).sort({ date: -1 });
      return attendance;
    } catch (err: any) {
      throw new Error(err.message);
    }
  },

  // Helper: Haversine formula to calculate distance in meters
  haversineDistance: (
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
  ): number => {
    const toRad = (value: number) => (value * Math.PI) / 180;
    const R = 6371000; // Radius of Earth in meters
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(toRad(lat1)) *
        Math.cos(toRad(lat2)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  },

  // Admin: geo location attendance mark
  geoLocationAttendanceMark: async (
    userId: string,
    latitude: number,
    longitude: number
  ) => {
    const address = await Address.findOne({ userId: userId });
    if (!address) {
      throw new Error("Address not found");
    }
    console.log("address.latitude : ", address);

    if (
      !address.latitude ||
      !address.longitude ||
      address.latitude === 0 ||
      address.longitude === 0
    ) {
      throw new Error("Latitude and longitude for employee not found in db");
    }
    console.log("address.latitude : ", address.latitude);
    console.log("address.longitude : ", address.longitude);
    console.log("latitude : ", latitude);
    console.log("longitude : ", longitude);

    const distance = attendanceService.haversineDistance(
      address.latitude,
      address.longitude,
      latitude,
      longitude
    );

    if (distance > 500) {
      throw new Error(
        `You are too far from the registered location. Distance: ${distance.toFixed(2)} meters.`
      );
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
};

/**
 * Cron: Mark employees absent if no check-in after shift end + grace period
 */
export const markAbsentForUsers = async () => {
  // Placeholder: 10 minutes grace period
  const GRACE_MINUTES = 120;
  const now = new Date();
  // Get all shifts
  const shifts = await Shift.find({ isBlocked: false }).populate("employees");
  for (const shift of shifts) {
    const [endHour, endMinute] = shift.endTime.split(":").map(Number);
    for (const employeeId of shift.employees) {
      // Calculate shift end + grace
      const shiftEnd = new Date(now);
      shiftEnd.setHours(endHour, endMinute + GRACE_MINUTES, 0, 0);
      if (now >= shiftEnd) {
        // Check if attendance exists for today
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const attendance = await Attendance.findOne({
          employeeId,
          date: today,
        });
        if (!attendance || !attendance.checkIn) {
          // Mark as absent
          await Attendance.create({
            employeeId,
            date: today,
            status: "absent",
            shiftId: shift._id,
          });
        }
      }
    }
  }
};

/**
 * Cron: Auto-checkout employees if checked in but not checked out after shift end + buffer
 */
export const autoCheckoutForUsers = async () => {
  // Placeholder: 15 minutes buffer after shift end
  const BUFFER_MINUTES = 120;
  const now = new Date();
  // Get all shifts
  const shifts = await Shift.find({ isBlocked: false }).populate("employees");
  for (const shift of shifts) {
    const [endHour, endMinute] = shift.endTime.split(":").map(Number);
    for (const employeeId of shift.employees) {
      // Calculate shift end + buffer
      const shiftEnd = new Date(now);
      shiftEnd.setHours(endHour, endMinute + BUFFER_MINUTES, 0, 0);
      if (now >= shiftEnd) {
        // Check if attendance exists for today
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const attendance = await Attendance.findOne({
          employeeId,
          date: today,
        });
        if (attendance && attendance.checkIn && !attendance.checkOut) {
          // Auto-checkout
          attendance.checkOut = now;
          await attendance.save();
        }
      }
    }
  }
};
