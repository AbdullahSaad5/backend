import dealsModel from "@/models/deals.model";
import { Listing, ProductCategory } from "@/models";
import mongoose from "mongoose";
export const dealsService = {
  createDeals: async (dealData: {
    dealType: string;
    discountValue: number;
    products?: string[];
    categories?: string[];
    startDate: string;
    endDate: string;
    minPurchaseAmount?: number;
    minQuantity?: number;
    isActive?: boolean;
    selectionType: "products" | "categories";
    image?: string;
  }) => {
    const {
      dealType,
      discountValue,
      products = [],
      categories = [],
      startDate,
      endDate,
      minPurchaseAmount,
      minQuantity,
      isActive,
      selectionType,
      image,
    } = dealData;

    const deal = new dealsModel({
      dealType,
      discountValue,
      products: selectionType === "products" ? products : [],
      categories: selectionType === "categories" ? categories : [],
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      minPurchaseAmount,
      minQuantity,
      isActive,
      selectionType,
      image,
    });
    const saveDeal = await deal.save();
    if (isActive) {
      await applyDealToListings(deal._id.toString());
    }
    return saveDeal
  },
  updateDeals: async (
    id: string,
    updateData: {
      dealType?: string;
      discountValue?: number;
      products?: string[];
      categories?: string[];
      startDate?: string;
      endDate?: string;
      minPurchaseAmount?: number;
      minQuantity?: number;
      isActive?: boolean;
      selectionType?: "products" | "categories";
      image?: string;
    }
  ) => {
    const updateObject: any = { ...updateData };

    // Convert dates if provided
    if (updateData.startDate) {
      updateObject.startDate = new Date(updateData.startDate);
    }
    if (updateData.endDate) {
      updateObject.endDate = new Date(updateData.endDate);
    }

    // Handle selectionType logic
    if (updateData.selectionType) {
      if (updateData.selectionType === "products") {
        updateObject.products = updateData.products || [];
        updateObject.categories = [];
      } else if (updateData.selectionType === "categories") {
        updateObject.categories = updateData.categories || [];
        updateObject.products = [];
      }
    }

    const updatedDeal = await dealsModel.findByIdAndUpdate(
      id,
      updateObject,
      { new: true, runValidators: true }
    );

    if (!updatedDeal) {
      throw new Error('Deal not found');
    }
    console.log(updateData);

    if (updatedDeal.isActive) {
      await applyDealToListings(updatedDeal._id.toString());
    } else {
      await removeDealFromListings(updatedDeal._id.toString())
    }
    return updatedDeal;
  },
  getDeals: async (options: {
    page?: number;
    limit?: number;
    isActive?: string;
  }) => {
    const { page = 1, limit = 10, isActive } = options;

    const pageNum = Number(page) || 1;
    const limitNum = Number(limit) || 10;
    const skip = (pageNum - 1) * limitNum;

    let filter: any = {};

    if (isActive !== undefined) {
      filter.isActive = isActive === "true";
    }

    const deals = await dealsModel
      .find(filter)
      .populate("products")
      .populate("categories")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum);

    const total = await dealsModel.countDocuments(filter);

    return {
      deals,
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum),
      },
    };
  },

  deleteDeal: async (id: string) => {
    const deletedDeal = await dealsModel.findByIdAndDelete(id);
    return deletedDeal;
  },
  getDealById: async (id: string) => {
    const deal = await dealsModel
      .findById(id)
      .populate("products")
      .populate("categories");

    return deal;
  },
  //cron
  // checkAndUpdateDeals: async (): Promise<{ expired: number }> => {
  //   const now = new Date();

  //   // const activeResult = await dealsModel.updateMany(
  //   //   { startDate: { $lte: now }, endDate: { $gte: now } },
  //   //   // { $set: { isActive: true } }
  //   // );

  //   const expiredResult = await dealsModel.updateMany(
  //     { endDate: { $lt: now }, isActive: true },
  //     { $set: { isActive: false } }
  //   );

  //   return {
  //     // activated: activeResult.modifiedCount ?? 0,
  //     expired: expiredResult.modifiedCount ?? 0,
  //   };
  // },
  checkAndUpdateDeals: async (): Promise<{ expired: number }> => {
    const now = new Date();

    try {
      // Find all deals that have expired but are still marked as active
      const expiredDeals = await dealsModel.find({
        endDate: { $lt: now },
        isActive: true
      });

      let expiredCount = 0;

      // Process each expired deal to remove from listings
      for (const deal of expiredDeals) {
        try {
          // Remove the deal from all associated listings
          await removeDealFromListings(deal._id.toString());

          // Mark the deal as inactive in the database
          await dealsModel.findByIdAndUpdate(
            deal._id,
            { $set: { isActive: false } }
          );

          expiredCount++;
          console.log(`Deal ${deal._id} expired and removed from listings`);
        } catch (error) {
          console.error(`Error processing expired deal ${deal._id}:`, error);
          // Continue with other deals even if one fails
        }
      }

      return {
        expired: expiredCount,
      };

    } catch (error) {
      console.error("Error in checkAndUpdateDeals:", error);
      return { expired: 0 };
    }
  },
};

export const applyDealToListings = async (dealId: string) => {
  try {
    console.log(`Applying deal ${dealId} to listings...`);

    const deal = await dealsModel.findById(dealId);
    if (!deal) {
      throw new Error('Deal not found');
    }

    if (!deal.isActive) {
      console.log('Deal is not active, skipping application');
      return;
    }

    // const now = new Date();
    // if (now < deal.startDate || now > deal.endDate) {
    //   console.log('Deal is not active based on date range');
    //   return;
    // }

    const dealInfo = {
      dealId: deal._id,
      dealType: deal.dealType,
      discountValue: deal.discountValue,
      startDate: deal.startDate,
      endDate: deal.endDate,
    };

    let updateResult;

    if (deal.selectionType === "products" && deal.products.length > 0) {
      console.log(`Applying to ${deal.products.length} products`);

      updateResult = await Listing.updateMany(
        { _id: { $in: deal.products } },
        {
          $set: { dealInfo: dealInfo },
          // $addToSet: { deals: deal._id } // optional: keep reference array
        }
      );

      console.log(`Updated ${updateResult.modifiedCount} listings`);

    } else if (deal.selectionType === "categories" && deal.categories.length > 0) {
      console.log(`Applying to categories: ${deal.categories}`);

      updateResult = await Listing.updateMany(
        { category: { $in: deal.categories } },
        {
          $set: { dealInfo: dealInfo },
          // $addToSet: { deals: deal._id } // optional: keep reference array
        }
      );

      console.log(`Updated ${updateResult.modifiedCount} listings in categories`);
    } else {
      console.log('No valid products or categories to apply deal to');
    }

    return updateResult;

  } catch (error) {
    console.error("Error in applyDealToListings:", error);
    throw error;
  }
}
// export const applyDealToListings = async (dealId: string) => {
//   try {

//     const deal = await dealsModel.findById(dealId);
//     if (!deal) {
//       throw new Error('Deal not found');
//     }
//     if (!deal.isActive) {
//       console.log('Deal is not active, skipping application');
//       return;
//     }
//     let updateResult;

//     if (deal.selectionType === "products" && deal.products.length > 0) {
//       // First, verify the products exist
//       updateResult = await Listing.updateMany(
//         { _id: { $in: deal.products } },
//         { $set: { deals: deal._id } }
//       );
//     }
//     // else if (deal.selectionType === "categories" && deal.categories.length > 0) {

//     //   updateResult = await Listing.updateMany(
//     //     { category: { $in: deal.categories } },
//     //     { $set: { deals: deal._id } }
//     //   );

//     // }
//     else {
//       console.log('No valid products or categories to apply deal to');
//     }

//     return updateResult;

//   } catch (error) {
//     console.error("Error in applyDealToListings:", error);
//     throw error;
//   }
// }

export const removeDealFromListings = async (dealId: string) => {
  try {
    const deal = await dealsModel.findById(dealId);
    if (!deal) throw new Error("Deal not found");

    const removeConditions: any = {
      $set: { dealInfo: null },
      $pull: { deals: deal._id }
    };

    if (deal.selectionType === "products" && deal.products.length > 0) {
      await Listing.updateMany(
        { _id: { $in: deal.products } },
        removeConditions
      );
    } else if (deal.selectionType === "categories" && deal.categories.length > 0) {
      await Listing.updateMany(
        { category: { $in: deal.categories } },
        removeConditions
      );
    }
  } catch (error) {
    console.error("Error removing deal from listings:", error);
    throw error;
  }
};

