import { User } from "@/models";
import { Shift } from "@/models/workshift.model";
import { Workmode } from "@/models/workmode.model";
import { Attendance } from "@/models/attendance.model";
import { Types } from "mongoose";

export const employeeService = {
  getEmployeeList: async () => {
    const employees = await User.find({ isEmployee: true });
    return {
      success: true,
      message: "Employee list fetched successfully",
      data: employees,
    };
  },
  getMyInfo: async (id: string) => {
    return employeeService.getEmployeeProfileDetails(id);
  },
  getEmployeeProfileDetails: async (userId: string) => {
    // Employee info - only select necessary fields
    const employee = await User.findById(userId).select("_id firstName lastName email");
    if (!employee) {
      throw new Error("Employee not found");
    }

    const userObjectId = Types.ObjectId.isValid(userId) ? new Types.ObjectId(userId) : userId;
    const shifts = await Shift.find({ employees: { $in: [userId, userObjectId] } }).select(
      "shiftName shiftDescription startTime endTime isBlocked createdAt updatedAt"
    );
    // Workmodes
    const workmodes = await Workmode.find({ employees: { $in: [userId, userObjectId] } }).select(
      "modeName createdAt updatedAt"
    );
    // Today's attendance
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const attendance = await Attendance.findOne({
      employeeId: userId,
      date: today,
    });
    return {
      success: true,
      data: {
        employee,
        shifts,
        workmodes,
        attendance,
      },
    };
  },
};
