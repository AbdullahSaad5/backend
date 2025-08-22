import { websiteService } from "@/services";
import { Request, Response } from "express";
import { StatusCodes, ReasonPhrases } from "http-status-codes";
import mongoose from "mongoose";
import crypto from "crypto";

// Helper function to generate ETag from data
const generateETag = (data: any): string => {
  const dataString = JSON.stringify(data);
  return crypto.createHash("md5").update(dataString).digest("hex");
};

// Helper function to check if client has fresh data
const isClientDataFresh = (req: Request, etag: string): boolean => {
  const ifNoneMatch = req.headers["if-none-match"];
  return ifNoneMatch === etag;
};

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

  getFeaturedListingsForWebsite: async (req: Request, res: Response) => {
    try {
      const categoriesWithListings = await websiteService.getFeaturedListingsForWebsite();
      res.status(StatusCodes.OK).json({ success: true, data: categoriesWithListings });
    } catch (error) {
      console.error("Get Featured Listings Error:", error);
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: "Error getting featured listings",
      });
    }
  },

  getFeaturedListingsByCategoryId: async (req: Request, res: Response) => {
    try {
      const { categoryId } = req.params;

      // Validate categoryId
      if (!mongoose.isValidObjectId(categoryId)) {
        return res.status(StatusCodes.BAD_REQUEST).json({
          success: false,
          message: "Invalid category ID",
        });
      }

      const result = await websiteService.getFeaturedListingsByCategoryId(categoryId);
      console.log("Featured Listings Result:", result);
      res.status(StatusCodes.OK).json({ success: true, data: result });
    } catch (error: any) {
      console.error("Get Featured Listings By Category Error:", error);

      if (error.message === "Category not found or not featured") {
        return res.status(StatusCodes.NOT_FOUND).json({
          success: false,
          message: error.message,
        });
      }

      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: "Error getting featured listings for category",
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
        status: status && ["draft", "published"].includes(status.toString()) ? status.toString() : undefined,
        listingType:
          listingType && ["product", "part", "bundle"].includes(listingType.toString())
            ? listingType.toString()
            : undefined,
        productCategory: productCategory ? productCategory.toString() : undefined,
        startDate: startDate && !isNaN(Date.parse(startDate as string)) ? new Date(startDate as string) : undefined,
        endDate: endDate && !isNaN(Date.parse(endDate as string)) ? new Date(endDate as string) : undefined,
        isBlocked: isBlocked === "true" ? true : isBlocked === "false" ? false : undefined,
        isFeatured: isFeatured === "true" ? true : isFeatured === "false" ? false : undefined,
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

  // Get filtered Website listings with category-specific filters
  getFilteredWebsiteListings: async (req: Request, res: Response) => {
    try {
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
        // Category-specific filters
        priceRange,
        brand,
        condition,
        inStock,
        attributes,
        sortBy = "createdAt",
        sortOrder = "desc",
      } = req.body;

      console.log("Filter request body:", req.body);

      // Safe parsing and validation
      const filters = {
        searchQuery: searchQuery as string,
        status: status && ["draft", "published"].includes(status.toString()) ? status.toString() : undefined,
        listingType:
          listingType && ["product", "part", "bundle"].includes(listingType.toString())
            ? listingType.toString()
            : undefined,
        productCategory: productCategory ? productCategory.toString() : undefined,
        startDate: startDate && !isNaN(Date.parse(startDate as string)) ? new Date(startDate as string) : undefined,
        endDate: endDate && !isNaN(Date.parse(endDate as string)) ? new Date(endDate as string) : undefined,
        isBlocked: isBlocked === "true" ? true : isBlocked === "false" ? false : undefined,
        isFeatured: isFeatured === "true" ? true : isFeatured === "false" ? false : undefined,
        page: Math.max(parseInt(page as string, 10) || 1, 1),
        limit: parseInt(limit as string, 10) || 10,
        // Category-specific filters
        priceRange: priceRange
          ? {
              min: priceRange.min ? parseFloat(priceRange.min) : undefined,
              max: priceRange.max ? parseFloat(priceRange.max) : undefined,
            }
          : undefined,
        brand: brand ? (Array.isArray(brand) ? brand : [brand]) : undefined,
        condition: condition ? (Array.isArray(condition) ? condition : [condition]) : undefined,
        inStock: inStock !== undefined ? inStock : undefined,
        attributes: attributes || {},
        sortBy: sortBy as string,
        sortOrder: sortOrder as "asc" | "desc",
      };

      console.log("Parsed filters:", filters);

      // Call the service to get filtered Website listings
      const result = await websiteService.getFilteredWebsiteListings(filters);

      // Return the results
      res.status(200).json({
        success: true,
        message: "Filtered products fetched successfully",
        data: result,
      });
    } catch (error: any) {
      console.error("Error fetching filtered Website listings:", error);
      res.status(500).json({
        success: false,
        message: error.message || "Error fetching filtered Website listings",
      });
    }
  },

  // Get available filters for a specific category
  getCategoryFilters: async (req: Request, res: Response) => {
    try {
      const { categoryId } = req.params;

      // Validate categoryId
      if (!mongoose.isValidObjectId(categoryId)) {
        return res.status(StatusCodes.BAD_REQUEST).json({
          success: false,
          message: "Invalid category ID",
        });
      }

      const filters = await websiteService.getCategoryFilters(categoryId);

      // Generate ETag for the response
      const etag = generateETag(filters);

      // Check if client has fresh data
      if (isClientDataFresh(req, etag)) {
        return res.status(StatusCodes.NOT_MODIFIED).end();
      }

      // Set cache headers
      res.set({
        ETag: etag,
        "Cache-Control": "public, max-age=300", // Cache for 5 minutes
        "Last-Modified": new Date().toUTCString(),
      });

      res.status(StatusCodes.OK).json({ success: true, data: filters });
    } catch (error: any) {
      console.error("Get Category Filters Error:", error);

      if (error.message === "Category not found") {
        return res.status(StatusCodes.NOT_FOUND).json({
          success: false,
          message: error.message,
        });
      }

      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: "Error getting category filters",
      });
    }
  },

  // Get all available filters across categories
  getAllAvailableFilters: async (req: Request, res: Response) => {
    try {
      const filters = await websiteService.getAllAvailableFilters();

      // Generate ETag for the response
      const etag = generateETag(filters);

      // Check if client has fresh data
      if (isClientDataFresh(req, etag)) {
        return res.status(StatusCodes.NOT_MODIFIED).end();
      }

      // Set cache headers
      res.set({
        ETag: etag,
        "Cache-Control": "public, max-age=300", // Cache for 5 minutes
        "Last-Modified": new Date().toUTCString(),
      });

      res.status(StatusCodes.OK).json({ success: true, data: filters });
    } catch (error) {
      console.error("Get All Available Filters Error:", error);
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: "Error getting available filters",
      });
    }
  },
};
