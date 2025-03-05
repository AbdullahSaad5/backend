import { Stock } from "@/models/stock.model";
//TODO: change stockThreshold , and shift it to product Schema
export const stockThresholdService = {
  // Check if stock is below threshold
  async checkStockThreshold(productId: string) {
    const stock = await Stock.findOne({ productId });
    if (!stock) return null;
    return stock.quantity <= stock.stockThreshold;
  },

  // Get all products that are below threshold
  async getLowStockProducts() {
    return await Stock.find({ quantity: { $lte: "stockThreshold" } });
  },

  // Update stock threshold for a product
  async updateStockThreshold(productId: string, newThreshold: number) {
    const stock = await Stock.findOneAndUpdate(
      { productId },
      { stockThreshold: newThreshold },
      { new: true }
    );
    return stock;
  },

  // Notify admin if stock is low (placeholder for real notification logic)
  async notifyLowStock(productId: string) {
    const isLowStock = await this.checkStockThreshold(productId);
    if (isLowStock) {
      console.log(`⚠️ Alert: Stock for product ${productId} is low!`);
      return { message: "Stock is below threshold", productId };
    }
    return { message: "Stock is sufficient", productId };
  },
};
