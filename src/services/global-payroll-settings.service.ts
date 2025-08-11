import { GlobalPayrollSettings } from "@/models/global-payroll-settings.model";
import { GlobalPayrollSettingsDocument } from "@/contracts/global-payroll-settings.contract";
import { Types } from "mongoose";

export const globalPayrollSettingsService = {
  createGlobalPayrollSettings: async (
    data: any
  ): Promise<GlobalPayrollSettingsDocument> => {
    const globalSettings = new GlobalPayrollSettings(data);
    return await globalSettings.save();
  },

  getAllGlobalPayrollSettings: async (
    query: any = {}
  ): Promise<GlobalPayrollSettingsDocument[]> => {
    return await GlobalPayrollSettings.find(query)
      .populate("createdBy", "firstName lastName email")
      .populate("updatedBy", "firstName lastName email")
      .sort({ createdAt: -1 });
  },

  getGlobalPayrollSettingsById: async (
    id: string
  ): Promise<GlobalPayrollSettingsDocument | null> => {
    return await GlobalPayrollSettings.findById(id)
      .populate("createdBy", "firstName lastName email")
      .populate("updatedBy", "firstName lastName email");
  },

  getActiveGlobalPayrollSettings: async (): Promise<
    GlobalPayrollSettingsDocument[]
  > => {
    return await GlobalPayrollSettings.find()
      .populate("createdBy", "firstName lastName email")
      .populate("updatedBy", "firstName lastName email")
      .sort({ createdAt: -1 });
  },

  updateGlobalPayrollSettings: async (
    id: string,
    data: any
  ): Promise<GlobalPayrollSettingsDocument | null> => {
    return await GlobalPayrollSettings.findByIdAndUpdate(
      id,
      { ...data, updatedAt: new Date() },
      { new: true, runValidators: true }
    )
      .populate("createdBy", "firstName lastName email")
      .populate("updatedBy", "firstName lastName email");
  },

  deleteGlobalPayrollSettings: async (id: string): Promise<boolean> => {
    const result = await GlobalPayrollSettings.findByIdAndDelete(id);
    return !!result;
  },

  getGlobalPayrollSettingsByName: async (
    name: string
  ): Promise<GlobalPayrollSettingsDocument | null> => {
    return await GlobalPayrollSettings.findOne({ name })
      .populate("createdBy", "firstName lastName email")
      .populate("updatedBy", "firstName lastName email");
  },
};
