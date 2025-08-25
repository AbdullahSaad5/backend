import dealsModel from "@/models/deals.model";
import { Listing, ProductCategory } from "@/models";

export const dealsService = {
  createDeals: async (dealData: {
    dealType: string;
    discountValue: number;
    products?: string[];
    categories?: string[];
    startDate: string;
    endDate: string;
    minPurchaseAmount?: number;
    minQuantity?: number;
    isActive?: boolean;
    selectionType: "products" | "categories";
    image?: string;
  }) => {
    const {
      dealType,
      discountValue,
      products = [],
      categories = [],
      startDate,
      endDate,
      minPurchaseAmount,
      minQuantity,
      isActive,
      selectionType,
      image,
    } = dealData;

    const deal = new dealsModel({
      dealType,
      discountValue,
      products: selectionType === "products" ? products : [],
      categories: selectionType === "categories" ? categories : [],
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      minPurchaseAmount,
      minQuantity,
      isActive,
      selectionType,
      image,
    });

    return await deal.save();
  },

  getDeals: async (options: {
    page?: number;
    limit?: number;
    isActive?: string;
  }) => {
    const { page = 1, limit = 10, isActive } = options;

    const pageNum = Number(page) || 1;
    const limitNum = Number(limit) || 10;
    const skip = (pageNum - 1) * limitNum;

    let filter: any = {};

    if (isActive !== undefined) {
      filter.isActive = isActive === "true";
    }

    const deals = await dealsModel
      .find(filter)
      .populate("products")
      .populate("categories")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum);

    const total = await dealsModel.countDocuments(filter);

    return {
      deals,
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum),
      },
    };
  },
  deleteDeal: async (id: string) => {
    const deletedDeal = await dealsModel.findByIdAndDelete(id);
    return deletedDeal;
  },
  getDealById: async (id: string) => {
    const deal = await dealsModel
      .findById(id)
      .populate("products")
      .populate("categories");

    return deal;
  },
};
