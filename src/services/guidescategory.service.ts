import { GuidesCategoryModel } from "@/models/guidescategory.model";

export const GuidesCategoryService = {
  createGuidesCategory: (title: string, description: string, image: string) => {
    const newGuidesCategory = new GuidesCategoryModel({
      title,
      description,
      image,
    });
    return newGuidesCategory.save();
  },

  editGuidesCategory: (
    id: string,
    data: {
      title?: string;
      description?: string;
      image?: string;
      isBlocked?: boolean;
    }
  ) => {
    return GuidesCategoryModel.findByIdAndUpdate(id, data, { new: true });
  },

  deleteGuidesCategory: (id: string) => {
    const guidesCategory = GuidesCategoryModel.findByIdAndDelete(id);
    if (!guidesCategory) {
      throw new Error("Guides category not found");
    }
    return guidesCategory;
  },

  getAllGuidesCategories: async (
    filters: {
      category?: string;
      search?: string;
      isBlocked?: boolean;
    } = {},
    limitNum: number,
    skip: number
  ): Promise<any> => {
    // return GuidesCategoryModel.find();
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
    const [categories, totalCount] = await Promise.all([
      GuidesCategoryModel.find(query)
        .skip(skip)
        .limit(limitNum)
        .sort({ createdAt: -1 }),
      GuidesCategoryModel.countDocuments(query),
    ]);

    return { categories, totalCount };
  },

  getById: (id: string) => {
    return GuidesCategoryModel.findById(id);
  },
};
