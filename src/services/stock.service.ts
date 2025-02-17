import { Stock } from "@/models/stock.model";
import { Product } from "@/models";

export class stockService {
  // 📌 Add New Stock Purchase Entry
  static async addStock(data: any) {
    const productExists = await Product.findById(data.productId);
    if (!productExists) {
      throw new Error("Product not found. Please provide a valid productId.");
    }

    const stock = new Stock(data);
    await stock.save();
    return { message: "Stock purchase recorded successfully", stock };
  }

  // 📌 Get All Stock Entries for a Product
  static async getStockByProduct(productId: string) {
    return await Stock.find({ productId }).populate("productId");
  }

  // 📌 Get Stock Summary (Total Quantity & Last Purchase)
  static async getStockSummary(productId: string) {
    const stocks = await Stock.find({ productId });

    if (stocks.length === 0) {
      return { message: "No stock records found", totalQuantity: 0 };
    }

    const totalQuantity = stocks.reduce(
      (sum, stock) => sum + stock.quantity,
      0
    );
    const lastStockEntry = stocks[stocks.length - 1];

    return {
      message: "Stock summary retrieved",
      totalQuantity,
      latestPurchasePrice: lastStockEntry.purchasePricePerUnit,
      lastUpdated: lastStockEntry.purchaseDate,
      stockEntries: stocks,
    };
  }

  // 📌 Delete Stock Entry
  static async deleteStock(stockId: string) {
    return await Stock.findByIdAndDelete(stockId);
  }

  // 📌 Get Existing Stock Records
  static async getExistingStocks(stockIds: string[]) {
    return await Stock.find({ _id: { $in: stockIds } }, { _id: 1 });
  }

  // 📌 Bulk Update Stock Costs
  static async bulkUpdateStockCost(
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
  }

  // 📌 Get All Products with Their Stocks
  static async getAllProductsWithStocks() {
    try {
      const productsWithStocks = await Product.find()
        .populate({
          path: "stocks", // Ensure you have a reference field in your Product model
          model: "Stock",
        })
        .lean(); // Convert Mongoose documents to plain objects

      return productsWithStocks;
    } catch (error: any) {
      throw new Error("Error fetching products with stocks: " + error.message);
    }
  }
}
