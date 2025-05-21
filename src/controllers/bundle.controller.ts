import { Variation } from "@/models";
import { Bundle } from "@/models/bundle.model";
import { bundleService } from "@/services"; // Assuming you have a bundle service
import { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import mongoose from "mongoose";

export const bundleController = {
  // Add a new bundle
  addBundle: async (req: Request, res: Response) => {
    try {
      const bundleData = req.body; // Destructure bundle details from the request body
      console.log("bundleData in controller : ", bundleData);
      const newBundle = await bundleService.addBundle(bundleData); // Call the service to add the bundle
      return res.status(StatusCodes.CREATED).json({
        success: true,
        message: "Bundle added successfully",
        data: newBundle,
      });
    } catch (error) {
      console.error("Error adding bundle:", error);
      return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: "Error adding bundle",
      });
    }
  },

  // Get all bundles
  getAllBundles: async (req: Request, res: Response) => {
    try {
      const bundles = await bundleService.getAllBundles(); // Call service to get all bundles
      return res.status(StatusCodes.OK).json({
        success: true,
        bundles,
      });
    } catch (error) {
      console.error("Error fetching all bundles:", error);
      return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: "Error fetching all bundles",
      });
    }
  },
  getAllPublishedBundles: async (req: Request, res: Response) => {
    try {
      const publishedBundles = await bundleService.getAllPublishedBundles({ status: "published" }); // Call service to get all bundles
      return res.status(StatusCodes.OK).json({
        success: true,
        publishedBundles,
      });
    } catch (error) {
      console.error("Error fetching all published bundles:", error);
      return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: "Error fetching all published bundles",
      });
    }
  },
  storeBundleCreatedVariations: async (req: Request, res: Response) => {
    try {
      const { bundleId, variations } = req.body;

      if (!bundleId || !mongoose.Types.ObjectId.isValid(bundleId)) {
        return res.status(400).json({ message: "Invalid or missing bundle ID" });
      }

      if (!Array.isArray(variations) || variations.length === 0) {
        return res.status(400).json({ message: "No bundle variations provided" });
      }

      const bundleItem = await Bundle.findById(bundleId);
      if (!bundleItem) {
        return res.status(404).json({ message: "Bundle not found" });
      }

      if (bundleItem.status !== "published") {
        return res.status(400).json({ message: "Variations are not allowed for draft bundle item" });
      }

      const variationsToStore = [];
      const tempIdMap = [];

      for (const v of variations) {
        const { tempId, isBundleVariation, variations: nestedVariations } = v;

        if (!tempId || !Array.isArray(nestedVariations)) continue;

        const cleanedNested = nestedVariations
          .filter((item) => item.stockId && mongoose.Types.ObjectId.isValid(item.stockId))
          .map((item) => ({
            stockId: item.stockId,
            variationId: Array.isArray(item.variationId)
              ? item.variationId.filter((id: string) => mongoose.Types.ObjectId.isValid(id))
              : undefined,
          }));

        const newId = new mongoose.Types.ObjectId();

        variationsToStore.push({
          _id: newId,
          tempId,
          bundleId,
          variations: cleanedNested,
          isSelected: true,
          isBundleVariation: !!isBundleVariation,
        });

        tempIdMap.push({ tempId, id: newId });
      }

      if (variationsToStore.length === 0) {
        return res.status(400).json({ message: "No valid variations to store" });
      }

      await Variation.insertMany(variationsToStore);

      res.status(201).json({
        message: "Bundle variations stored successfully",
        variations: tempIdMap,
      });
    } catch (error) {
      console.error("❌ Error saving bundle variations:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  },
  // Get a bundle by ID
  getBundleById: async (req: Request, res: Response) => {
    try {
      const bundleId = req.params.id; // Get the bundle ID from the request params
      const bundle = await bundleService.getBundleById(bundleId); // Call service to fetch bundle by ID
      if (!bundle) {
        return res.status(StatusCodes.NOT_FOUND).json({ message: "Bundle not found" });
      }
      return res.status(StatusCodes.OK).json({
        success: true,
        bundle,
      });
    } catch (error) {
      console.error("Error fetching bundle:", error);
      return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: "Error fetching bundle",
      });
    }
  },

  // Update a bundle by ID
  updateBundleById: async (req: Request, res: Response) => {
    try {
      const bundleId = req.params.id; // Get the bundle ID from the request params
      const data = req.body; // Get updated data from the request body
      const updatedBundle = await bundleService.updateBundleById(bundleId, data); // Call service to update the bundle
      if (!updatedBundle) {
        return res.status(StatusCodes.NOT_FOUND).json({ message: "Bundle not found" });
      }
      return res.status(StatusCodes.OK).json({
        success: true,
        message: "Bundle updated successfully",
        bundle: updatedBundle,
      });
    } catch (error) {
      console.error("Error updating bundle:", error);
      return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: "Error updating bundle",
      });
    }
  },

  // Delete a bundle by ID
  deleteBundleById: async (req: Request, res: Response) => {
    try {
      const bundleId = req.params.id; // Get the bundle ID from the request params
      const deletedBundle = await bundleService.deleteBundleById(bundleId); // Call service to delete the bundle
      if (!deletedBundle) {
        return res.status(StatusCodes.NOT_FOUND).json({ message: "Bundle not found" });
      }
      return res.status(StatusCodes.OK).json({
        success: true,
        message: "Bundle deleted successfully",
      });
    } catch (error) {
      console.error("Error deleting bundle:", error);
      return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: "Error deleting bundle",
      });
    }
  },
};
