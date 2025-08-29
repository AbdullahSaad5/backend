import { User } from "@/models";
import { Payroll } from "@/models/payroll.model";
import { Shift } from "@/models/workshift.model";
import { Workmode } from "@/models/workmode.model";
import { Attendance } from "@/models/attendance.model";
import { LeaveRequest } from "@/models/leave-request.model";

export const employeeService = {
  getEmployeeList: async (
    unassignedPayroll?: boolean,
    isVerified?: boolean
  ) => {
    try {
      let employees;
      const baseFilter: any = {};
      if (isVerified) {
        baseFilter.isEmailVerified = true;
      }
      if (unassignedPayroll) {
        // Find all userIds that have a payroll
        const payrollUserIds = await Payroll.distinct("userId");
        // Find users whose _id is NOT in payrollUserIds
        employees = await User.find({
          _id: { $nin: payrollUserIds },
          ...baseFilter,
        });
      } else {
        employees = await User.find(baseFilter);
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
      "_id firstName lastName email geofencingRadius geofencingAttendanceEnabled annualLeaveYear annualLeaveCarriedForward annualLeaveEntitlement"
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
  getEmployeeLeaves: async (userId: string) => {
    try {
      const employee = await User.findById(userId).select(
        "_id firstName lastName email annualLeaveYear annualLeaveCarriedForward annualLeaveEntitlement"
      );
      if (!employee) {
        throw new Error("Employee not found");
      }

      // Calculate the total leave entitlement (annual + carried forward)
      const totalEntitlement =
        (employee.annualLeaveEntitlement || 0) +
        (employee.annualLeaveCarriedForward || 0);

      // Query for all used leaves in the current annual leave year
      const currentYear = employee.annualLeaveYear || new Date().getFullYear();

      // Create date range for the current leave year
      const startDate = new Date(currentYear, 0, 1); // January 1st of current leave year
      const endDate = new Date(currentYear, 11, 31); // December 31st of current leave year

      // Query the leave records to get used leaves where isPaid is true and status is approved
      const leaveRequests = await LeaveRequest.find({
        userId: userId,
        date: { $gte: startDate, $lte: endDate },
        isPaid: true,
        status: "approved", // Only count approved leave requests
      });

      // Count the number of paid leave days used
      const usedLeaves = leaveRequests.length;

      // Calculate remaining leaves
      const remainingLeaves = totalEntitlement - usedLeaves;

      return {
        success: true,
        message: "Employee leaves fetched successfully",
        data: {
          employee: {
            _id: employee._id,
            firstName: employee.firstName,
            lastName: employee.lastName,
            email: employee.email,
          },
          leaveDetails: {
            annualLeaveYear: currentYear,
            annualLeaveEntitlement: employee.annualLeaveEntitlement || 0,
            annualLeaveCarriedForward: employee.annualLeaveCarriedForward || 0,
            totalEntitlement: totalEntitlement,
            usedLeaves: usedLeaves,
            remainingLeaves: remainingLeaves,
          },
        },
      };
    } catch (error: any) {
      return {
        success: false,
        message: "Failed to fetch employee leaves",
        error: error.message || "Unknown error",
      };
    }
  },
};
