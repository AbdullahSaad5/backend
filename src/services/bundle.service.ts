import { Bundle } from "@/models/bundle.model"; // Import the Bundle model
import { IBundle, IBundleUpdatePayload } from "@/contracts/bundle.contract"; // Import the IBundle contract

export const bundleService = {
  // Add a new bundle
  addBundle: async (bundleData: IBundle) => {
    try {
      const newBundle = new Bundle(bundleData); // Create a new Bundle instance
      await newBundle.save(); // Save the new bundle to the database
      return newBundle; // Return the saved bundle
    } catch (error) {
      console.error("Error adding bundle:", error);
      throw new Error("Failed to add bundle to the database");
    }
  },

  // Get all bundles
  getAllBundles: async () => {
    try {
      return await Bundle.find().populate({
        path: "items",
        populate: [
          { path: "productId", model: "Inventory" },
          { path: "variationId", model: "Variation" },
          { path: "stockId", model: "Stock" },
        ],
      });
    } catch (error) {
      console.error("Error fetching bundles:", error);
      throw new Error("Failed to retrieve bundles from the database");
    }
  },

  getBundleById: async (bundleId: string) => {
    try {
      const bundle = await Bundle.findById(bundleId)
        .populate("items.productId")
        .populate("items.variationId")
        .populate("items.stockId");

      if (!bundle) {
        throw new Error("Bundle not found");
      }

      return bundle;
    } catch (error) {
      console.error("Error fetching bundle:", error);
      throw new Error("Failed to retrieve the bundle");
    }
  },

  // Update a bundle by ID
  updateBundleById: async (bundleId: string, data: IBundleUpdatePayload) => {
    try {
      const updatedBundle = await Bundle.findByIdAndUpdate(bundleId, data, {
        new: true,
      }); // Update the bundle by ID
      if (!updatedBundle) {
        throw new Error("Bundle not found");
      }
      return updatedBundle; // Return the updated bundle
    } catch (error) {
      console.error("Error updating bundle:", error);
      throw new Error("Failed to update the bundle");
    }
  },

  // Delete a bundle by ID
  deleteBundleById: async (bundleId: string) => {
    try {
      const deletedBundle = await Bundle.findByIdAndDelete(bundleId); // Delete the bundle by ID
      if (!deletedBundle) {
        throw new Error("Bundle not found");
      }
      return deletedBundle; // Return the deleted bundle
    } catch (error) {
      console.error("Error deleting bundle:", error);
      throw new Error("Failed to delete the bundle");
    }
  },
};
