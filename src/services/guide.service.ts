// src/services/guide.service.ts
import { GuideModel } from "@/models/guide.model";
import { IGuide, IGuideResponse } from "@/contracts/guide.contract";

export const guideService = {
  createGuide: async (data: {
    title: string;
    description: string;
    type: string;
    category: string;
    content: string;
  }): Promise<IGuide> => {
    const guide = new GuideModel(data);
    await guide.save();
    return guide.populate("category", "title _id");
  },

  getGuideById: async (id: string): Promise<IGuide | null> => {
    return GuideModel.findById(id).populate("category", "title _id");
  },

  getAllGuides: async (
    filters: {
      category?: string;
      search?: string;
      isBlocked?: boolean;
    } = {},
    limitNum: number,
    skip: number
  ): Promise<IGuideResponse> => {
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

    // return GuideModel.find(query)
    //   .populate("category", "title _id")
    //   .skip(skip)
    //   .limit(limitNum)
    //   .sort({ createdAt: -1 });

    const [guides, totalCount] = await Promise.all([
      GuideModel.find(query).skip(skip).limit(limitNum).sort({ createdAt: -1 }),
      GuideModel.countDocuments(query),
    ]);

    return { guides, totalCount };
  },

  updateGuide: async (
    id: string,
    updateData: Partial<IGuide>
  ): Promise<IGuide | null> => {
    return GuideModel.findByIdAndUpdate(id, updateData, {
      new: true,
      runValidators: true,
    }).populate("category", "title _id");
  },

  deleteGuide: async (id: string): Promise<IGuide | null> => {
    return GuideModel.findByIdAndDelete(id).populate("category", "title _id");
  },
};
