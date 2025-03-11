import { Stock } from "@/models/stock.model";
import { Inventory } from "@/models";
import { IStock } from "@/contracts/stock.contract";

export const stockService = {
  // 📌 Add New Stock Purchase Entry
  async addStock(data: any) {
    const inventoryExists = await Inventory.findById(data.inventoryId);
    if (!inventoryExists) {
      throw new Error("Inventory not found. Please provide a valid inventoryId.");
    }

    // Check for duplicate batch number
    const existingStock = await Stock.findOne({
      batchNumber: data.batchNumber,
    });
    if (existingStock) {
      throw new Error("Batch number already exists. Please provide a unique batch number.");
    }

    const stock = new Stock(data);
    await stock.save();
    return { message: "Stock purchase recorded successfully", stock };
  },

  // 📌 Get All Stock Entries for an Invenetory
  async getStockByInventory(inventoryId: string) {
    return await Stock.find({ inventoryId }).populate("inventoryId");
  },

  // 📌 Get Stock Summary (Total Quantity & Last Purchase)
  async getStockSummary(inventoryId: string) {
    const stocks = await Stock.find({ inventoryId });

    if (stocks.length === 0) {
      return { message: "No stock records found", totalQuantity: 0 };
    }

    const totalQuantity = stocks.reduce((sum, stock) => sum + stock.totalUnits, 0);
    const lastStockEntry = stocks[stocks.length - 1];

    return {
      message: "Stock summary retrieved",
      totalQuantity,
      latestPurchasePrice: lastStockEntry.purchasePricePerUnit,
      lastUpdated: lastStockEntry.purchaseDate,
      stockEntries: stocks,
    };
  },

  // 📌 Delete Stock Entry
  async deleteStock(stockId: string) {
    return await Stock.findByIdAndDelete(stockId);
  },
  async updateStock(stockId: string, updateData: Partial<IStock>) {
    return await Stock.findByIdAndUpdate(stockId, updateData, {
      new: true, // Return updated document
      runValidators: true, // Ensure validations are applied
    });
  },
  async getStockById(stockId: string) {
    return await Stock.findById(stockId);
  },
  // 📌 Get Existing Stock Records
  async getExistingStocks(stockIds: string[]) {
    return await Stock.find({ _id: { $in: stockIds } }, { _id: 1 });
  },

  // 📌 Bulk Update Stock Costs
  async bulkUpdateStockCost(
    stockIds: string[],
    costPricePerUnit: number,
    purchasePricePerUnit: number,
    retailPricePerUnit: number
  ) {
    return await Stock.updateMany(
      { _id: { $in: stockIds } },
      {
        $set: {
          costPricePerUnit,
          purchasePricePerUnit,
          retailPricePerUnit,
        },
      }
    );
  },

  // 📌 Get Inventory That Have Stock Along With Their Stock Entries
  async getInventoryWithStock() {
    return await Inventory.aggregate([
      {
        $lookup: {
          from: "stocks", // The collection name in MongoDB (ensure it's correct)
          localField: "_id",
          foreignField: "inventoryId",
          as: "stocks",
        },
      },
      {
        $match: { stocks: { $ne: [] } }, // Ensure we only get inventory with stock
      },
    ]);
  },
};
