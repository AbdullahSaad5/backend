import { Stock } from "@/models/stock.model";
import { Inventory, Variation } from "@/models";
import { IStock } from "@/contracts/stock.contract";

export const stockService = {
  // 📌 Add New Stock Purchase Entry
  addStock: async (data: any) => {
    const inventoryExists = await Inventory.findById(data.inventoryId);
    if (!inventoryExists) {
      throw new Error("Inventory not found. Please provide a valid inventoryId.");
    }

    // Ensure variations exist
    if (!data.variations || !Array.isArray(data.variations) || data.variations.length === 0) {
      throw new Error("At least one variation must be provided.");
    }

    // Transform variations to match Stock model structure
    const selectedVariations = data.variations.map((variation: any) => ({
      variationId: variation.variationId,
      costPricePerUnit: variation.costPricePerUnit,
      purchasePricePerUnit: variation.purchasePricePerUnit,
      totalUnits: variation.totalUnits,
      usableUnits: variation.usableUnits,
    }));

    // Create stock entry
    const stock = new Stock({
      inventoryId: data.inventoryId,
      selectedVariations, // ✅ Store variations in selectedVariations
      receivedDate: data.receivedDate,
      receivedBy: data.receivedBy,
      purchaseDate: data.purchaseDate,
      markAsStock: data.markAsStock,
    });

    await stock.save();
    return { message: "Stock saved successfully", stock };
  },

  // 📌 Get All Stock Entries for an Invenetory
  getStockByInventoryId: async (inventoryId: string) => {
    try {
      // Fetch stock records by inventoryId and where markAsStock is true
      return await Stock.find({
        inventoryId,
        markAsStock: true, // Add this condition to filter only stocks with markAsStock = true
      })
        .populate("inventoryId")
        .populate("selectedVariations.variationId")
        .populate("receivedBy");
    } catch (error: any) {
      throw new Error(`Error fetching stock for inventoryId: ${inventoryId}. Error: ${error.message}`);
    }
  },

  // 📌 Get Stock Summary (Total Quantity & Last Purchase)
  async getStockSummary(inventoryId: string) {
    const stocks = await Stock.find({ inventoryId });

    if (stocks.length === 0) {
      return { message: "No stock records found", totalQuantity: 0 };
    }

    const totalQuantity = stocks.reduce((sum, stock: any) => sum + stock.totalUnits, 0);
    const lastStockEntry: any = stocks[stocks.length - 1];

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
          from: "stocks", // Ensure this matches the actual collection name
          localField: "_id",
          foreignField: "inventoryId",
          as: "stocks",
        },
      },
      {
        $unwind: "$stocks", // Unwind to handle individual stock documents
      },
      {
        $lookup: {
          from: "users", // Ensure this matches the actual users collection
          localField: "stocks.receivedBy",
          foreignField: "_id",
          as: "stocks.receivedBy", // Populates `receivedBy` field
        },
      },
      {
        $unwind: {
          path: "$stocks.receivedBy",
          preserveNullAndEmptyArrays: true, // Keeps null if no user found
        },
      },
      {
        $match: { "stocks.receivedBy": { $ne: null } }, // Ensure `receivedBy` is populated
      },
      {
        $group: {
          _id: "$_id",
          kind: { $first: "$kind" },
          productInfo: { $first: "$productInfo" },
          stocks: { $push: "$stocks" }, // Re-group stocks after unwind
        },
      },
    ]);
  },
};
