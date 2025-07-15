import { Workmode } from "@/models/workmode.model";
import { IWorkmode } from "@/contracts/workmode.contract";
import { Types } from "mongoose";

export const workmodeService = {
  async createWorkmode(data: Partial<IWorkmode>) {
    // If employees are being added, remove them from other workmodes first
    if (data.employees && Array.isArray(data.employees)) {
      await this.removeUsersFromOtherWorkmodes(data.employees);
    }
    return await Workmode.create(data);
  },

  async getAllWorkmodes() {
    return await Workmode.find()
      .populate("employees", "firstName lastName email userType")
      .sort({ createdAt: -1 });
  },

  async getWorkmodeById(id: string) {
    return await Workmode.findById(id).populate(
      "employees",
      "firstName lastName email userType"
    );
  },

  async updateWorkmode(id: string, data: Partial<IWorkmode>) {
    return await Workmode.findByIdAndUpdate(id, data, { new: true }).populate(
      "employees",
      "firstName lastName email userType"
    );
  },

  async patchWorkmode(id: string, employeeIds: string[]) {
    // Remove these employees from any other workmodes first
    await this.removeUsersFromOtherWorkmodes(employeeIds);

    // Add employees to the specified workmode
    return await Workmode.findByIdAndUpdate(
      id,
      { $addToSet: { employees: { $each: employeeIds } } },
      { new: true }
    ).populate("employees", "firstName lastName email userType");
  },

  async deleteWorkmode(id: string) {
    return await Workmode.findByIdAndDelete(id);
  },

  async removeUsersFromOtherWorkmodes(userIds: string[]) {
    // Remove these users from all other workmodes
    await Workmode.updateMany(
      { employees: { $in: userIds } },
      { $pullAll: { employees: userIds } }
    );
  },
};
