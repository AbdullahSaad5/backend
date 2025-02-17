import { Request, Response } from "express";
import mongoose from "mongoose";
import { stockService } from "@/services/stock.service";

export const stockController = {
  // 📌 Add New Stock Purchase
  addStock: async (req: Request, res: Response) => {
    try {
      const { productId} = req.body;

      if (!productId ) {
        return res
          .status(400)
          .json({ message: "Product ID  is required" });
      }

      if (
        !mongoose.Types.ObjectId.isValid(productId) 
        
      ) {
        return res
          .status(400)
          .json({ message: "Invalid Product ID  format" });
      }

      const result = await stockService.addStock(req.body);
      res.status(201).json(result);
    } catch (error: any) {
      if (error.code === 11000) {
        return res.status(400).json({
          message:
            "Duplicate stock entry detected. Ensure productId is correct.",
          error,
        });
      }
      res.status(500).json({ message: "Error processing stock", error });
    }
  },

  // 📌 Get All Stock Purchases for a Product
  getStockByProduct: async (req: Request, res: Response) => {
    try {
      const { productId } = req.params;

      if (!mongoose.Types.ObjectId.isValid(productId)) {
        return res.status(400).json({ message: "Invalid product ID format" });
      }

      const stocks = await stockService.getStockByProduct(productId);
      if (stocks.length === 0) {
        return res
          .status(404)
          .json({ message: "No stock records found for this product" });
      }

      res.status(200).json(stocks);
    } catch (error) {
      res.status(500).json({ message: "Internal Server Error", error });
    }
  },

  // 📌 Get Stock Summary
  getStockSummary: async (req: Request, res: Response) => {
    try {
      const { productId } = req.params;

      if (!mongoose.Types.ObjectId.isValid(productId)) {
        return res.status(400).json({ message: "Invalid product ID format" });
      }

      const summary = await stockService.getStockSummary(productId);

      res.status(200).json(summary);
    } catch (error) {
      res.status(500).json({ message: "Internal Server Error", error });
    }
  },

  deleteStock: async (req: Request, res: Response) => {
    try {
      const { stockId } = req.params;

      if (!mongoose.Types.ObjectId.isValid(stockId)) {
        return res.status(400).json({ message: "Invalid stock ID format" });
      }

      const stock = await stockService.deleteStock(stockId);
      if (!stock) {
        return res.status(404).json({ message: "Stock record not found" });
      }

      res.status(200).json({ message: "Stock record deleted successfully" });
    } catch (error) {
      res.status(500).json({ message: "Internal Server Error", error });
    }
  },
  bulkUpdateStockCost: async (req: Request, res: Response) => {
    try {
      const {
        stockIds,
        costPricePerUnit,
        purchasePricePerUnit,
        retailPricePerUnit,
      } = req.body;

      if (!Array.isArray(stockIds) || stockIds.length === 0) {
        return res.status(400).json({ message: "stockIds array is required" });
      }

      if (!costPricePerUnit || !purchasePricePerUnit || !retailPricePerUnit) {
        return res
          .status(400)
          .json({ message: "All cost values are required" });
      }

      // Validate each stockId format
      for (const stockId of stockIds) {
        if (!mongoose.Types.ObjectId.isValid(stockId)) {
          return res
            .status(400)
            .json({ message: `Invalid stockId: ${stockId}` });
        }
      }

      // Check if all stockIds exist in the database
      const existingStocks = await stockService.getExistingStocks(stockIds);
      if (existingStocks.length !== stockIds.length) {
        return res
          .status(404)
          .json({ message: "One or more stock records not found" });
      }

      // Perform bulk update
      const result = await stockService.bulkUpdateStockCost(
        stockIds,
        costPricePerUnit,
        purchasePricePerUnit,
        retailPricePerUnit
      );

      return res
        .status(200)
        .json({ message: "Stock costs updated successfully", result });
    } catch (error) {
      res.status(500).json({ message: "Internal Server Error", error });
    }
  },
};
