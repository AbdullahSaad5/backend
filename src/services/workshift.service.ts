import { Shift } from "@/models/workshift.model";

export const workshiftService = {
  async createShift(data: any) {
    if (data.employees && Array.isArray(data.employees)) {
      // Remove each employee from their existing shifts one by one
      for (const employeeId of data.employees) {
        await this.removeUserFromOtherShifts(employeeId);
      }
    }
    return await Shift.create(data);
  },

  async getAllShifts() {
    return await Shift.find()
      .populate("employees", "firstName lastName email userType")
      .sort({ createdAt: -1 });
  },

  async getShiftById(id: string) {
    return await Shift.findById(id).populate(
      "employees",
      "firstName lastName email userType"
    );
  },

  async updateShift(id: string, data: any) {
    const currentShift = await Shift.findById(id);
    if (!currentShift) {
      throw new Error("Shift not found");
    }

    if (data.employees && Array.isArray(data.employees)) {
      const currentEmployees = currentShift.employees || [];

      // Find new employees that aren't in the current shift
      const newEmployees = data.employees.filter(
        (empId: string) => !currentEmployees.includes(empId)
      );

      // Remove each new employee from their other shifts
      for (const employeeId of newEmployees) {
        await this.removeUserFromOtherShifts(employeeId);
      }
    }

    return await Shift.findByIdAndUpdate(id, data, { new: true }).populate(
      "employees",
      "firstName lastName email userType"
    );
  },

  async deleteShift(id: string) {
    return await Shift.findByIdAndDelete(id);
  },

  async getShiftsByEmployee(employeeId: string) {
    return await Shift.find({ employees: employeeId })
      .sort({ startTime: 1 })
      .populate("employees", "firstName lastName email userType");
  },
  async patchShiftEmployees(id: string, employeeIds: string[]) {
    // Remove these employees from any other shifts first
    for (const employeeId of employeeIds) {
      await this.removeUserFromOtherShifts(employeeId);
    }

    // Add employees to the specified shift
    return await Shift.findByIdAndUpdate(
      id,
      { $addToSet: { employees: { $each: employeeIds } } },
      { new: true }
    ).populate("employees", "firstName lastName email userType");
  },

  async removeUserFromOtherShifts(userId: string) {
    // Remove this specific user from any other shifts they might be in
    await Shift.updateMany(
      { employees: userId },
      { $pull: { employees: userId } }
    );
  },
};
