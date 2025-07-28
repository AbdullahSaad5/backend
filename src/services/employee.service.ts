import { User } from "@/models";
import { Payroll } from "@/models/payroll.model";
import { Shift } from "@/models/workshift.model";
import { Workmode } from "@/models/workmode.model";
import { Attendance } from "@/models/attendance.model";

export const employeeService = {
  getEmployeeList: async (unassignedPayroll?: boolean) => {
    try {
      let employees;
      if (unassignedPayroll) {
        // Find all userIds that have a payroll
        const payrollUserIds = await Payroll.distinct("userId");
        // Find users whose _id is NOT in payrollUserIds
        employees = await User.find({ _id: { $nin: payrollUserIds } });
      } else {
        employees = await User.find();
      }
      return {
        success: true,
        message: "Employee list fetched successfully",
        data: employees,
      };
    } catch (error: any) {
      return {
        success: false,
        message: "Failed to fetch employee list",
        error: error.message || "Unknown error",
      };
    }
  },
  getMyInfo: async (id: string) => {
    return employeeService.getEmployeeProfileDetails(id);
  },
  getEmployeeProfileDetails: async (userId: string) => {
    // Employee info - only select necessary fields
    const employee = await User.findById(userId).select(
      "_id firstName lastName email"
    );
    if (!employee) {
      throw new Error("Employee not found");
    }

    const shifts = await Shift.find({ employees: userId }).select(
      "shiftName shiftDescription startTime endTime isBlocked createdAt updatedAt"
    );
    // Workmodes
    const workmodes = await Workmode.find({ employees: userId }).select(
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
