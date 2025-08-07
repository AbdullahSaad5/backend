import FeaturedSaleModel from "@/models/featured-sale.model";
import { IFeaturedSale } from "@/contracts/featured-sale.contract";

export const featuredSaleService = {
  // Create a new sale
  createSale: async (data: Partial<IFeaturedSale>): Promise<IFeaturedSale> => {
    const sale = await FeaturedSaleModel.create(data);
    return sale;
  },

  // Get all sales
  getSales: async (): Promise<IFeaturedSale[]> => {
    return FeaturedSaleModel.find().sort({ createdAt: -1 }).exec();
  },

  // Get active sales only
  getActiveSales: async (): Promise<IFeaturedSale[]> => {
    return FeaturedSaleModel.find({ status: "active" })
      .sort({ createdAt: -1 })
      .exec();
  },

  // Update a sale
  updateSale: async (
    id: string,
    data: Partial<IFeaturedSale>
  ): Promise<IFeaturedSale | null> => {
    return FeaturedSaleModel.findByIdAndUpdate(id, data, { new: true });
  },

  // Delete a sale
  deleteSale: async (id: string): Promise<boolean> => {
    const result = await FeaturedSaleModel.findByIdAndDelete(id);
    return !!result;
  },
};
