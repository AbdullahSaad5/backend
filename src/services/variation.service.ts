import { Product } from "@/models/product.model";
import { Variation } from "@/models/variation.model";

export const variationService = {
  getPartsByPlatform: async (platform: string) => {
    try {
      let productKey: string;

      // Map platform to the corresponding field in the schema
      switch (platform.toLowerCase()) {
        case "amazon":
          productKey = "platformDetails.amazon.prodTechInfo";
          break;
        case "ebay":
          productKey = "platformDetails.ebay.prodTechInfo";
          break;
        case "website":
          productKey = "platformDetails.website.prodTechInfo";
          break;
        default:
          throw new Error("Invalid platform");
      }

      // Fetch distinct parts from the product schema
      const parts = await Product.aggregate([
        {
          $project: {
            cpu: `$${productKey}.processor`,
            ram: `$${productKey}.ramSize`,
            storage: `$${productKey}.storageType`,
            graphics: `$${productKey}.gpu`,
            height: `$${productKey}.height`,
            length: `$${productKey}.length`,
            width: `$${productKey}.width`,
          },
        },
        {
          $group: {
            _id: null,
            cpu: { $addToSet: "$cpu" },
            ram: { $addToSet: "$ram" },
            storage: { $addToSet: "$storage" },
            graphics: { $addToSet: "$graphics" },
            height: { $addToSet: "$height" },
            length: { $addToSet: "$length" },
            width: { $addToSet: "$width" },
          },
        },
        {
          $project: {
            _id: 0,
            cpu: 1,
            ram: 1,
            storage: 1,
            graphics: 1,
            height: 1,
            length: 1,
            width: 1,
          },
        },
      ]);

      return parts[0] || {};
    } catch (error: any) {
      console.error("Error fetching parts by platform:", error.message);
      throw new Error("Unable to fetch parts");
    }
  },

  createVariation: async (variationData: any) => {
    return new Variation(variationData).save();
  },
  updateVariation: async (variationId: string, updateData: any) => {
    try {
      return await Variation.findByIdAndUpdate(variationId, updateData, {
        new: true, // Return the updated document
      });
    } catch (error: any) {
      throw new Error("Error updating variation: " + error.message);
    }
  },

  getVariationsByProduct: async (productId: string) => {
    return Variation.find({ productId });
  },

  deleteVariation: async (variationId: string) => {
    try {
      // Use Mongoose's findByIdAndDelete to delete the variation by its ID
      return await Variation.findByIdAndDelete(variationId);
    } catch (error: any) {
      throw new Error("Error deleting variation: " + error.message);
    }
  },
};
