import { Listing } from "@/models/listing.model";
import { Variation } from "@/models/variation.model";
import mongoose from "mongoose";

export const variationService = {
  getVariationsByInventoryId: async (inventoryId: string) => {
    if (!inventoryId) {
      throw new Error("Missing inventory ID");
    }

    const variations = await Variation.find({ inventoryId });

    if (!variations.length) {
      throw new Error("No variations found for this inventory ID");
    }

    return variations;
  },

  searchAndFilterVariations: async (filters: any) => {
    try {
      const { searchQuery = "", inventoryId, isSelected, startDate, endDate, page = 1, limit = 10 } = filters;

      const pageNumber = Math.max(parseInt(page, 10) || 1, 1);
      const limitNumber = parseInt(limit, 10) || 10;
      const skip = (pageNumber - 1) * limitNumber;

      // Build the query dynamically
      const query: any = {};

      // ✅ Validate and add inventoryId only if it's a valid ObjectId
      if (inventoryId && mongoose.Types.ObjectId.isValid(inventoryId)) {
        query.inventoryId = new mongoose.Types.ObjectId(inventoryId);
      }

      if (isSelected !== undefined) {
        query.isSelected = isSelected === "true";
      }

      if (searchQuery) {
        query.$or = [
          { "attributes.Color": { $regex: searchQuery, $options: "i" } },
          { "attributes.Size": { $regex: searchQuery, $options: "i" } },
        ];
      }

      if (startDate || endDate) {
        const dateFilter: any = {};
        if (startDate && !isNaN(Date.parse(startDate))) dateFilter.$gte = new Date(startDate);
        if (endDate && !isNaN(Date.parse(endDate))) dateFilter.$lte = new Date(endDate);
        if (Object.keys(dateFilter).length > 0) query.createdAt = dateFilter;
      }

      const variations = await Variation.find(query).skip(skip).limit(limitNumber);

      const totalVariations = await Variation.countDocuments(query);

      return {
        variations,
        pagination: {
          totalVariations,
          currentPage: pageNumber,
          totalPages: Math.ceil(totalVariations / limitNumber),
          perPage: limitNumber,
        },
      };
    } catch (error) {
      console.error("❌ Error fetching variations:", error);
      throw new Error("Error fetching variations");
    }
  },
};
