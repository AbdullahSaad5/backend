import { Request, Response } from "express";
import mongoose from "mongoose";
import { stockService } from "@/services/stock.service";

export const stockController = {
  // 📌 Add New Stock Purchase
  addStock: async (req: Request, res: Response) => {
    try {
      const {
        inventoryId,
        totalUnits,
        usableUnits,
        purchasePricePerUnit,
        costPricePerUnit,
        // retailPricePerUnit,
        purchaseDate,
        receivedDate,
      } = req.body;

      if (
        !inventoryId ||
        !totalUnits ||
        !usableUnits ||
        !purchasePricePerUnit ||
        !costPricePerUnit ||
        // !retailPricePerUnit ||
        !purchaseDate ||
        !receivedDate
      ) {
        return res.status(400).json({ message: "All required stock fields must be provided" });
      }

      if (!mongoose.Types.ObjectId.isValid(inventoryId)) {
        return res.status(400).json({ message: "Invalid Inventory ID format" });
      }

      const result = await stockService.addStock(req.body);
      res.status(201).json(result);
    } catch (error: any) {
      console.error("❌ Error in addStock:", error);

      if (error.name === "ValidationError") {
        return res.status(400).json({ message: "Validation Error", error: error.message });
      }
      if (error.message.includes("Inventory not found")) {
        return res.status(404).json({ message: error.message });
      }
      if (error.code === 11000) {
        return res.status(400).json({
          message: "Duplicate stock entry detected. Ensure inventoryId is correct.",
          error: error.keyValue,
        });
      }

      res.status(500).json({ message: error.message, error: error.message });
    }
  },
  // 📌 Get inventory That Have Stock Along With Their Stock Entries
  getInventoryWithStock: async (req: Request, res: Response) => {
    try {
      const inventoryWithStocks = await stockService.getInventoryWithStock();
      if (inventoryWithStocks.length === 0) {
        return res.status(404).json({ message: "No inventory with stock found" });
      }
      res.status(200).json(inventoryWithStocks);
    } catch (error) {
      res.status(500).json({ message: "Internal Server Error", error });
    }
  },

  // 📌 Get All Stock Purchases for a inventory
  getStockByInventoryId: async (req: Request, res: Response) => {
    try {
      const { inventoryId } = req.params;

      if (!mongoose.Types.ObjectId.isValid(inventoryId)) {
        return res.status(400).json({ message: "Invalid Inventory ID format" });
      }

      const stocks = await stockService.getStockByInventory(inventoryId);
      if (stocks.length === 0) {
        return res.status(404).json({ message: "No stock records found for this inventory" });
      }

      res.status(200).json(stocks);
    } catch (error) {
      res.status(500).json({ message: "Internal Server Error", error });
    }
  },

  // 📌 Get Stock Summary
  getStockSummary: async (req: Request, res: Response) => {
    try {
      const { inventoryId } = req.params;

      if (!mongoose.Types.ObjectId.isValid(inventoryId)) {
        return res.status(400).json({ message: "Invald Inventory ID format" });
      }

      const summary = await stockService.getStockSummary(inventoryId);
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
        "totalUnits",
        "usableUnits",
        "purchasePricePerUnit",
        "costPricePerUnit",
        // "retailPricePerUnit",
        "receivedDate",
        "receivedBy",
        "purchaseDate",
        "markAsStock",
      ];

      // Check if any forbidden field is in the request
      const invalidFields = Object.keys(updateData).filter((field) => !allowedFields.includes(field));

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
  getStockByStockId: async (req: Request, res: Response) => {
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
      const { stockIds, costPricePerUnit, purchasePricePerUnit, retailPricePerUnit } = req.body;

      if (!Array.isArray(stockIds) || stockIds.length === 0) {
        return res.status(400).json({ message: "stockIds array is required" });
      }

      if (costPricePerUnit === undefined || purchasePricePerUnit === undefined || retailPricePerUnit === undefined) {
        return res.status(400).json({ message: "All cost values are required" });
      }

      for (const stockId of stockIds) {
        if (!mongoose.Types.ObjectId.isValid(stockId)) {
          return res.status(400).json({ message: `Invalid stockId: ${stockId}` });
        }
      }

      const existingStocks = await stockService.getExistingStocks(stockIds);
      if (existingStocks.length !== stockIds.length) {
        return res.status(404).json({ message: "One or more stock records not found" });
      }

      const result = await stockService.bulkUpdateStockCost(
        stockIds,
        costPricePerUnit,
        purchasePricePerUnit,
        retailPricePerUnit
      );
      return res.status(200).json({ message: "Stock costs updated successfully", result });
    } catch (error) {
      res.status(500).json({ message: "Internal Server Error", error });
    }
  },
};
