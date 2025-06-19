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
    return GuideModel.findById(id).populate('category', 'title');
  },

  /**
   * Get all guides with optional filters
   */
  getAllGuides: async (
    filters: {
      category?: string;
      isBlocked?: boolean;
      search?: string;
    } = {}
  ): Promise<IGuide[]> => {
    const query: any = {};
  
    if (filters.category) query.category = filters.category;
    if (filters.isBlocked !== undefined) query.isBlocked = filters.isBlocked;
    
    if (filters.search) {
      query.$or = [
        { title: { $regex: filters.search, $options: 'i' } },
        { description: { $regex: filters.search, $options: 'i' } }
      ];
    }
  
    return GuideModel.find(query)
      .populate('category', 'title')
      .sort({ createdAt: -1 });
  },

  /**
   * Update an existing guide
   */
  updateGuide: async (
    id: string,
    updateData: Partial<IGuide>
  ): Promise<IGuide | null> => {
    return GuideModel.findByIdAndUpdate(id, updateData, {
      new: true,
      runValidators: true,
    }).populate('category', 'title');
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
    
    guide.isBlocked = !guide.isBlocked;
    return guide.save();
  },
};