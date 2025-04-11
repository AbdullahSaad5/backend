import { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import { variationService } from "@/services/variation.service";
import { Listing } from "@/models/listing.model";

export const variationController = {
  getVariationsByInventoryId: async (req: Request, res: Response) => {
    try {
      const { id } = req.params;

      if (!id) {
        return res.status(400).json({ message: "Missing inventory ID in URL" });
      }

      const variations = await variationService.getVariationsByInventoryId(id);

      res.status(200).json({
        message: "Variations retrieved successfully",
        variations,
      });
    } catch (error: any) {
      console.error("❌ Error fetching variations:", error);
      res.status(404).json({ message: error.message || "Internal server error" });
    }
  },

  searchAndFilterVariations: async (req: Request, res: Response) => {
    try {
      const { searchQuery = "", inventoryId, isSelected, startDate, endDate, page = "1", limit = "10" } = req.query;

      const filters = {
        searchQuery: searchQuery as string,
        inventoryId: inventoryId ? inventoryId.toString() : undefined,
        isSelected: isSelected,
        startDate: startDate && !isNaN(Date.parse(startDate as string)) ? new Date(startDate as string) : undefined,
        endDate: endDate && !isNaN(Date.parse(endDate as string)) ? new Date(endDate as string) : undefined,
        page: Math.max(parseInt(page as string, 10) || 1, 1),
        limit: parseInt(limit as string, 10) || 10,
      };

      const result = await variationService.searchAndFilterVariations(filters);

      res.status(200).json({
        success: true,
        message: "Variations retrieved successfully",
        data: result,
      });
    } catch (error) {
      console.error("❌ Error in search and filter:", error);
      res.status(500).json({
        success: false,
        message: "Error in search and filter variations",
      });
    }
  },
};
