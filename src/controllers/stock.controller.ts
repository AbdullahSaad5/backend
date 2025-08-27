import { Request, Response } from "express";
import mongoose from "mongoose";
import { stockService } from "@/services/stock.service";
import { SystemExpenseService } from "@/services/system-expense.service";
import { Inventory, Stock, Variation } from "@/models";

export const stockController = {
  // 📌 Add New Stock Purchase
  addStock: async (req: Request, res: Response) => {
    console.log("resresres : ", req.body);

    try {
      const {
        inventoryId,
        productSupplier,
        stockInvoice,
        variations, // Only required if isVariation is true
        totalUnits,
        usableUnits,
        totalCostPrice,
        retailPricePerUnit,
        priceBreakdown,
        purchasePricePerUnit,
        receivedDate,
        receivedBy,
        purchaseDate,
        markAsStock,
        images,
        videos,
      } = req.body;

      // Validate inventory existence and fetch `isVariation`
      const inventoryExists = await Inventory.findById(inventoryId);
      if (!inventoryExists) {
        return res.status(404).json({ message: "Inventory not found. Please provide a valid inventoryId." });
      }

      const { isVariation } = inventoryExists;

      if (isVariation) {
        // Validate variations if isVariation is true
        if (!variations || !Array.isArray(variations) || variations.length === 0) {
          return res.status(400).json({ message: "At least one variation must be provided." });
        }

        for (const variation of variations) {
          if (
            !variation.variationId ||
            !mongoose.Types.ObjectId.isValid(variation.variationId) ||
            variation.totalCostPrice === undefined ||
            variation.retailPricePerUnit === undefined ||
            variation.purchasePricePerUnit === undefined ||
            variation.totalUnits === undefined ||
            variation.usableUnits === undefined
          ) {
            return res.status(400).json({
              message:
                "Each variation must have a valid variationId, totalCostPrice, retailPricePerUnit, purchasePricePerUnit, totalUnits, and usableUnits.",
            });
          }
        }
      } else {
        // Validate direct stock details for non-variation inventories
        if (
          totalUnits === undefined ||
          usableUnits === undefined ||
          totalCostPrice === undefined ||
          retailPricePerUnit === undefined ||
          purchasePricePerUnit === undefined
        ) {
          return res.status(400).json({
            message:
              "For non-variation inventory, totalUnits, usableUnits, totalCostPrice, retailPricePerUnit, and purchasePricePerUnit are required.",
          });
        }
      }

      // Prepare data for stock creation
      const stockData = {
        inventoryId,
        productSupplier,
        stockInvoice,
        receivedDate,
        receivedBy,
        purchaseDate,
        markAsStock,
        variations,
        totalUnits,
        priceBreakdown,
        usableUnits,
        totalCostPrice,
        retailPricePerUnit,
        purchasePricePerUnit,
        images,
        videos,
      };

      // Pass to service for actual stock creation
      const response = await stockService.addStock(stockData);

      res.status(201).json(response);
    } catch (error: any) {
      console.error("Error in addStock:", error);
      res.status(500).json({ message: error.message || "An error occurred" });
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
  getInventoryWithStockWithDraft: async (req: Request, res: Response) => {
    try {
      const {
        searchQuery = "",
        status,
        stockStatus,
        isPart,
        page = 1,
        limit = 10,
      } = req.query;

      const filters = {
        searchQuery: searchQuery as string,
        status: status as string,
        stockStatus: stockStatus as string,
        isPart: isPart as string,
        page: parseInt(page as string, 10) || 1,
        limit: parseInt(limit as string, 10) || 10,
      };

      const result = await stockService.getInventoryWithStockWithDraft(filters);
      
      if (result.inventory.length === 0) {
        return res.status(404).json({ 
          message: "No inventory with stock found",
          data: result 
        });
      }
      
      res.status(200).json({
        message: "Inventory with stock retrieved successfully",
        data: result
      });
    } catch (error) {
      console.error("Error fetching inventory with stock:", error);
      res.status(500).json({ message: "Internal Server Error", error });
    }
  },
  // 📌 Get All Stock Purchases for a inventory(only those stocks who are markAsStock=true)
  // Controller to get stock by inventoryId and ensure `markAsStock` is true
  getStockByInventoryId: async (req: Request, res: Response) => {
    try {
      const { inventoryId } = req.params;

      // Validate inventoryId format
      if (!mongoose.Types.ObjectId.isValid(inventoryId)) {
        return res.status(400).json({ message: "Invalid Inventory ID format" });
      }

      // Fetch stock records where markAsStock is true for the given inventoryId
      const stocks = await stockService.getStockByInventoryId(inventoryId);

      if (stocks.length === 0) {
        return res
          .status(404)
          .json({ message: "No stock records found for this inventory with markAsStock set to true" });
      }

      // Return the stock records found
      res.status(200).json({
        message: "Stock records retrieved successfully",
        stocks,
      });
    } catch (error) {
      console.error("❌ Error fetching stock records:", error);
      res.status(500).json({ message: "Internal Server Error", error });
    }
  },
  // Controller to get stock by supplierId and ensure `markAsStock` is true
  getStockBySupplierId: async (req: Request, res: Response) => {
    try {
      const { supplierId } = req.params;

      // Validate supplierId format
      if (!mongoose.Types.ObjectId.isValid(supplierId)) {
        return res.status(400).json({ message: "Invalid Supplier ID format" });
      }

      // Fetch stock records where markAsStock is true for the given supplierId
      const { supplierId: productSupplier } = req.params;
      const stocks = await stockService.getStockBySupplierId(productSupplier);
      // const stocks = await stockService.getStockBySupplierId(supplierId);

      if (stocks.length === 0) {
        return res
          .status(404)
          .json({ message: "No stock records found for this suplier with markAsStock set to true" });
      }

      // Return the stock records found
      res.status(200).json({
        message: "Stock records retrieved successfully",
        stocks,
      });
    } catch (error) {
      console.error("❌ Error fetching stock records:", error);
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

  viewStock: async (req: Request, res: Response) => {
    try {
      const { stockId } = req.params;
      const stock = await Stock.findById(stockId).populate("inventoryId selectedVariations.variationId receivedBy");

      if (!stock) {
        return res.status(404).json({ message: "Stock not found" });
      }

      const inventory = await Inventory.findById(stock.inventoryId);
      const isVariation = inventory?.isVariation || false;

      res.status(200).json({ stock, isVariation });
    } catch (error: any) {
      console.error("❌ Error in viewStock:", error);
      res.status(500).json({ message: "Internal Server Error" });
    }
  },

  // ✅ Edit Stock
  updateStock: async (req: Request, res: Response) => {
    try {
      const { stockId } = req.params;
      const stock: any = await Stock.findById(stockId);

      if (!stock) {
        return res.status(404).json({ message: "Stock not found" });
      }

      const inventory = await Inventory.findById(stock.inventoryId);
      const isVariation = inventory?.isVariation || false;

      if (isVariation) {
        if (!req.body.selectedVariations || !Array.isArray(req.body.selectedVariations)) {
          return res.status(400).json({ message: "Selected variations are required for variation-based stock." });
        }
        stock.selectedVariations = req.body.selectedVariations;
      } else {
        const { totalUnits, usableUnits, totalCostPrice, retailPricePerUnit, purchasePricePerUnit } = req.body;
        if (
          totalUnits === undefined ||
          usableUnits === undefined ||
          totalCostPrice === undefined ||
          retailPricePerUnit === undefined ||
          purchasePricePerUnit === undefined
        ) {
          return res.status(400).json({ message: "All stock details are required for non-variation stock." });
        }
        stock.totalUnits = totalUnits;
        stock.usableUnits = usableUnits;
        stock.totalCostPrice = totalCostPrice;
        stock.retailPricePerUnit = retailPricePerUnit;
        stock.purchasePricePerUnit = purchasePricePerUnit;
      }

      // ✅ Price Breakdown update
      if (req.body.priceBreakdown && Array.isArray(req.body.priceBreakdown)) {
        stock.priceBreakdown = req.body.priceBreakdown;
      }

      // ✅ Optional fields
      stock.stockInvoice = req.body.stockInvoice || stock.stockInvoice;
      stock.receivedDate = req.body.receivedDate || stock.receivedDate;
      stock.receivedBy = req.body.receivedBy || stock.receivedBy;
      stock.purchaseDate = req.body.purchaseDate || stock.purchaseDate;
      stock.markAsStock = req.body.markAsStock || stock.markAsStock;
      stock.images = req.body.images || stock.images;
      stock.videos = req.body.videos || stock.videos;

      await stock.save();

      // 🆕 EXPENSE TRACKING: Check if markAsStock changed from false to true
      // This handles the scenario where a draft stock is now being published
      if (req.body.markAsStock === true && stock.markAsStock === true) {
        // Check if this stock already has an expense record
        const existingExpense = await SystemExpenseService.checkExistingExpense(stock._id.toString());
        
        console.log(`Checking for existing expense record for stock ID: ${stock._id}`);

        if (!existingExpense) {
          try {
            // Get inventory details for product name
            const inventory = await Inventory.findById(stock.inventoryId);
            const productName = (inventory as any)?.productInfo?.item_name?.[0]?.value || "Unknown Product";
            
            // Calculate total amount based on whether it's variation or non-variation
            let totalAmount = 0;
            if (stock.selectedVariations && stock.selectedVariations.length > 0) {
              // Variation stock
              totalAmount = stock.selectedVariations.reduce((sum: number, variation: any) => {
                return sum + (variation.totalCostPrice || 0);
              }, 0);
            } else {
              // Non-variation stock
              totalAmount = stock.totalCostPrice || 0;
            }
            
            console.log(`📊 Creating expense record for newly published stock: ${productName} - Total Cost: ${totalAmount}`);
            
            await SystemExpenseService.createInventoryPurchaseExpense({
              productName: productName,
              totalAmount: totalAmount,
              stockId: stock._id.toString(),
              purchaseDate: stock.purchaseDate ? new Date(stock.purchaseDate) : new Date(),
            });
            
            console.log(`✅ Expense record created successfully for newly published stock ID: ${stock._id}`);
          } catch (expenseError) {
            console.error("❌ Failed to create expense for newly published stock:", expenseError);
            // Don't fail the update if expense creation fails
          }
        } else {
          console.log(`📝 Stock already has an expense record - no new expense created for stock ID: ${stock._id}`);
        }
      }

      res.status(200).json({ message: "Stock updated successfully", stock });
    } catch (error: any) {
      console.error("❌ Error in editStock:", error);
      res.status(500).json({ message: "Internal Server Error" });
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
      const { stockIds, totalCostPrice, purchasePricePerUnit, retailPricePerUnit } = req.body;

      if (!Array.isArray(stockIds) || stockIds.length === 0) {
        return res.status(400).json({ message: "stockIds array is required" });
      }

      if (totalCostPrice === undefined || purchasePricePerUnit === undefined || retailPricePerUnit === undefined) {
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
        totalCostPrice,
        purchasePricePerUnit,
        retailPricePerUnit
      );
      return res.status(200).json({ message: "Stock costs updated successfully", result });
    } catch (error) {
      res.status(500).json({ message: "Internal Server Error", error });
    }
  },

  // Controller to fetch selectable options for attributes
  getAllStockOptions: async (req: Request, res: Response) => {
    try {
      // Fetch the options for each attribute
      const options = await stockService.getAllStockOptions();

      // Return the options in the response
      return res.status(200).json({
        message: "Attribute options fetched successfully",
        options,
      });
    } catch (error) {
      console.error("❌ Error fetching Stock  attribute options:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  },
};
