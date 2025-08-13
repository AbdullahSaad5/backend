import AnnouncementBarModel from "@/models/announcement-bar.model";
import { IAnnouncementBar } from "@/contracts/announcement-bar.contract";

export const announcementBarService = {
  // Create announcement bar
  createAnnouncementBar: async (data: Partial<IAnnouncementBar>): Promise<IAnnouncementBar> => {
    // If setting this announcement as active, deactivate all others
    if (data.isActive) {
      await AnnouncementBarModel.updateMany({ isActive: true }, { isActive: false });
    }
    const announcementBar = await AnnouncementBarModel.create(data);
    return announcementBar;
  },

  // Get all announcement bars
  getAnnouncementBars: async (): Promise<IAnnouncementBar[]> => {
    return AnnouncementBarModel.find().sort({ createdAt: -1 }).exec();
  },

  // Get active announcement bar
  getActiveAnnouncementBar: async (): Promise<IAnnouncementBar | null> => {
    return AnnouncementBarModel.findOne({ isActive: true }).sort({ createdAt: -1 }).exec();
  },

  // Update announcement bar
  updateAnnouncementBar: async (id: string, data: Partial<IAnnouncementBar>): Promise<IAnnouncementBar | null> => {
    // If setting this announcement as active, deactivate all others
    if (data.isActive) {
      await AnnouncementBarModel.updateMany({ _id: { $ne: id }, isActive: true }, { isActive: false });
    }
    return AnnouncementBarModel.findByIdAndUpdate(id, data, { new: true });
  },

  // Delete announcement bar
  deleteAnnouncementBar: async (id: string): Promise<boolean> => {
    const result = await AnnouncementBarModel.findByIdAndDelete(id);
    return !!result;
  },
};
