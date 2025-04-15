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
      stockInvoice: data.stockInvoice,
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
  //get stock by stockId
  async getStockById(stockId: string) {
    return await Stock.findById(stockId).populate("selectedVariations.variationId").populate("receivedBy");
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
          from: "stocks",
          localField: "_id",
          foreignField: "inventoryId",
          as: "stocks",
        },
      },
      { $unwind: "$stocks" },

      // Lookup and populate `receivedBy` (excluding password)
      {
        $lookup: {
          from: "users",
          localField: "stocks.receivedBy",
          foreignField: "_id",
          as: "stocks.receivedBy",
          pipeline: [{ $project: { password: 0 } }],
        },
      },
      { $unwind: { path: "$stocks.receivedBy", preserveNullAndEmptyArrays: true } },

      // Lookup and populate `variationId` inside `selectedVariations`
      {
        $lookup: {
          from: "variations", // Ensure this is the correct collection name
          localField: "stocks.selectedVariations.variationId",
          foreignField: "_id",
          as: "variationDetails",
        },
      },

      // Merge populated variations back into `selectedVariations`
      {
        $addFields: {
          "stocks.selectedVariations": {
            $map: {
              input: "$stocks.selectedVariations",
              as: "variation",
              in: {
                variationId: "$$variation.variationId",
                costPricePerUnit: "$$variation.costPricePerUnit",
                purchasePricePerUnit: "$$variation.purchasePricePerUnit",
                totalUnits: "$$variation.totalUnits",
                usableUnits: "$$variation.usableUnits",
                variationDetails: {
                  $arrayElemAt: [
                    "$variationDetails",
                    { $indexOfArray: ["$variationDetails._id", "$$variation.variationId"] },
                  ],
                },
              },
            },
          },
        },
      },

      // Remove unnecessary fields
      { $unset: "variationDetails" },

      // Ensure `receivedBy` is populated and filter only valid stocks
      { $match: { "stocks.receivedBy": { $ne: null } } },

      // Add a match to check that at least one stock has `markAsStock: true`
      {
        $match: {
          "stocks.markAsStock": true,
        },
      },

      // Lookup and populate `productCategory` from `productcategories` collection inside productInfo
      {
        $lookup: {
          from: "productcategories", // correct collection name for productCategory
          localField: "productInfo.productCategory", // Link to the productCategory ObjectId
          foreignField: "_id",
          as: "productCategory",
        },
      },
      { $unwind: { path: "$productCategory", preserveNullAndEmptyArrays: true } },

      // Lookup and populate `productSupplier` from `users` collection inside productInfo
      {
        $lookup: {
          from: "users",
          localField: "productInfo.productSupplier", // Link to the productSupplier ObjectId
          foreignField: "_id",
          as: "productSupplier",
          pipeline: [{ $project: { password: 0 } }], // Optionally exclude sensitive fields
        },
      },
      { $unwind: { path: "$productSupplier", preserveNullAndEmptyArrays: true } },

      // Regroup stocks after unwind and move `isVariation` & `status` outside `inventory`
      {
        $group: {
          _id: "$_id",
          isVariation: { $first: "$isVariation" }, // Extracting `isVariation`
          status: { $first: "$status" }, // Extracting `status`
          inventory: { $first: "$$ROOT" }, // Keeping full inventory details
          stocks: { $push: "$stocks" }, // Keeping stocks properly grouped
          productCategory: { $first: "$productCategory" }, // Adding populated productCategory
          productSupplier: { $first: "$productSupplier" }, // Adding populated productSupplier
        },
      },
      {
        $replaceRoot: {
          newRoot: {
            $mergeObjects: [
              "$inventory",
              {
                stocks: "$stocks",
                productInfo: {
                  $mergeObjects: [
                    "$inventory.productInfo",
                    { productCategory: "$productCategory", productSupplier: "$productSupplier" },
                  ],
                },
              },
            ],
          },
        },
      },
    ]);
  },
};
