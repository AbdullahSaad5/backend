import { Inventory, Listing, ProductCategory } from "@/models";
import mongoose from "mongoose";

// Request deduplication cache
const pendingRequests = new Map();
const filterCache = new Map();
const CACHE_TIMEOUT = 5 * 60 * 1000; // 5 minutes

// Helper function to get cached data or create new request
async function getCachedOrFetch<T>(
  key: string,
  fetchFunction: () => Promise<T>,
  cacheTimeout: number = CACHE_TIMEOUT
): Promise<T> {
  // Check cache first
  const cached = filterCache.get(key);
  if (cached && Date.now() - cached.timestamp < cacheTimeout) {
    return cached.data;
  }

  // Check if request is already pending
  if (pendingRequests.has(key)) {
    return pendingRequests.get(key);
  }

  // Create new request
  const request = fetchFunction();
  pendingRequests.set(key, request);

  try {
    const result = await request;

    // Cache the result
    filterCache.set(key, {
      data: result,
      timestamp: Date.now(),
    });

    // Remove from pending requests
    pendingRequests.delete(key);

    return result;
  } catch (error) {
    pendingRequests.delete(key);
    throw error;
  }
}

export const websiteService = {
  getFeaturedCategoriesForWebsite: () => {
    return ProductCategory.find({
      isFeatured: true,
      isBlocked: false,
    }).select("name description image tags isPart isFeatured");
  },

  getFeaturedListingsForWebsite: async () => {
    // First get all featured categories
    const featuredCategories = await ProductCategory.find({
      isFeatured: true,
      isBlocked: false,
    }).select("_id name description image tags isPart");

    // For each featured category, get up to 6 featured listings
    const categoriesWithListings = await Promise.all(
      featuredCategories.map(async (category) => {
        const featuredListings = await Listing.find({
          "productInfo.productCategory": category._id,
          isFeatured: true,
          isBlocked: false,
          publishToWebsite: true,
        })
          .populate("productInfo.productCategory")
          .populate("selectedStockId")
          .limit(6)
          .lean();

        // Transform listings to website format
        const transformedListings = featuredListings.map((listing: any) => {
          // Helper function to safely extract first value from marketplace arrays
          const getFirstValue = (array: any[], field: string) => {
            return array?.[0]?.[field] || "";
          };

          const itemName = getFirstValue(listing.productInfo?.item_name, "value");
          const brand = getFirstValue(listing.productInfo?.brand, "value");
          const description = getFirstValue(listing.productInfo?.product_description, "value");
          const condition = getFirstValue(listing.productInfo?.condition_type, "value");
          const cleanCondition = condition.replace(/^refurbished_/, "");

          return {
            id: listing._id,
            sku: listing.productInfo?.sku || "",
            name: itemName,
            brand: brand,
            description: description,
            condition: cleanCondition,
            pricing: {
              costPrice: listing.selectedStockId?.costPricePerUnit || 0,
              purchasePrice: listing.selectedStockId?.purchasePricePerUnit || 0,
              retailPrice: listing.prodPricing?.retailPrice || 0,
              listingQuantity: listing.prodPricing?.listingQuantity || 0,
              discountType: listing.prodPricing?.discountType || null,
              discountValue: listing.prodPricing?.discountValue || 0,
              vat: listing.prodPricing?.vat || 0,
              currency: "GBP",
            },
            stock: {
              available: listing.selectedStockId?.usableUnits || 0,
              threshold: listing.stockThreshold || 0,
              inStock: (listing.selectedStockId?.usableUnits || 0) > 0,
            },
            media: {
              images: listing.prodMedia?.images || [],
              videos: listing.prodMedia?.videos || [],
              offerImages: listing.prodMedia?.offerImages || [],
            },
            status: listing.status,
            listingHasVariations: listing.listingHasVariations || false,
            createdAt: listing.createdAt,
            updatedAt: listing.updatedAt,
            isFeatured: listing.isFeatured || false,
          };
        });

        return {
          category: {
            id: category._id,
            name: category.name,
            description: category.description,
            image: category.image,
            tags: category.tags,
            isPart: category.isPart,
          },
          listings: transformedListings,
          totalListings: transformedListings.length,
        };
      })
    );

    return categoriesWithListings;
  },

  getFeaturedListingsByCategoryId: async (categoryId: string) => {
    // First verify the category exists and is featured
    const category = await ProductCategory.findOne({
      _id: categoryId,
      isFeatured: true,
      isBlocked: false,
    }).select("_id name description image tags isPart");

    if (!category) {
      throw new Error("Category not found or not featured");
    }

    console.log("Found category:", {
      id: category._id,
      name: category.name,
      isFeatured: category.isFeatured,
      isBlocked: category.isBlocked,
    });

    // Convert categoryId to ObjectId for proper MongoDB query
    const categoryObjectId = new mongoose.Types.ObjectId(categoryId);

    // Get featured listings for this specific category
    const featuredListings = (await Listing.find({
      "productInfo.productCategory": categoryObjectId,
      isFeatured: true,
      isBlocked: false,
      publishToWebsite: true,
    })
      .populate("productInfo.productCategory")
      .populate("selectedStockId")
      .lean()) as any[];

    console.log("Featured Listings for Category:", categoryId, featuredListings);

    // Debug: Check if there are any listings with this category at all
    const allListingsWithCategory = (await Listing.find({
      "productInfo.productCategory": categoryObjectId,
    })
      .select("_id isFeatured isBlocked publishToWebsite status")
      .lean()) as any[];

    console.log("All listings with category:", categoryId, ":", allListingsWithCategory.length);
    console.log("Sample listings:", allListingsWithCategory.slice(0, 3));

    // Debug: Check if there are any featured listings at all
    const allFeaturedListings = (await Listing.find({
      isFeatured: true,
      isBlocked: false,
      publishToWebsite: true,
    })
      .select("_id productInfo.productCategory")
      .lean()) as any[];

    console.log("Total featured listings:", allFeaturedListings.length);
    console.log(
      "Featured listings categories:",
      allFeaturedListings.map((l: any) => l.productInfo?.productCategory).slice(0, 5)
    );

    // Additional debug: Check the exact query being executed
    console.log("Query being executed:", {
      "productInfo.productCategory": categoryObjectId,
      isFeatured: true,
      isBlocked: false,
      publishToWebsite: true,
    });

    // Debug: Check if there are any listings with this category without other filters
    const listingsWithCategoryOnly = (await Listing.find({
      "productInfo.productCategory": categoryObjectId,
    })
      .select("_id isFeatured isBlocked publishToWebsite status productInfo.productCategory")
      .lean()) as any[];

    console.log("Listings with category only (no other filters):", listingsWithCategoryOnly.length);
    console.log(
      "Sample of these listings:",
      listingsWithCategoryOnly.slice(0, 3).map((l: any) => ({
        id: l._id,
        isFeatured: l.isFeatured,
        isBlocked: l.isBlocked,
        publishToWebsite: l.publishToWebsite,
        status: l.status,
        category: l.productInfo?.productCategory,
      }))
    );

    // Transform listings to website format
    const transformedListings = featuredListings.map((listing: any) => {
      // Helper function to safely extract first value from marketplace arrays
      const getFirstValue = (array: any[], field: string) => {
        return array?.[0]?.[field] || "";
      };

      const itemName = getFirstValue(listing.productInfo?.item_name, "value");
      const brand = getFirstValue(listing.productInfo?.brand, "value");
      const description = getFirstValue(listing.productInfo?.product_description, "value");
      const condition = getFirstValue(listing.productInfo?.condition_type, "value");
      const cleanCondition = condition.replace(/^refurbished_/, "");

      return {
        id: listing._id,
        sku: listing.productInfo?.sku || "",
        name: itemName,
        brand: brand,
        description: description,
        condition: cleanCondition,
        pricing: {
          costPrice: listing.selectedStockId?.costPricePerUnit || 0,
          purchasePrice: listing.selectedStockId?.purchasePricePerUnit || 0,
          retailPrice: listing.prodPricing?.retailPrice || 0,
          listingQuantity: listing.prodPricing?.listingQuantity || 0,
          discountType: listing.prodPricing?.discountType || null,
          discountValue: listing.prodPricing?.discountValue || 0,
          vat: listing.prodPricing?.vat || 0,
          currency: "GBP",
        },
        stock: {
          available: listing.selectedStockId?.usableUnits || 0,
          threshold: listing.stockThreshold || 0,
          inStock: (listing.selectedStockId?.usableUnits || 0) > 0,
        },
        media: {
          images: listing.prodMedia?.images || [],
          videos: listing.prodMedia?.videos || [],
          offerImages: listing.prodMedia?.offerImages || [],
        },
        status: listing.status,
        listingHasVariations: listing.listingHasVariations || false,
        createdAt: listing.createdAt,
        updatedAt: listing.updatedAt,
        isFeatured: listing.isFeatured || false,
      };
    });

    return {
      category: {
        id: category._id,
        name: category.name,
        description: category.description,
        image: category.image,
        tags: category.tags,
        isPart: category.isPart,
      },
      listings: transformedListings,
      totalListings: transformedListings.length,
    };
  },

  // Get all Published Listings for website
  allWebsiteListings: async (filters: any = {}) => {
    try {
      const {
        searchQuery = "",
        status,
        listingType,
        productCategory,
        startDate,
        endDate,
        isBlocked,
        isFeatured,
        page = 1,
        limit = 10,
      } = filters;

      const pageNumber = Math.max(parseInt(page, 10) || 1, 1);
      const limitNumber = parseInt(limit, 10) || 10;
      const skip = (pageNumber - 1) * limitNumber;

      const query: any = {
        publishToWebsite: true, // Only get listings published to website
      };

      // Handle isBlocked filter - only apply default if not explicitly provided
      if (isBlocked !== undefined) {
        query.isBlocked = isBlocked;
      } else {
        // Default to non-blocked listings only if no explicit isBlocked filter
        query.isBlocked = false;
      }

      if (searchQuery) {
        // Base search fields
        query.$or = [
          {
            "productInfo.item_name.value": {
              $regex: searchQuery,
              $options: "i",
            },
          },
          { "productInfo.brand.value": { $regex: searchQuery, $options: "i" } },
          { "prodPricing.condition": { $regex: searchQuery, $options: "i" } },
        ];

        // Search productCategory and productSupplier in parallel
        const [productCategories] = await Promise.all([
          ProductCategory.find({
            name: { $regex: searchQuery, $options: "i" },
          }).select("_id"),
        ]);

        // Add ObjectId-based search conditions
        query.$or.push({
          "productInfo.productCategory": {
            $in: productCategories.map((c) => c._id),
          },
        });
      }

      if (status && ["draft", "published"].includes(status)) {
        query.status = status;
      }

      if (listingType && ["product", "part", "bundle"].includes(listingType)) {
        query.listingType = listingType;
      }

      if (isFeatured !== undefined) {
        query.isFeatured = isFeatured;
      }

      // Filter by ProductCategory if provided
      if (productCategory) {
        // Validate if it's a valid MongoDB ObjectId
        if (mongoose.isValidObjectId(productCategory)) {
          query["productInfo.productCategory"] = new mongoose.Types.ObjectId(productCategory);
        } else {
          // If it's not a valid ObjectId, search by category name
          const categoryIds = await ProductCategory.find({
            name: { $regex: productCategory, $options: "i" },
          }).select("_id");

          if (categoryIds.length > 0) {
            query["productInfo.productCategory"] = {
              $in: categoryIds.map((c) => c._id),
            };
          } else {
            // If no matching categories found, return empty result
            query["productInfo.productCategory"] = null;
          }
        }
      }

      if (startDate || endDate) {
        const dateFilter: any = {};
        if (startDate && !isNaN(Date.parse(startDate))) {
          dateFilter.$gte = new Date(startDate);
        }
        if (endDate && !isNaN(Date.parse(endDate))) {
          dateFilter.$lte = new Date(endDate);
        }
        if (Object.keys(dateFilter).length > 0) {
          query.createdAt = dateFilter;
        }
      }

      console.log("Website listings query:", JSON.stringify(query, null, 2));

      const listings = await Listing.find(query)
        .populate("productInfo.productCategory")
        .populate("productInfo.productSupplier")
        .populate("selectedStockId")
        .populate("prodPricing.selectedVariations.variationId")
        .skip(skip)
        .limit(limitNumber)
        .lean();

      const totalListings = await Listing.countDocuments(query);

      // Helper function to safely extract first value from marketplace arrays
      const getFirstValue = (array: any[], field: string) => {
        return array?.[0]?.[field] || "";
      };

      // Transform listings to desired format
      const transformedProducts = listings.map((listing: any) => {
        // Extract item name from the first marketplace entry
        const itemName = getFirstValue((listing as any).productInfo?.item_name, "value");

        // Extract brand from the first marketplace entry
        const brand = getFirstValue((listing as any).productInfo?.brand, "value");

        // Extract description from the first marketplace entry
        const description = getFirstValue((listing as any).productInfo?.product_description, "value");

        // Extract condition from the first marketplace entry
        const condition = getFirstValue((listing as any).productInfo?.condition_type, "value");

        // Extract marketplace and language from the first entry
        const marketplace = getFirstValue((listing as any).productInfo?.item_name, "marketplace_id");
        const language = getFirstValue((listing as any).productInfo?.item_name, "language_tag");

        // Clean up condition value (remove marketplace prefix if present)
        const cleanCondition = condition.replace(/^refurbished_/, "");

        return {
          id: listing._id,
          sku: (listing as any).productInfo?.sku || "",
          name: itemName,
          brand: brand,
          category: (listing as any).productInfo?.productCategory
            ? {
                id: (listing as any).productInfo.productCategory._id,
                name: (listing as any).productInfo.productCategory.name || "",
                description: (listing as any).productInfo.productCategory.description || "",
                image: (listing as any).productInfo.productCategory.image || "",
                tags: (listing as any).productInfo.productCategory.tags || [],
              }
            : null,
          description: description,
          condition: cleanCondition,
          pricing: {
            costPrice: (listing as any).selectedStockId?.costPricePerUnit || 0,
            purchasePrice: (listing as any).selectedStockId?.purchasePricePerUnit || 0,
            retailPrice: (listing as any).prodPricing?.retailPrice || 0,
            listingQuantity: (listing as any).prodPricing?.listingQuantity || 0,
            discountType: (listing as any).prodPricing?.discountType || null,
            discountValue: (listing as any).prodPricing?.discountValue || 0,
            vat: (listing as any).prodPricing?.vat || 0,
            selectedVariations:
              (listing as any).prodPricing?.selectedVariations?.map((variation: any) => ({
                variationId: variation.variationId?._id || variation.variationId,
                retailPrice: variation.retailPrice || 0,
                listingQuantity: variation.listingQuantity || 0,
                offerImages: variation.offerImages || [],
                // Include populated variation details if available
                variationDetails: variation.variationId
                  ? {
                      id: variation.variationId._id,
                      attributes: variation.variationId.attributes || {},
                      isSelected: variation.variationId.isSelected || false,
                      isBundleVariation: variation.variationId.isBundleVariation || false,
                      createdAt: variation.variationId.createdAt,
                      updatedAt: variation.variationId.updatedAt,
                    }
                  : null,
              })) || [],
            currency: "GBP", // Default currency
          },
          stock: {
            available: (listing as any).selectedStockId?.usableUnits || 0,
            threshold: (listing as any).stockThreshold || 0,
            inStock: ((listing as any).selectedStockId?.usableUnits || 0) > 0,
          },
          media: {
            images: (listing as any).prodMedia?.images || [],
            videos: (listing as any).prodMedia?.videos || [],
            offerImages: (listing as any).prodMedia?.offerImages || [],
          },
          platforms: {
            website: (listing as any).publishToWebsite || false,
            ebay: (listing as any).publishToEbay || false,
            amazon: (listing as any).publishToAmazon || false,
          },
          technicalInfo: (() => {
            const techInfo = (listing as any).prodTechInfo || {};
            // Filter out unwanted fields
            const {
              unit_quantity,
              unit_type,
              item_height,
              item_length,
              item_width,
              item_weight,
              country_region_of_manufacture,
              mpn,
              hard_drive_capacity,
              ...filteredTechInfo
            } = techInfo;
            return filteredTechInfo;
          })(),
          status: (listing as any).status,
          listingHasVariations: (listing as any).listingHasVariations || false,
          marketplace: marketplace,
          language: language,
          createdAt: (listing as any).createdAt,
          updatedAt: (listing as any).updatedAt,
          isFeatured: (listing as any).isFeatured || false,
        };
      });

      return {
        products: transformedProducts,
        pagination: {
          total: totalListings,
          page: pageNumber,
          totalPages: Math.ceil(totalListings / limitNumber),
          perPage: limitNumber,
        },
      };
    } catch (error) {
      console.error("Error fetching Website listings:", error);
      throw new Error("Error fetching Website listings");
    }
  },

  // Get filtered Website listings with category-specific filters
  getFilteredWebsiteListings: async (filters: any = {}) => {
    try {
      const {
        searchQuery = "",
        status,
        listingType,
        productCategory,
        startDate,
        endDate,
        isBlocked,
        isFeatured,
        page = 1,
        limit = 10,
        priceRange,
        brand,
        condition,
        inStock,
        attributes,
        sortBy = "createdAt",
        sortOrder = "desc",
      } = filters;

      const pageNumber = Math.max(parseInt(page, 10) || 1, 1);
      const limitNumber = parseInt(limit, 10) || 10;
      const skip = (pageNumber - 1) * limitNumber;

      const query: any = {
        publishToWebsite: true,
      };

      // Handle isBlocked filter
      if (isBlocked !== undefined) {
        query.isBlocked = isBlocked;
      } else {
        query.isBlocked = false;
      }

      // Basic filters
      if (searchQuery) {
        query.$or = [
          {
            "productInfo.item_name.value": {
              $regex: searchQuery,
              $options: "i",
            },
          },
          { "productInfo.brand.value": { $regex: searchQuery, $options: "i" } },
          { "prodPricing.condition": { $regex: searchQuery, $options: "i" } },
        ];

        const [productCategories] = await Promise.all([
          ProductCategory.find({
            name: { $regex: searchQuery, $options: "i" },
          }).select("_id"),
        ]);

        query.$or.push({
          "productInfo.productCategory": {
            $in: productCategories.map((c) => c._id),
          },
        });
      }

      if (status && ["draft", "published"].includes(status)) {
        query.status = status;
      }

      if (listingType && ["product", "part", "bundle"].includes(listingType)) {
        query.listingType = listingType;
      }

      if (isFeatured !== undefined) {
        query.isFeatured = isFeatured;
      }

      // Product category filter
      if (productCategory) {
        if (mongoose.isValidObjectId(productCategory)) {
          query["productInfo.productCategory"] = new mongoose.Types.ObjectId(productCategory);
        } else {
          const categoryIds = await ProductCategory.find({
            name: { $regex: productCategory, $options: "i" },
          }).select("_id");

          if (categoryIds.length > 0) {
            query["productInfo.productCategory"] = {
              $in: categoryIds.map((c) => c._id),
            };
          } else {
            query["productInfo.productCategory"] = null;
          }
        }
      }

      // Date filters
      if (startDate || endDate) {
        const dateFilter: any = {};
        if (startDate && !isNaN(Date.parse(startDate))) {
          dateFilter.$gte = new Date(startDate);
        }
        if (endDate && !isNaN(Date.parse(endDate))) {
          dateFilter.$lte = new Date(endDate);
        }
        if (Object.keys(dateFilter).length > 0) {
          query.createdAt = dateFilter;
        }
      }

      // Price range filter
      if (priceRange) {
        const priceQuery: any = {};
        if (priceRange.min !== undefined) {
          priceQuery.$gte = priceRange.min;
        }
        if (priceRange.max !== undefined) {
          priceQuery.$lte = priceRange.max;
        }
        if (Object.keys(priceQuery).length > 0) {
          query["prodPricing.retailPrice"] = priceQuery;
        }
      }

      // Brand filter
      if (brand && brand.length > 0) {
        query["productInfo.brand.value"] = { $in: brand };
      }

      // Condition filter
      if (condition && condition.length > 0) {
        query["productInfo.condition_type.value"] = { $in: condition };
      }

      // Stock filter
      if (inStock !== undefined) {
        if (inStock) {
          query["selectedStockId.usableUnits"] = { $gt: 0 };
        } else {
          query["selectedStockId.usableUnits"] = { $lte: 0 };
        }
      }

      // Dynamic attributes filter
      if (attributes && Object.keys(attributes).length > 0) {
        Object.entries(attributes).forEach(([key, value]) => {
          if (value !== undefined && value !== null && value !== "") {
            if (Array.isArray(value)) {
              query[`prodTechInfo.${key}`] = { $in: value };
            } else {
              query[`prodTechInfo.${key}`] = value;
            }
          }
        });
      }

      console.log("Filtered Website listings query:", JSON.stringify(query, null, 2));

      // Build sort object
      const sortObj: any = {};
      if (sortBy === "price") {
        sortObj["prodPricing.retailPrice"] = sortOrder === "asc" ? 1 : -1;
      } else if (sortBy === "name") {
        sortObj["productInfo.item_name.value"] = sortOrder === "asc" ? 1 : -1;
      } else if (sortBy === "createdAt") {
        sortObj.createdAt = sortOrder === "asc" ? 1 : -1;
      } else if (sortBy === "updatedAt") {
        sortObj.updatedAt = sortOrder === "asc" ? 1 : -1;
      } else {
        sortObj.createdAt = -1; // Default sort
      }

      const listings = await Listing.find(query)
        .populate("productInfo.productCategory")
        .populate("productInfo.productSupplier")
        .populate("selectedStockId")
        .populate("prodPricing.selectedVariations.variationId")
        .sort(sortObj)
        .skip(skip)
        .limit(limitNumber)
        .lean();

      const totalListings = await Listing.countDocuments(query);

      // Transform listings (reuse the same transformation logic)
      const transformedProducts = listings.map((listing: any) => {
        const getFirstValue = (array: any[], field: string) => {
          return array?.[0]?.[field] || "";
        };

        const itemName = getFirstValue(listing.productInfo?.item_name, "value");
        const brand = getFirstValue(listing.productInfo?.brand, "value");
        const description = getFirstValue(listing.productInfo?.product_description, "value");
        const condition = getFirstValue(listing.productInfo?.condition_type, "value");
        const marketplace = getFirstValue(listing.productInfo?.item_name, "marketplace_id");
        const language = getFirstValue(listing.productInfo?.item_name, "language_tag");
        const cleanCondition = condition.replace(/^refurbished_/, "");

        return {
          id: listing._id,
          sku: listing.productInfo?.sku || "",
          name: itemName,
          brand: brand,
          category: listing.productInfo?.productCategory
            ? {
                id: listing.productInfo.productCategory._id,
                name: listing.productInfo.productCategory.name || "",
                description: listing.productInfo.productCategory.description || "",
                image: listing.productInfo.productCategory.image || "",
                tags: listing.productInfo.productCategory.tags || [],
              }
            : null,
          description: description,
          condition: cleanCondition,
          pricing: {
            costPrice: listing.selectedStockId?.costPricePerUnit || 0,
            purchasePrice: listing.selectedStockId?.purchasePricePerUnit || 0,
            retailPrice: listing.prodPricing?.retailPrice || 0,
            listingQuantity: listing.prodPricing?.listingQuantity || 0,
            discountType: listing.prodPricing?.discountType || null,
            discountValue: listing.prodPricing?.discountValue || 0,
            vat: listing.prodPricing?.vat || 0,
            selectedVariations:
              listing.prodPricing?.selectedVariations?.map((variation: any) => ({
                variationId: variation.variationId?._id || variation.variationId,
                retailPrice: variation.retailPrice || 0,
                listingQuantity: variation.listingQuantity || 0,
                offerImages: variation.offerImages || [],
                variationDetails: variation.variationId
                  ? {
                      id: variation.variationId._id,
                      attributes: variation.variationId.attributes || {},
                      isSelected: variation.variationId.isSelected || false,
                      isBundleVariation: variation.variationId.isBundleVariation || false,
                      createdAt: variation.variationId.createdAt,
                      updatedAt: variation.variationId.updatedAt,
                    }
                  : null,
              })) || [],
            currency: "GBP",
          },
          stock: {
            available: listing.selectedStockId?.usableUnits || 0,
            threshold: listing.stockThreshold || 0,
            inStock: (listing.selectedStockId?.usableUnits || 0) > 0,
          },
          media: {
            images: listing.prodMedia?.images || [],
            videos: listing.prodMedia?.videos || [],
            offerImages: listing.prodMedia?.offerImages || [],
          },
          platforms: {
            website: listing.publishToWebsite || false,
            ebay: listing.publishToEbay || false,
            amazon: listing.publishToAmazon || false,
          },
          technicalInfo: (() => {
            const techInfo = listing.prodTechInfo || {};
            const {
              unit_quantity,
              unit_type,
              item_height,
              item_length,
              item_width,
              item_weight,
              country_region_of_manufacture,
              mpn,
              hard_drive_capacity,
              ...filteredTechInfo
            } = techInfo;
            return filteredTechInfo;
          })(),
          status: listing.status,
          listingHasVariations: listing.listingHasVariations || false,
          marketplace: marketplace,
          language: language,
          createdAt: listing.createdAt,
          updatedAt: listing.updatedAt,
          isFeatured: listing.isFeatured || false,
        };
      });

      return {
        products: transformedProducts,
        pagination: {
          total: totalListings,
          page: pageNumber,
          totalPages: Math.ceil(totalListings / limitNumber),
          perPage: limitNumber,
        },
        appliedFilters: filters,
      };
    } catch (error) {
      console.error("Error fetching filtered Website listings:", error);
      throw new Error("Error fetching filtered Website listings");
    }
  },

  // Get available filters for a specific category
  getCategoryFilters: async (categoryId: string) => {
    const cacheKey = `category_filters_${categoryId}`;

    return getCachedOrFetch(cacheKey, async () => {
      try {
        // Verify category exists
        const category = await ProductCategory.findById(categoryId);
        if (!category) {
          throw new Error("Category not found");
        }

        // Get all listings for this category
        const listings = await Listing.find({
          "productInfo.productCategory": new mongoose.Types.ObjectId(categoryId),
          publishToWebsite: true,
          isBlocked: false,
        })
          .populate("selectedStockId")
          .lean();

        if (listings.length === 0) {
          return {
            category: {
              id: category._id,
              name: category.name,
              description: category.description,
            },
            filters: {
              priceRange: { min: 0, max: 0 },
              brands: [],
              conditions: [],
              stockStatus: [],
              attributes: {},
            },
            totalProducts: 0,
          };
        }

        // Extract filter values
        const prices = listings
          .map((listing: any) => listing.prodPricing?.retailPrice || 0)
          .filter((price: number) => price > 0);

        const brands = [
          ...new Set(listings.map((listing: any) => listing.productInfo?.brand?.[0]?.value).filter(Boolean)),
        ];

        const conditions = [
          ...new Set(listings.map((listing: any) => listing.productInfo?.condition_type?.[0]?.value).filter(Boolean)),
        ];

        const stockStatus = [
          ...new Set(listings.map((listing: any) => (listing.selectedStockId?.usableUnits || 0) > 0).filter(Boolean)),
        ];

        // Extract dynamic attributes from technical info
        const attributes: any = {};
        listings.forEach((listing: any) => {
          if (listing.prodTechInfo) {
            Object.entries(listing.prodTechInfo).forEach(([key, value]) => {
              if (value !== undefined && value !== null && value !== "") {
                if (!attributes[key]) {
                  attributes[key] = new Set();
                }
                if (Array.isArray(value)) {
                  value.forEach((v) => attributes[key].add(v));
                } else {
                  attributes[key].add(value);
                }
              }
            });
          }
        });

        // Convert sets to arrays
        Object.keys(attributes).forEach((key) => {
          attributes[key] = Array.from(attributes[key]);
        });

        return {
          category: {
            id: category._id,
            name: category.name,
            description: category.description,
          },
          filters: {
            priceRange: {
              min: Math.min(...prices),
              max: Math.max(...prices),
            },
            brands: brands.sort(),
            conditions: conditions.sort(),
            stockStatus: stockStatus,
            attributes: attributes,
          },
          totalProducts: listings.length,
        };
      } catch (error) {
        console.error("Error getting category filters:", error);
        throw error;
      }
    });
  },

  // Get all available filters across categories
  getAllAvailableFilters: async () => {
    const cacheKey = "all_available_filters";

    return getCachedOrFetch(cacheKey, async () => {
      try {
        // Get all published listings
        const listings = await Listing.find({
          publishToWebsite: true,
          isBlocked: false,
        })
          .populate("productInfo.productCategory")
          .populate("selectedStockId")
          .lean();

        if (listings.length === 0) {
          return {
            globalFilters: {
              priceRange: { min: 0, max: 0 },
              brands: [],
              conditions: [],
              listingTypes: [],
              stockStatus: [],
            },
            categoryFilters: {},
            totalProducts: 0,
          };
        }

        // Global filters
        const prices = listings
          .map((listing: any) => listing.prodPricing?.retailPrice || 0)
          .filter((price: number) => price > 0);

        const brands = [
          ...new Set(listings.map((listing: any) => listing.productInfo?.brand?.[0]?.value).filter(Boolean)),
        ];

        const conditions = [
          ...new Set(listings.map((listing: any) => listing.productInfo?.condition_type?.[0]?.value).filter(Boolean)),
        ];

        const listingTypes = [...new Set(listings.map((listing: any) => listing.listingType).filter(Boolean))];

        const stockStatus = [
          ...new Set(listings.map((listing: any) => (listing.selectedStockId?.usableUnits || 0) > 0).filter(Boolean)),
        ];

        // Group by category
        const categoryGroups: any = {};
        listings.forEach((listing: any) => {
          const categoryId = listing.productInfo?.productCategory?._id;
          if (categoryId) {
            if (!categoryGroups[categoryId]) {
              categoryGroups[categoryId] = {
                category: listing.productInfo.productCategory,
                listings: [],
              };
            }
            categoryGroups[categoryId].listings.push(listing);
          }
        });

        // Generate category-specific filters
        const categoryFilters: any = {};
        Object.entries(categoryGroups).forEach(([categoryId, group]: [string, any]) => {
          const categoryListings = group.listings;

          const categoryPrices = categoryListings
            .map((listing: any) => listing.prodPricing?.retailPrice || 0)
            .filter((price: number) => price > 0);

          const categoryBrands = [
            ...new Set(categoryListings.map((listing: any) => listing.productInfo?.brand?.[0]?.value).filter(Boolean)),
          ];

          const categoryConditions = [
            ...new Set(
              categoryListings.map((listing: any) => listing.productInfo?.condition_type?.[0]?.value).filter(Boolean)
            ),
          ];

          // Extract dynamic attributes
          const attributes: any = {};
          categoryListings.forEach((listing: any) => {
            if (listing.prodTechInfo) {
              Object.entries(listing.prodTechInfo).forEach(([key, value]) => {
                if (value !== undefined && value !== null && value !== "") {
                  if (!attributes[key]) {
                    attributes[key] = new Set();
                  }
                  if (Array.isArray(value)) {
                    value.forEach((v) => attributes[key].add(v));
                  } else {
                    attributes[key].add(value);
                  }
                }
              });
            }
          });

          // Convert sets to arrays
          Object.keys(attributes).forEach((key) => {
            attributes[key] = Array.from(attributes[key]);
          });

          categoryFilters[categoryId] = {
            category: {
              id: group.category._id,
              name: group.category.name,
              description: group.category.description,
            },
            filters: {
              priceRange: {
                min: Math.min(...categoryPrices),
                max: Math.max(...categoryPrices),
              },
              brands: categoryBrands.sort(),
              conditions: categoryConditions.sort(),
              attributes: attributes,
            },
            totalProducts: categoryListings.length,
          };
        });

        return {
          globalFilters: {
            priceRange: {
              min: Math.min(...prices),
              max: Math.max(...prices),
            },
            brands: brands.sort(),
            conditions: conditions.sort(),
            listingTypes: listingTypes.sort(),
            stockStatus: stockStatus,
          },
          categoryFilters: categoryFilters,
          totalProducts: listings.length,
        };
      } catch (error) {
        console.error("Error getting all available filters:", error);
        throw error;
      }
    });
  },

  // Get single Website product by ID
  getWebsiteProductById: async (id: string) => {
    try {
      const query = {
        _id: new mongoose.Types.ObjectId(id),
        publishToWebsite: true, // Only get listings published to website
        isBlocked: false, // Only non-blocked listings
      };

      const listing: any = await Listing.findOne(query)
        .populate("productInfo.productCategory")
        .populate("productInfo.productSupplier")
        .populate("selectedStockId")
        .populate("prodPricing.selectedVariations.variationId")
        .lean();

      if (!listing) {
        return null;
      }

      // Helper function to safely extract first value from marketplace arrays
      const getFirstValue = (array: any[], field: string) => {
        return array?.[0]?.[field] || "";
      };

      // Extract item name from the first marketplace entry
      const itemName = getFirstValue((listing as any).productInfo?.item_name, "value");

      // Extract brand from the first marketplace entry
      const brand = getFirstValue((listing as any).productInfo?.brand, "value");

      // Extract description from the first marketplace entry
      const description = getFirstValue((listing as any).productInfo?.product_description, "value");

      // Extract condition from the first marketplace entry
      const condition = getFirstValue((listing as any).productInfo?.condition_type, "value");

      // Extract marketplace and language from the first entry
      const marketplace = getFirstValue((listing as any).productInfo?.item_name, "marketplace_id");
      const language = getFirstValue((listing as any).productInfo?.item_name, "language_tag");

      // Clean up condition value (remove marketplace prefix if present)
      const cleanCondition = condition.replace(/^refurbished_/, "");

      console.log("listinglisting : ", listing);

      return {
        id: listing._id,
        sku: listing.productInfo?.sku || "",
        name: itemName,
        brand: brand,
        category: listing.productInfo?.productCategory
          ? {
              id: listing.productInfo.productCategory._id,
              name: listing.productInfo.productCategory.name || "",
              description: listing.productInfo.productCategory.description || "",
              image: listing.productInfo.productCategory.image || "",
              tags: listing.productInfo.productCategory.tags || [],
            }
          : null,
        description: description,
        condition: cleanCondition,
        pricing: {
          costPrice: listing.selectedStockId?.costPricePerUnit || 0,
          purchasePrice: listing.selectedStockId?.purchasePricePerUnit || 0,
          retailPrice: listing.prodPricing?.retailPrice || 0,
          listingQuantity: listing.prodPricing?.listingQuantity || 0,
          discountType: listing.prodPricing?.discountType || null,
          discountValue: listing.prodPricing?.discountValue || 0,
          vat: listing.prodPricing?.vat || 0,
          selectedVariations:
            listing.prodPricing?.selectedVariations?.map((variation: any) => ({
              variationId: variation.variationId?._id || variation.variationId,
              retailPrice: variation.retailPrice || 0,
              listingQuantity: variation.listingQuantity || 0,
              offerImages: variation.offerImages || [],
              // Include populated variation details if available
              variationDetails: variation.variationId
                ? {
                    id: variation.variationId._id,
                    attributes: variation.variationId.attributes || {},
                    isSelected: variation.variationId.isSelected || false,
                    isBundleVariation: variation.variationId.isBundleVariation || false,
                    createdAt: variation.variationId.createdAt,
                    updatedAt: variation.variationId.updatedAt,
                  }
                : null,
            })) || [],
          currency: "GBP", // Default currency
        },
        stock: {
          available: listing.selectedStockId?.usableUnits || 0,
          threshold: listing.stockThreshold || 0,
          inStock: (listing.selectedStockId?.usableUnits || 0) > 0,
        },
        media: {
          images: listing.prodMedia?.images || [],
          videos: listing.prodMedia?.videos || [],
          offerImages: listing.prodMedia?.offerImages || [],
        },
        platforms: {
          website: listing.publishToWebsite || false,
          ebay: listing.publishToEbay || false,
          amazon: listing.publishToAmazon || false,
        },
        technicalInfo: (() => {
          const techInfo = listing.prodTechInfo || {};
          // Filter out unwanted fields
          const {
            unit_quantity,
            unit_type,
            item_height,
            item_length,
            item_width,
            item_weight,
            country_region_of_manufacture,
            mpn,
            hard_drive_capacity,
            ...filteredTechInfo
          } = techInfo;
          return filteredTechInfo;
        })(),
        status: listing.status,
        listingHasVariations: listing.listingHasVariations,
        marketplace: marketplace,
        language: language,
        createdAt: listing.createdAt,
        updatedAt: listing.updatedAt,
        isFeatured: listing.isFeatured || false,
      };
    } catch (error) {
      console.error("Error fetching Website product:", error);
      throw new Error("Error fetching Website product");
    }
  },
};
