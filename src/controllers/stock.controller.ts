import { Request, Response } from "express";
import mongoose from "mongoose";
import { stockService } from "@/services/stock.service";

export const stockController = {
  // 📌 Add New Stock Purchase
  addStock: async (req: Request, res: Response) => {
    try {
      const {
        productId,
        quantity,
        purchasePricePerUnit,
        costPricePerUnit,
        retailPricePerUnit,
        purchaseDate,
        receivedDate
      } = req.body;

      if (
        !productId ||
        !quantity ||
        !purchasePricePerUnit ||
        !costPricePerUnit ||
        !retailPricePerUnit||
        !purchaseDate ||
        !receivedDate

      ) {
        return res
          .status(400)
          .json({ message: "All required stock fields must be provided" });
      }

      if (!mongoose.Types.ObjectId.isValid(productId)) {
        return res.status(400).json({ message: "Invalid Product ID format" });
      }

      const result = await stockService.addStock(req.body);
      res.status(201).json(result);
    } catch (error: any) {
      console.error("❌ Error in addStock:", error);

      if (error.name === "ValidationError") {
        return res
          .status(400)
          .json({ message: "Validation Error", error: error.message });
      }
      if (error.message.includes("Product not found")) {
        return res.status(404).json({ message: error.message });
      }
      if (error.code === 11000) {
        return res.status(400).json({
          message:
            "Duplicate stock entry detected. Ensure productId is correct.",
          error: error.keyValue,
        });
      }

      res.status(500).json({ message: error.message, error: error.message });
    }
  },
  // 📌 Get Products That Have Stock Along With Their Stock Entries
  getProductsWithStock: async (req: Request, res: Response) => {
    try {
      const productsWithStocks = await stockService.getProductsWithStock();
      if (productsWithStocks.length === 0) {
        return res
          .status(404)
          .json({ message: "No products with stock found" });
      }
      res.status(200).json(productsWithStocks);
    } catch (error) {
      res.status(500).json({ message: "Internal Server Error", error });
    }
  },

  // 📌 Get All Stock Purchases for a Product
  getStockByProduct: async (req: Request, res: Response) => {
    try {
      const { productId } = req.params;

      if (!mongoose.Types.ObjectId.isValid(productId)) {
        return res.status(400).json({ message: "Invalid Product ID format" });
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
        return res.status(400).json({ message: "Invalid Product ID format" });
      }

      const summary = await stockService.getStockSummary(productId);
      res.status(200).json(summary);
    } catch (error) {
      res.status(500).json({ message: "Internal Server Error", error });
    }
  },

  // 📌 Delete Stock Entry
  deleteStock: async (req: Request, res: Response) => {
    try {
      const { stockId } = req.params;

      if (!mongoose.Types.ObjectId.isValid(stockId)) {
        return res.status(400).json({ message: "Invalid Stock ID format" });
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
  updateStock: async (req: Request, res: Response) => {
    try {
      const { stockId } = req.params;
      const updateData = req.body;

      // Validate stockId
      if (!mongoose.Types.ObjectId.isValid(stockId)) {
        return res.status(400).json({ message: "Invalid Stock ID format" });
      }

      // Allowed fields for update
      const allowedFields = [
        "quantity",
        "purchasePricePerUnit",
        "costPricePerUnit",
        "retailPricePerUnit",
        "receivedDate",
        "purchaseDate",
      ];

      // Check if any forbidden field is in the request
      const invalidFields = Object.keys(updateData).filter(
        (field) => !allowedFields.includes(field)
      );

      if (invalidFields.length > 0) {
        return res.status(400).json({
          message: `Invalid fields in request: ${invalidFields.join(", ")}`,
        });
      }

      const stock = await stockService.updateStock(stockId, updateData);
      if (!stock) {
        return res.status(404).json({ message: "Stock record not found" });
      }

      res.status(200).json({
        message: "Stock record updated successfully",
        stock,
      });
    } catch (error) {
      res.status(500).json({ message: "Internal Server Error", error });
    }
  },
  getStockById: async (req: Request, res: Response) => {
    try {
      const { stockId } = req.params;

      // Validate stockId
      if (!mongoose.Types.ObjectId.isValid(stockId)) {
        return res.status(400).json({ message: "Invalid Stock ID format" });
      }

      const stock = await stockService.getStockById(stockId);
      if (!stock) {
        return res.status(404).json({ message: "Stock record not found" });
      }

      res.status(200).json(stock);
    } catch (error) {
      res.status(500).json({ message: "Internal Server Error", error });
    }
  },

  // 📌 Bulk Update Stock Costs
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

      if (
        costPricePerUnit === undefined ||
        purchasePricePerUnit === undefined ||
        retailPricePerUnit === undefined
      ) {
        return res
          .status(400)
          .json({ message: "All cost values are required" });
      }

      for (const stockId of stockIds) {
        if (!mongoose.Types.ObjectId.isValid(stockId)) {
          return res
            .status(400)
            .json({ message: `Invalid stockId: ${stockId}` });
        }
      }

      const existingStocks = await stockService.getExistingStocks(stockIds);
      if (existingStocks.length !== stockIds.length) {
        return res
          .status(404)
          .json({ message: "One or more stock records not found" });
      }

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
