import { Bundle } from "@/models/bundle.model"; // Import the Bundle model
import { IBundle, IBundleUpdatePayload } from "@/contracts/bundle.contract"; // Import the IBundle contract

export const bundleService = {
  // Add a new bundle
 addBundle: async (bundleData: IBundle) => {
    // Check for existing bundle name
    const existingBundle = await Bundle.findOne({ name: bundleData.name });
    if (existingBundle) {
      throw new Error("Bundle with this name already exists");
    }

    const newBundle = new Bundle(bundleData);
    await newBundle.save();
    return newBundle;
  },
 

  // Get all bundles
  getAllBundles: async () => {
    try {
      return await Bundle.find()
        .populate("items.productId")
        .populate("items.stockId")
        .populate("items.selectedVariations.variationId");
    } catch (error) {
      console.error("Error fetching bundles:", error);
      throw new Error("Failed to retrieve bundles from the database");
    }
  },

  getAllPublishedBundles: async (condition: Record<string, any>) => {
    try {
      return await Bundle.find(condition)
        .populate("items.productId")
        .populate("items.stockId")
        .populate("items.selectedVariations.variationId");
    } catch (error) {
      console.error("Error fetching published bundles:", error);
      throw new Error("Failed to retrieve published bundles from the database");
    }
  },

  getBundleById: async (bundleId: string) => {
    try {
      const bundle = await Bundle.findById(bundleId)
        .populate("items.productId")
        .populate("items.stockId")
        .populate("items.selectedVariations.variationId");

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
