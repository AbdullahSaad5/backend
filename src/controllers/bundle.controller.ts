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
      const bundleData = req.body;
      const newBundle = await bundleService.addBundle(bundleData);
      return res.status(StatusCodes.CREATED).json({
        success: true,
        message: "Bundle added successfully",
        data: newBundle,
      });
    } catch (error: any) {
      // Handle duplicate name error
      if (error.message === "Bundle name already exists") {
        return res.status(StatusCodes.CONFLICT).json({
          success: false,
          message: error.message,
        });
      }
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
      const { variations } = req.body;

      if (!Array.isArray(variations) || variations.length === 0) {
        return res.status(400).json({ message: "No bundle variations provided" });
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
            variationId: mongoose.Types.ObjectId.isValid(item.variationId) ? item.variationId : undefined,
            quantityOffered: typeof item.quantityOffered === "number" ? item.quantityOffered : undefined,
          }));

        const newId = new mongoose.Types.ObjectId();

        variationsToStore.push({
          _id: newId,
          tempId,
          // bundleId,
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
  // updateBundleById: async (req: Request, res: Response) => {
  //   try {
  //     const bundleId = req.params.id; // Get the bundle ID from the request params
  //     const data = req.body; // Get updated data from the request body
  //     const updatedBundle = await bundleService.updateBundleById(bundleId, data); // Call service to update the bundle
  //     if (!updatedBundle) {
  //       return res.status(StatusCodes.NOT_FOUND).json({ message: "Bundle not found" });
  //     }
  //     return res.status(StatusCodes.OK).json({
  //       success: true,
  //       message: "Bundle updated successfully",
  //       bundle: updatedBundle,
  //     });
  //   } catch (error) {
  //     console.error("Error updating bundle:", error);
  //     return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
  //       success: false,
  //       message: "Error updating bundle",
  //     });
  //   }
  // },
  updateBundleById: async (req: Request, res: Response) => {
    try {
      const bundleId = req.params.id;
      const data = req.body;
      const updatedBundle = await bundleService.updateBundleById(bundleId, data);
      return res.status(StatusCodes.OK).json({
        success: true,
        message: "Bundle updated successfully",
        bundle: updatedBundle,
      });
    } catch (error: any) {
      // Handle duplicate name error
      if (error.message === "Bundle name already exists") {
        return res.status(StatusCodes.CONFLICT).json({
          success: false,
          message: error.message,
        });
      }
      // Handle not found error
      if (error.message === "Bundle not found") {
        return res.status(StatusCodes.NOT_FOUND).json({
          success: false,
          message: error.message,
        });
      }
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
