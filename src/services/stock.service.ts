import { Stock } from "@/models/stock.model";
import { stockThresholdService } from "./stockThreshold.service";
import { Product, User } from "@/models";

export class stockService {
  // 📌 Add New Stock Purchase Entry (Instead of Updating)
  static async addStock(data: any) {
    const stock = new Stock(data);

    const productExists = await Product.findById(data.productId);
    if (!productExists) {
      throw new Error("Product not found. Please provide a valid productId.");
    }

    // 2️⃣ Check if the supplier exists
    const supplierExists = await User.findById(data.stockSupplier);
    if (!supplierExists) {
      throw new Error(
        "Supplier not found. Please provide a valid stockSupplier."
      );
    }
    await stock.save();
    return { message: "Stock purchase recorded successfully", stock };
  }

  // 📌 Get All Stock Entries for a Product
  static async getStockByProduct(productId: string) {
    return await Stock.find({ productId }).populate([
      "productId",
      "stockSupplier",
    ]);
  }

  // 📌 Get Stock Summary (Total Quantity & Last Purchase)
  static async getStockSummary(productId: string) {
    const stocks = await Stock.find({ productId });

    if (stocks.length === 0) {
      return { message: "No stock records found", totalQuantity: 0 };
    }

    // Calculate total stock quantity
    const totalQuantity = stocks.reduce(
      (sum, stock) => sum + stock.quantity,
      0
    );

    // Get the latest stock entry (most recent purchase)
    const lastStockEntry = stocks[stocks.length - 1];

    return {
      message: "Stock summary retrieved",
      totalQuantity,
      latestPurchasePrice: lastStockEntry.purchasePricePerUnit,
      lastUpdated: lastStockEntry.purchaseDate,
      stockEntries: stocks,
    };
  }

  // 📌 Delete All Stock Purchases for a Product
  static async deleteStock(productId: string) {
    return await Stock.findOneAndDelete({ productId });
  }

  // 📌 Check if Stock is Below Threshold
  static async checkStockThreshold(productId: string) {
    return await stockThresholdService.checkStockThreshold(productId);
  }

  // 📌 Get Low Stock Products
  static async getLowStockProducts() {
    return await stockThresholdService.getLowStockProducts();
  }

  // 📌 Update Stock Threshold for a Product
  static async updateStockThreshold(productId: string, newThreshold: number) {
    return await stockThresholdService.updateStockThreshold(
      productId,
      newThreshold
    );
  }

  // 📌 Notify Admin if Stock is Low
  static async notifyLowStock(productId: string) {
    return await stockThresholdService.notifyLowStock(productId);
  }
  // 📌 Get Existing Stock Records
  static async getExistingStocks(stockIds: string[]) {
    return await Stock.find({ _id: { $in: stockIds } }, { _id: 1 });
  }

  // 📌 Bulk Update Stock Costs (After Validation)
  static async bulkUpdateStockCost(
    stockIds: string[],
    costPricePerUnit: number,
    purchasePricePerUnit: number,
    retailPricePerUnit: number
  ) {
    return await Stock.updateMany(
      { _id: { $in: stockIds } }, // Update only valid stock IDs
      {
        $set: {
          costPricePerUnit,
          purchasePricePerUnit,
          retailPricePerUnit,
        },
      }
    );
  }
}
