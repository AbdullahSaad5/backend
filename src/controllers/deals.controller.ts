import { Request, Response } from "express";
import { StatusCodes, ReasonPhrases } from "http-status-codes";
import { dealsService } from "@/services/deals.service";
import { Listing, ProductCategory } from "@/models";
export const dealsController = {
  addDeals: async (req: Request, res: Response) => {
    try {
      const {
        dealType,
        discountValue,
        products,
        categories,
        startDate,
        endDate,
        minPurchaseAmount,
        minQuantity,
        isActive,
        selectionType,
        image,
      } = req.body;

      const savedDeal = await dealsService.createDeals({
        dealType,
        discountValue,
        products,
        categories,
        startDate,
        endDate,
        minPurchaseAmount,
        minQuantity,
        isActive,
        selectionType,
        image,
      });

      res.status(StatusCodes.OK).json({
        success: true,
        data: savedDeal,
      });
    } catch (error: any) {
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: "Error saving deal",
        error: error instanceof Error ? error.message : error,
      });
    }
  },

  //       //   if (selectionType === "products" && products && products.length > 0) {
  //       //     const existingProducts = await Listing.find({ _id: { $in: products } });
  //       //     if (existingProducts.length !== products.length) {
  //       //       return res.status(400).json({
  //       //         success: false,
  //       //         message: "One or more products not found",
  //       //       });
  //       //     }
  //       //   }

  //       //   if (
  //       //     selectionType === "categories" &&
  //       //     categories &&
  //       //     categories.length > 0
  //       //   ) {
  //       //     const existingCategories = await ProductCategory.find({
  //       //       _id: { $in: categories },
  //       //     });
  //       //     if (existingCategories.length !== categories.length) {
  //       //       return res.status(400).json({
  //       //         success: false,
  //       //         message: "One or more categories not found",
  //       //       });
  //       //     }
  //       //   }

  getDeals: async (req: Request, res: Response) => {
    try {
      const { page, limit, isActive } = req.query;

      const result = await dealsService.getDeals({
        page: page ? Number(page) : 1,
        limit: limit ? Number(limit) : 10,
        isActive: isActive as string,
      });

      res.status(StatusCodes.OK).json({
        success: true,
        data: result.deals,
        pagination: result.pagination,
      });
    } catch (error: any) {
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: "Error fetching deals",
        error: error instanceof Error ? error.message : error,
      });
    }
  },
  deleteDeal: async (req: Request, res: Response) => {
    try {
      const { id } = req.params;

      const deleted = await dealsService.deleteDeal(id);

      if (!deleted) {
        return res.status(404).json({ message: "Deal not found" });
      }

      return res.status(StatusCodes.OK).json({
        message: "Deal deleted successfully",
        deal: deleted,
      });
    } catch (error) {
      console.error("Error deleting deal:", error);
      res
        .status(StatusCodes.INTERNAL_SERVER_ERROR)
        .json({ message: "Internal server error" });
    }
  },
  getDealById: async (req: Request, res: Response) => {
    try {
      const { id } = req.params;

      const deal = await dealsService.getDealById(id);

      if (!deal) {
        return res.status(404).json({ message: "Deal not found" });
      }

      return res.status(StatusCodes.OK).json(deal);
    } catch (error) {
      console.error("Error fetching deal:", error);
      res
        .status(StatusCodes.INTERNAL_SERVER_ERROR)
        .json({ message: "Internal server error" });
    }
  },
};
