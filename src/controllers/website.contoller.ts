import { websiteService } from "@/services";
import { Request, Response } from "express";
import { StatusCodes, ReasonPhrases } from "http-status-codes";
import mongoose from "mongoose";

export const websiteController = {
  getFeaturedCategoriesForWebsite: async (req: Request, res: Response) => {
    try {
      const categories = await websiteService.getFeaturedCategoriesForWebsite();
      res.status(StatusCodes.OK).json({ success: true, data: categories });
    } catch (error) {
      console.error("Get Featured Categories Error:", error);
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: "Error getting featured categories",
      });
    }
  },

  // Get all Website listings
  getWebsiteListings: async (req: Request, res: Response) => {
    try {
      // Extract filters from query params
      const {
        searchQuery = "",
        status,
        listingType,
        productCategory,
        startDate,
        endDate,
        isBlocked,
        isFeatured,
        page = "1",
        limit = "10",
      } = req.query;

      console.log("Raw query params:", req.query);

      // Safe parsing and validation
      const filters = {
        searchQuery: searchQuery as string,
        status:
          status && ["draft", "published"].includes(status.toString())
            ? status.toString()
            : undefined,
        listingType:
          listingType &&
          ["product", "part", "bundle"].includes(listingType.toString())
            ? listingType.toString()
            : undefined,
        productCategory: productCategory
          ? productCategory.toString()
          : undefined,
        startDate:
          startDate && !isNaN(Date.parse(startDate as string))
            ? new Date(startDate as string)
            : undefined,
        endDate:
          endDate && !isNaN(Date.parse(endDate as string))
            ? new Date(endDate as string)
            : undefined,
        isBlocked:
          isBlocked === "true"
            ? true
            : isBlocked === "false"
              ? false
              : undefined,
        isFeatured:
          isFeatured === "true"
            ? true
            : isFeatured === "false"
              ? false
              : undefined,
        page: Math.max(parseInt(page as string, 10) || 1, 1),
        limit: parseInt(limit as string, 10) || 10,
      };

      console.log("Parsed filters:", filters);

      // Call the service to get Website listings
      const result = await websiteService.allWebsiteListings(filters);

      // Return the results
      res.status(200).json({
        success: true,
        message: "Products fetched successfully",
        data: result,
      });
    } catch (error: any) {
      console.error("Error fetching Website listings:", error);
      res.status(500).json({
        success: false,
        message: error.message || "Error fetching Website listings",
      });
    }
  },

  // Get single Website product by ID
  getWebsiteProductById: async (req: Request, res: Response) => {
    try {
      const { id } = req.params;

      // Validate ID
      if (!mongoose.isValidObjectId(id)) {
        return res.status(400).json({
          success: false,
          message: "Invalid product ID",
        });
      }

      // Call the service to get the website product
      const result = await websiteService.getWebsiteProductById(id);

      if (!result) {
        return res.status(404).json({
          success: false,
          message: "Product not found or not published to website",
        });
      }

      // Return the result
      res.status(200).json({
        success: true,
        message: "Product fetched successfully",
        data: result,
      });
    } catch (error: any) {
      console.error("Error fetching Website product:", error);
      res.status(500).json({
        success: false,
        message: error.message || "Error fetching Website product",
      });
    }
  },
};
