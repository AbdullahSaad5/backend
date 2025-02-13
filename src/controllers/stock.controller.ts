import { Request, Response } from "express";
import mongoose from "mongoose";
import { stockService } from "@/services";

export const stockController = {
  // 📌 Create or Update Stock
  createOrUpdateStock: async (req: Request, res: Response) => {
    try {
      const { productId, stockSupplier } = req.body;

      if (!productId || !stockSupplier) {
        return res
          .status(400)
          .json({ message: "Product ID and Supplier ID are required" });
      }

      if (
        !mongoose.Types.ObjectId.isValid(productId) ||
        !mongoose.Types.ObjectId.isValid(stockSupplier)
      ) {
        return res
          .status(400)
          .json({ message: "Invalid Product ID or Supplier ID format" });
      }

      const result = await stockService.createOrUpdateStock(req.body);
      res.status(200).json(result);
    } catch (error) {
      res.status(500).json({ message: "Error processing stock", error });
    }
  },

  // 📌 Get All Stock Items
  getAllStock: async (_req: Request, res: Response) => {
    try {
      const stocks = await stockService.getAllStock();
      res.status(200).json(stocks);
    } catch (error) {
      res.status(500).json({ message: "Internal Server Error", error });
    }
  },

  // 📌 Get Stock for a Specific Product
  getStockByProduct: async (req: Request, res: Response) => {
    try {
      const { productId } = req.params;

      if (!mongoose.Types.ObjectId.isValid(productId)) {
        return res.status(400).json({ message: "Invalid product ID format" });
      }

      const stock = await stockService.getStockByProduct(productId);
      if (!stock) {
        return res
          .status(404)
          .json({ message: "No stock found for this product" });
      }

      res.status(200).json(stock);
    } catch (error) {
      res.status(500).json({ message: "Internal Server Error", error });
    }
  },

  // 📌 Delete Stock for a Product
  deleteStock: async (req: Request, res: Response) => {
    try {
      const { productId } = req.params;

      if (!mongoose.Types.ObjectId.isValid(productId)) {
        return res.status(400).json({ message: "Invalid product ID format" });
      }

      const stock = await stockService.deleteStock(productId);
      if (!stock) {
        return res.status(404).json({ message: "Stock not found" });
      }

      res.status(200).json({ message: "Stock deleted successfully" });
    } catch (error) {
      res.status(500).json({ message: "Internal Server Error", error });
    }
  },
};
