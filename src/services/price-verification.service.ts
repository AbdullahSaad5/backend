import { stripeLogger } from "@/utils/stripe-logger.util";

interface ProductPrice {
  id: string;
  productId: string;
  amount: number; // in cents
  currency: string;
  nickname?: string;
  type: "one_time" | "recurring";
  recurring?: {
    interval: "day" | "week" | "month" | "year";
    intervalCount: number;
  };
  active: boolean;
  metadata?: Record<string, string>;
}

interface Product {
  id: string;
  name: string;
  description?: string;
  active: boolean;
  metadata?: Record<string, string>;
  prices: ProductPrice[];
}

class PriceVerificationService {
  private productsCache = new Map<string, Product>();
  private pricesCache = new Map<string, ProductPrice>();
  private cacheExpiry = 5 * 60 * 1000; // 5 minutes
  private lastCacheUpdate = 0;

  /**
   * Verify that a price amount matches what's expected server-side
   * Never trust client-provided prices!
   */
  async verifyPrice(priceId: string, expectedAmount: number, currency: string = "usd"): Promise<boolean> {
    try {
      const price = await this.getPrice(priceId);

      if (!price) {
        stripeLogger.apiError("price_verification", `Price ${priceId} not found`, { priceId, expectedAmount });
        return false;
      }

      if (!price.active) {
        stripeLogger.apiError("price_verification", `Price ${priceId} is not active`, { priceId, expectedAmount });
        return false;
      }

      const isAmountValid = price.amount === expectedAmount;
      const isCurrencyValid = price.currency.toLowerCase() === currency.toLowerCase();

      if (!isAmountValid || !isCurrencyValid) {
        stripeLogger.suspiciousActivity(
          "price_mismatch",
          {
            priceId,
            expectedAmount,
            actualAmount: price.amount,
            expectedCurrency: currency,
            actualCurrency: price.currency,
          },
          "Client-provided price does not match server-side price"
        );
        return false;
      }

      return true;
    } catch (error) {
      stripeLogger.apiError("price_verification", error as Error, { priceId, expectedAmount });
      return false;
    }
  }

  /**
   * Get price information from cache or Stripe API
   */
  async getPrice(priceId: string): Promise<ProductPrice | null> {
    // Check cache first
    if (this.pricesCache.has(priceId) && this.isCacheValid()) {
      return this.pricesCache.get(priceId) || null;
    }

    // If not in cache or cache expired, refresh from your database
    // In a real implementation, you would fetch from your database where you store
    // the synchronized Stripe prices
    return await this.fetchPriceFromDatabase(priceId);
  }

  /**
   * Verify multiple items in a cart/order
   */
  async verifyOrderItems(items: Array<{ priceId: string; quantity: number; expectedAmount: number }>): Promise<{
    valid: boolean;
    invalidItems: string[];
    totalAmount: number;
  }> {
    const invalidItems: string[] = [];
    let totalAmount = 0;

    for (const item of items) {
      const isValid = await this.verifyPrice(item.priceId, item.expectedAmount);

      if (!isValid) {
        invalidItems.push(item.priceId);
      } else {
        totalAmount += item.expectedAmount * item.quantity;
      }
    }

    return {
      valid: invalidItems.length === 0,
      invalidItems,
      totalAmount,
    };
  }

  /**
   * In a real implementation, this would fetch from your database
   * where you store synchronized Stripe product/price data
   */
  private async fetchPriceFromDatabase(priceId: string): Promise<ProductPrice | null> {
    // TODO: Replace this with actual database query
    // Example:
    // const price = await PriceModel.findOne({ stripeId: priceId, active: true });
    // if (price) {
    //   const productPrice: ProductPrice = {
    //     id: price.stripeId,
    //     productId: price.productId,
    //     amount: price.amount,
    //     currency: price.currency,
    //     type: price.type,
    //     active: price.active,
    //   };
    //   this.pricesCache.set(priceId, productPrice);
    //   return productPrice;
    // }

    console.warn(
      `⚠️ Price verification not implemented for ${priceId}. Always implement server-side price verification!`
    );
    return null;
  }

  /**
   * Get product information
   */
  async getProduct(productId: string): Promise<Product | null> {
    if (this.productsCache.has(productId) && this.isCacheValid()) {
      return this.productsCache.get(productId) || null;
    }

    // TODO: Fetch from database
    return null;
  }

  /**
   * Check if cache is still valid
   */
  private isCacheValid(): boolean {
    return Date.now() - this.lastCacheUpdate < this.cacheExpiry;
  }

  /**
   * Clear cache (useful for testing or manual refresh)
   */
  clearCache(): void {
    this.productsCache.clear();
    this.pricesCache.clear();
    this.lastCacheUpdate = 0;
  }

  /**
   * Preload commonly used prices into cache
   */
  async preloadPrices(priceIds: string[]): Promise<void> {
    for (const priceId of priceIds) {
      await this.getPrice(priceId);
    }
    this.lastCacheUpdate = Date.now();
  }
}

export const priceVerificationService = new PriceVerificationService();

// Example of how to use this in your order creation:
export const validateOrderPricing = async (orderItems: any[]): Promise<{ valid: boolean; errors: string[] }> => {
  const errors: string[] = [];

  for (const item of orderItems) {
    if (!item.priceId) {
      errors.push(`Item ${item.name} missing priceId`);
      continue;
    }

    const isValidPrice = await priceVerificationService.verifyPrice(
      item.priceId,
      item.expectedAmount || item.unitPrice,
      item.currency || "usd"
    );

    if (!isValidPrice) {
      errors.push(`Invalid price for item ${item.name} (${item.priceId})`);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
};
