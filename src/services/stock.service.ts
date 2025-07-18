import { Stock } from "@/models/stock.model";
import { Inventory, User, Variation } from "@/models";
import { IStock } from "@/contracts/stock.contract";
import mongoose from "mongoose";

export const stockService = {
  // 📌 Add New Stock Purchase Entry
  addStock: async (data: any) => {
    const {
      inventoryId,
      productSupplier,
      variations,
      totalUnits,
      usableUnits,
      costPricePerUnit,
      purchasePricePerUnit,
      receivedDate,
      receivedBy,
      purchaseDate,
      stockInvoice,
      markAsStock,
      priceBreakdown,
      images,
      videos,
    } = data;

    // Validate inventory existence
    const inventoryExists = await Inventory.findById(inventoryId);
    if (!inventoryExists) {
      throw new Error("Inventory not found. Please provide a valid inventoryId.");
    }
    const supplierExists = await User.findById(productSupplier);
    if (!supplierExists) {
      throw new Error("Supplier not found. Please provide a valid inventoryId.");
    }
    const { isVariation } = inventoryExists;

    // Ensure variations exist if isVariation is true
    if (isVariation) {
      if (!variations || !Array.isArray(variations) || variations.length === 0) {
        throw new Error("At least one variation must be provided.");
      }

      // Validate each variation
      for (const variation of variations) {
        if (
          !variation.variationId ||
          !mongoose.Types.ObjectId.isValid(variation.variationId) ||
          variation.costPricePerUnit === undefined ||
          variation.purchasePricePerUnit === undefined ||
          variation.totalUnits === undefined ||
          variation.usableUnits === undefined
        ) {
          throw new Error(
            "Each variation must have a valid variationId, costPricePerUnit, purchasePricePerUnit, totalUnits, and usableUnits."
          );
        }
      }

      // Transform variations to match the Stock model structure
      const selectedVariations = variations.map((variation: any) => ({
        variationId: variation.variationId,
        costPricePerUnit: variation.costPricePerUnit,
        purchasePricePerUnit: variation.purchasePricePerUnit,
        totalUnits: variation.totalUnits,
        usableUnits: variation.usableUnits,
      }));

      // Create stock entry with variations
      const stock = new Stock({
        inventoryId,
        productSupplier,
        selectedVariations,
        receivedDate,
        receivedBy,
        stockInvoice,
        purchaseDate,
        markAsStock,
        priceBreakdown,
        images,
        videos,
      });

      await stock.save();
      return { message: "Stock saved successfully", stock };
    } else {
      // Handle non-variation inventory
      if (
        totalUnits === undefined ||
        usableUnits === undefined ||
        costPricePerUnit === undefined ||
        purchasePricePerUnit === undefined
      ) {
        throw new Error(
          "For non-variation inventory, totalUnits, usableUnits, costPricePerUnit, and purchasePricePerUnit are required."
        );
      }

      // Create stock entry without variations
      const stock = new Stock({
        inventoryId,
        productSupplier,
        totalUnits,
        usableUnits,
        costPricePerUnit,
        purchasePricePerUnit,
        receivedDate,
        receivedBy,
        stockInvoice,
        purchaseDate,
        markAsStock,
        priceBreakdown,
        images,
        videos,
      });

      await stock.save();
      return { message: "Stock saved successfully", stock };
    }
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
        .populate("productSupplier")
        .populate("selectedVariations.variationId")
        .populate("receivedBy");
    } catch (error: any) {
      throw new Error(`Error fetching stock for inventoryId: ${inventoryId}. Error: ${error.message}`);
    }
  },

  getStockBySupplierId: async (productSupplier: string) => {
    try {
      // Fetch stock records by productSupplier and where markAsStock is true
      return await Stock.find({
        productSupplier,
        markAsStock: true, // Add this condition to filter only stocks with markAsStock = true
      })
        .populate("productSupplier")
        .populate("selectedVariations.variationId")
        .populate("receivedBy");
    } catch (error: any) {
      throw new Error(`Error fetching stock for Supplier: ${productSupplier}. Error: ${error.message}`);
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
    return await Stock.findById(stockId).populate("selectedVariations.variationId").populate("receivedBy").populate("productSupplier");
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
  // Service to get inventory with associated stock
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

      // Lookup and populate variations inside selectedVariations
      {
        $lookup: {
          from: "variations",
          localField: "stocks.selectedVariations.variationId",
          foreignField: "_id",
          as: "variationDetails",
        },
      },

      // Merge populated variations back into selectedVariations
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

      { $unset: "variationDetails" },

      // Ensure receivedBy is populated and filter only valid stocks
      { $match: { "stocks.receivedBy": { $ne: null } } },

      // Filter only stocks with markAsStock = true
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
  async getInventoryWithStockWithDraft() {
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
      {
        $unwind: {
          path: "$stocks.receivedBy",
          preserveNullAndEmptyArrays: true,
        },
      },

      // 3) lookup the product supplier
      {
        $lookup: {
          from: "users",
          localField: "stocks.productSupplier",
          foreignField: "_id",
          as: "stocks.productSupplier",
          pipeline: [{ $project: { password: 0 } }],
        },
      },
      {
        $unwind: {
          path: "$stocks.productSupplier",
          preserveNullAndEmptyArrays: true,
        },
      },

      // Add a field to indicate if receivedBy is invalid (non-existent user)
      {
        $addFields: {
          "stocks.receivedByStatus": {
            $cond: {
              if: { $eq: ["$stocks.receivedBy", null] }, // Check if the user is not found
              then: "Inventory manager has been deleted or is invalid", // Message for invalid ObjectId
              else: "Valid manager", // Valid manager message (if receivedBy is populated)
            },
          },
        },
      },

      // Lookup and populate `variationId` inside `selectedVariations` (for variations)
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
      // Remove unnecessary fields like `variationDetails`
      { $unset: "variationDetails" },

      // Ensure `receivedBy` is populated and filter only valid stocks
      {
        $match: {
          "stocks.receivedByStatus": { $ne: "Inventory manager has been deleted or is invalid" }, // Only filter invalid "receivedBy" here
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

  async getAllStockOptions() {
    try {
      // Use distinct to get all unique 'priceBreakdown.name' values from the Inventory collection
      const distinctPriceBreakdownNames = await Stock.aggregate([
        { $unwind: "$priceBreakdown" }, // Unwind the priceBreakdown array
        { $group: { _id: "$priceBreakdown.name" } }, // Group by priceBreakdown.name
        { $project: { _id: 0, name: "$_id" } }, // Only return the distinct names
      ]);

      // Extract names into an array
      const names = distinctPriceBreakdownNames.map((item) => item.name);

      return names;
    } catch (error) {
      console.error("Error fetching distinct price breakdown names:", error);
      throw new Error("Failed to fetch distinct price breakdown names");
    }
  },
};
