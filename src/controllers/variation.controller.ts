import { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import { variationService } from "@/services/variation.service";
import { Product } from "@/models/product.model";
import {
  AmazonVariation,
  EbayVariation,
  WebsiteVariation,
} from "@/models/variation.model";

export const variationController = {
  // Get parts by platform
  getPartsByPlatform: async (req: Request, res: Response) => {
    try {
      const { platform } = req.params;

      if (!platform) {
        return res.status(StatusCodes.BAD_REQUEST).json({
          success: false,
          message: "Platform is required",
        });
      }

      const parts = await variationService.getPartsByPlatform(platform);

      res.status(StatusCodes.OK).json({
        success: true,
        message: `Parts fetched successfully for platform: ${platform}`,
        data: parts,
      });
    } catch (error: any) {
      console.error("Error fetching parts:", error.message);
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: error.message || "Error fetching parts",
      });
    }
  },

  // Get all variations
  getAllVariationsByPlatform: async (_req: Request, res: Response) => {
    try {
      // Define platform keys
      const platforms = ["amazon", "ebay", "website"];
      const results: Record<string, any> = {};

      // Loop through platforms to fetch data
      for (const platform of platforms) {
        const platformKey = `platformDetails.${platform}.prodTechInfo`;

        // Aggregate unique parts for the platform
        const parts = await Product.aggregate([
          {
            $project: {
              cpu: `$${platformKey}.processor`,
              ram: `$${platformKey}.ramSize`,
              storage: `$${platformKey}.storageType`,
              graphics: `$${platformKey}.gpu`,
              height: `$${platformKey}.height`,
              length: `$${platformKey}.length`,
              width: `$${platformKey}.width`,
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

        results[platform] = parts[0] || {
          cpu: [],
          ram: [],
          storage: [],
          graphics: [],
          height: [],
          length: [],
          width: [],
        };
      }

      // Respond with consolidated variations by platform
      res.status(StatusCodes.OK).json({
        success: true,
        message: "Fetched variations by platform successfully",
        data: results,
      });
    } catch (error: any) {
      console.error("Error fetching variations by platform:", error.message);
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: "Error fetching variations by platform",
      });
    }
  },
  getUnifiedParts: async (_req: Request, res: Response) => {
    try {
      // Aggregating parts across all platforms
      const parts = await Product.aggregate([
        {
          $project: {
            amazon: "$platformDetails.amazon.prodTechInfo",
            ebay: "$platformDetails.ebay.prodTechInfo",
            website: "$platformDetails.website.prodTechInfo",
          },
        },
        {
          $project: {
            cpu: {
              $concatArrays: [
                {
                  $cond: [
                    { $isArray: "$amazon.processor" },
                    "$amazon.processor",
                    ["$amazon.processor"],
                  ],
                },
                {
                  $cond: [
                    { $isArray: "$ebay.processor" },
                    "$ebay.processor",
                    ["$ebay.processor"],
                  ],
                },
                {
                  $cond: [
                    { $isArray: "$website.processor" },
                    "$website.processor",
                    ["$website.processor"],
                  ],
                },
              ],
            },
            ram: {
              $concatArrays: [
                {
                  $cond: [
                    { $isArray: "$amazon.ramSize" },
                    "$amazon.ramSize",
                    ["$amazon.ramSize"],
                  ],
                },
                {
                  $cond: [
                    { $isArray: "$ebay.ramSize" },
                    "$ebay.ramSize",
                    ["$ebay.ramSize"],
                  ],
                },
                {
                  $cond: [
                    { $isArray: "$website.ramSize" },
                    "$website.ramSize",
                    ["$website.ramSize"],
                  ],
                },
              ],
            },
            storage: {
              $concatArrays: [
                {
                  $cond: [
                    { $isArray: "$amazon.storageType" },
                    "$amazon.storageType",
                    ["$amazon.storageType"],
                  ],
                },
                {
                  $cond: [
                    { $isArray: "$ebay.storageType" },
                    "$ebay.storageType",
                    ["$ebay.storageType"],
                  ],
                },
                {
                  $cond: [
                    { $isArray: "$website.storageType" },
                    "$website.storageType",
                    ["$website.storageType"],
                  ],
                },
              ],
            },
            graphics: {
              $concatArrays: [
                {
                  $cond: [
                    { $isArray: "$amazon.gpu" },
                    "$amazon.gpu",
                    ["$amazon.gpu"],
                  ],
                },
                {
                  $cond: [
                    { $isArray: "$ebay.gpu" },
                    "$ebay.gpu",
                    ["$ebay.gpu"],
                  ],
                },
                {
                  $cond: [
                    { $isArray: "$website.gpu" },
                    "$website.gpu",
                    ["$website.gpu"],
                  ],
                },
              ],
            },
            height: {
              $concatArrays: [
                {
                  $cond: [
                    { $isArray: "$amazon.height" },
                    "$amazon.height",
                    ["$amazon.height"],
                  ],
                },
                {
                  $cond: [
                    { $isArray: "$ebay.height" },
                    "$ebay.height",
                    ["$ebay.height"],
                  ],
                },
                {
                  $cond: [
                    { $isArray: "$website.height" },
                    "$website.height",
                    ["$website.height"],
                  ],
                },
              ],
            },
            length: {
              $concatArrays: [
                {
                  $cond: [
                    { $isArray: "$amazon.length" },
                    "$amazon.length",
                    ["$amazon.length"],
                  ],
                },
                {
                  $cond: [
                    { $isArray: "$ebay.length" },
                    "$ebay.length",
                    ["$ebay.length"],
                  ],
                },
                {
                  $cond: [
                    { $isArray: "$website.length" },
                    "$website.length",
                    ["$website.length"],
                  ],
                },
              ],
            },
            width: {
              $concatArrays: [
                {
                  $cond: [
                    { $isArray: "$amazon.width" },
                    "$amazon.width",
                    ["$amazon.width"],
                  ],
                },
                {
                  $cond: [
                    { $isArray: "$ebay.width" },
                    "$ebay.width",
                    ["$ebay.width"],
                  ],
                },
                {
                  $cond: [
                    { $isArray: "$website.width" },
                    "$website.width",
                    ["$website.width"],
                  ],
                },
              ],
            },
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
            cpu: {
              $reduce: {
                input: "$cpu",
                initialValue: [],
                in: { $setUnion: ["$$value", "$$this"] },
              },
            },
            ram: {
              $reduce: {
                input: "$ram",
                initialValue: [],
                in: { $setUnion: ["$$value", "$$this"] },
              },
            },
            storage: {
              $reduce: {
                input: "$storage",
                initialValue: [],
                in: { $setUnion: ["$$value", "$$this"] },
              },
            },
            graphics: {
              $reduce: {
                input: "$graphics",
                initialValue: [],
                in: { $setUnion: ["$$value", "$$this"] },
              },
            },
            height: {
              $reduce: {
                input: "$height",
                initialValue: [],
                in: { $setUnion: ["$$value", "$$this"] },
              },
            },
            length: {
              $reduce: {
                input: "$length",
                initialValue: [],
                in: { $setUnion: ["$$value", "$$this"] },
              },
            },
            width: {
              $reduce: {
                input: "$width",
                initialValue: [],
                in: { $setUnion: ["$$value", "$$this"] },
              },
            },
          },
        },
      ]);

      const result = parts[0] || {
        cpu: [],
        ram: [],
        storage: [],
        graphics: [],
        height: [],
        length: [],
        width: [],
      };

      res.status(StatusCodes.OK).json({
        success: true,
        message: "Fetched all parts successfully",
        data: result,
      });
    } catch (error: any) {
      console.error("Error fetching unified parts:", error.message);
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: "Error fetching unified parts",
      });
    }
  },
};
