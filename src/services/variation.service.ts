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
      const { searchQuery, inventoryId, isSelected, page = 1, limit = 10 } = filters;

      const pageNumber = Math.max(parseInt(page, 10) || 1, 1);
      const limitNumber = parseInt(limit, 10) || 10;
      const skip = (pageNumber - 1) * limitNumber;

      const query: any = {};

      // ✅ Validate inventoryId (if provided)
      if (inventoryId && mongoose.Types.ObjectId.isValid(inventoryId)) {
        query.inventoryId = new mongoose.Types.ObjectId(inventoryId);
      }

      if (isSelected !== undefined) {
        query.isSelected = isSelected === "true";
      }

      // ✅ Dynamically search inside `attributes` (for any key)
      if (searchQuery) {
        query.$expr = {
          $gt: [
            {
              $size: {
                $filter: {
                  input: { $objectToArray: "$attributes" }, // Convert Map to Array
                  as: "attr",
                  cond: {
                    $regexMatch: {
                      input: { $toString: "$$attr.v" }, // Convert values to string
                      regex: searchQuery,
                      options: "i", // Case insensitive
                    },
                  },
                },
              },
            },
            0,
          ],
        };
      }
      // ✅ Fetch variations
      const variations = await Variation.find(query).skip(skip).limit(limitNumber);

      // ✅ Count total variations
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
