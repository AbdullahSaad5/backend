import { Stock } from "@/models/stock.model";

export class stockService {
  // 📌 Create or Update Stock for a Product
  static async createOrUpdateStock(data: any) {
    const {
      productId,
      stockSupplier,
      quantity,
      purchasePricePerUnit,
      costPricePerUnit,
      retailPricePerUnit,
      discount,
      tax,
      expiryDate,
      stockThreshold,
    } = data;

    let stock = await Stock.findOne({ productId });

    if (stock) {
      // Update stock details
      stock.stockSupplier = stockSupplier;
      stock.quantity = quantity;
      stock.purchasePricePerUnit = purchasePricePerUnit;
      stock.costPricePerUnit = costPricePerUnit;
      stock.retailPricePerUnit = retailPricePerUnit;
      stock.discount = discount;
      stock.tax = tax;
      stock.expiryDate = expiryDate || stock.expiryDate;
      stock.stockThreshold = stockThreshold;
      stock.lastUpdated = new Date();

      await stock.save();
      return { message: "Stock updated successfully", stock };
    }

    // Create new stock record
    stock = new Stock({
      productId,
      stockSupplier,
      quantity,
      purchasePricePerUnit,
      costPricePerUnit,
      retailPricePerUnit,
      discount,
      tax,
      expiryDate,
      stockThreshold,
    });

    await stock.save();
    return { message: "Stock created successfully", stock };
  }

  // 📌 Get All Stock Items
  static async getAllStock() {
    return await Stock.find().populate(["productId", "stockSupplier"]);
  }

  // 📌 Get Stock for a Specific Product
  static async getStockByProduct(productId: string) {
    return await Stock.findOne({ productId }).populate([
      "productId",
      "stockSupplier",
    ]);
  }

  // 📌 Delete Stock for a Product
  static async deleteStock(productId: string) {
    return await Stock.findOneAndDelete({ productId });
  }
}
