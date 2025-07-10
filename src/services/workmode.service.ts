import { Workmode } from "@/models/workmode.model";
import { IWorkmode } from "@/contracts/workmode.contract";
import { Types } from "mongoose";

export const workmodeService = {
  async createWorkmode(data: Partial<IWorkmode>) {
    return await Workmode.create(data);
  },

  async getAllWorkmodes() {
    return await Workmode.find().populate("employees", "firstName lastName email userType").sort({ createdAt: -1 });
  },

  async getWorkmodeById(id: string) {
    return await Workmode.findById(id).populate("employees", "firstName lastName email userType");
  },

  async updateWorkmode(id: string, data: Partial<IWorkmode>) {
    return await Workmode.findByIdAndUpdate(id, data, { new: true }).populate("employees", "firstName lastName email userType");
  },

  async deleteWorkmode(id: string) {
    return await Workmode.findByIdAndDelete(id);
  },
}; 