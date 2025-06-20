import { GuideModel } from "../models/guide.model";
import { IGuide } from "@/contracts/guide.contract";

export const guideService = {
  /**
   * Create a new guide
   */
  createGuide: async (data: {
    title: string;
    description: string;
    category: string;
    content: string;
  }): Promise<IGuide> => {
    const guide = new GuideModel(data);
    return guide.save();
  },

  /**
   * Get guide by ID
   */
  getGuideById: async (id: string): Promise<IGuide | null> => {
    return GuideModel.findById(id);
  },

  /**
   * Get all guides with optional filters
   */
  getAllGuides: async (
    filters: {
      category?: string;
      search?: string;
      isBlocked?: boolean;
    } = {}
  ): Promise<IGuide[]> => {
    const query: any = {};

    if (filters.category) query.category = filters.category;
    if (filters.isBlocked !== undefined) query.isBlocked = filters.isBlocked;
    if (filters.search) {
      query.$or = [
        { title: { $regex: filters.search, $options: "i" } },
        { description: { $regex: filters.search, $options: "i" } },
        { content: { $regex: filters.search, $options: "i" } },
      ];
    }

    return GuideModel.find(query).sort({ createdAt: -1 });
  },

  /**
   * Update a guide
   */
  updateGuide: async (
    id: string,
    updateData: Partial<IGuide>
  ): Promise<IGuide | null> => {
    return GuideModel.findByIdAndUpdate(
      id,
      { ...updateData, updatedAt: new Date() },
      {
        new: true,
        runValidators: true,
      }
    );
  },

  /**
   * Delete a guide
   */
  deleteGuide: async (id: string): Promise<IGuide | null> => {
    return GuideModel.findByIdAndDelete(id);
  },

  /**
   * Toggle block status of a guide
   */
  toggleBlockStatus: async (id: string): Promise<IGuide | null> => {
    const guide = await GuideModel.findById(id);
    if (!guide) return null;

    return GuideModel.findByIdAndUpdate(
      id,
      { isBlocked: !guide.isBlocked, updatedAt: new Date() },
      { new: true }
    );
  },
};