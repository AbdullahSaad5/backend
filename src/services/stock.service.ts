import { Stock } from "@/models/stock.model";

export class stockService {
  // 📌 Add New Stock Purchase Entry (Instead of Updating)

  static async addStock(data: any) {
    const stock = new Stock(data);
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
    const totalQuantity = stocks.reduce((sum, stock) => sum + stock.quantity, 0);
  
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
}
