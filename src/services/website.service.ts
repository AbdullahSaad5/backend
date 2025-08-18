import { Inventory, Listing, ProductCategory } from "@/models";
import mongoose from "mongoose";

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
          'productInfo.productCategory': category._id,
          isFeatured: true,
          isBlocked: false,
          publishToWebsite: true,
        })
        .populate('productInfo.productCategory')
        .populate('selectedStockId')
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

    // Get featured listings for this specific category
    const featuredListings = await Listing.find({
      'productInfo.productCategory': categoryId,
      isFeatured: true,
      isBlocked: false,
      publishToWebsite: true,
    })
    .populate('productInfo.productCategory')
    .populate('selectedStockId')
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
          query["productInfo.productCategory"] = new mongoose.Types.ObjectId(
            productCategory
          );
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
        const itemName = getFirstValue(
          (listing as any).productInfo?.item_name,
          "value"
        );

        // Extract brand from the first marketplace entry
        const brand = getFirstValue(
          (listing as any).productInfo?.brand,
          "value"
        );

        // Extract description from the first marketplace entry
        const description = getFirstValue(
          (listing as any).productInfo?.product_description,
          "value"
        );

        // Extract condition from the first marketplace entry
        const condition = getFirstValue(
          (listing as any).productInfo?.condition_type,
          "value"
        );

        // Extract marketplace and language from the first entry
        const marketplace = getFirstValue(
          (listing as any).productInfo?.item_name,
          "marketplace_id"
        );
        const language = getFirstValue(
          (listing as any).productInfo?.item_name,
          "language_tag"
        );

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
                description:
                  (listing as any).productInfo.productCategory.description ||
                  "",
                image: (listing as any).productInfo.productCategory.image || "",
                tags: (listing as any).productInfo.productCategory.tags || [],
              }
            : null,
          description: description,
          condition: cleanCondition,
          pricing: {
            costPrice: (listing as any).selectedStockId?.costPricePerUnit || 0,
            purchasePrice:
              (listing as any).selectedStockId?.purchasePricePerUnit || 0,
            retailPrice: (listing as any).prodPricing?.retailPrice || 0,
            listingQuantity: (listing as any).prodPricing?.listingQuantity || 0,
            discountType: (listing as any).prodPricing?.discountType || null,
            discountValue: (listing as any).prodPricing?.discountValue || 0,
            vat: (listing as any).prodPricing?.vat || 0,
            selectedVariations: (listing as any).prodPricing?.selectedVariations?.map((variation: any) => ({
              variationId: variation.variationId?._id || variation.variationId,
              retailPrice: variation.retailPrice || 0,
              listingQuantity: variation.listingQuantity || 0,
              offerImages: variation.offerImages || [],
              // Include populated variation details if available
              variationDetails: variation.variationId ? {
                id: variation.variationId._id,
                attributes: variation.variationId.attributes || {},
                isSelected: variation.variationId.isSelected || false,
                isBundleVariation: variation.variationId.isBundleVariation || false,
                createdAt: variation.variationId.createdAt,
                updatedAt: variation.variationId.updatedAt,
              } : null,
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
      const itemName = getFirstValue(
        (listing as any).productInfo?.item_name,
        "value"
      );

      // Extract brand from the first marketplace entry
      const brand = getFirstValue((listing as any).productInfo?.brand, "value");

      // Extract description from the first marketplace entry
      const description = getFirstValue(
        (listing as any).productInfo?.product_description,
        "value"
      );

      // Extract condition from the first marketplace entry
      const condition = getFirstValue(
        (listing as any).productInfo?.condition_type,
        "value"
      );

      // Extract marketplace and language from the first entry
      const marketplace = getFirstValue(
        (listing as any).productInfo?.item_name,
        "marketplace_id"
      );
      const language = getFirstValue(
        (listing as any).productInfo?.item_name,
        "language_tag"
      );

      // Clean up condition value (remove marketplace prefix if present)
      const cleanCondition = condition.replace(/^refurbished_/, "");

      console.log("listinglisting : " , listing)

      return {
        id: listing._id,
        sku: listing.productInfo?.sku || "",
        name: itemName,
        brand: brand,
        category: listing.productInfo?.productCategory
          ? {
              id: listing.productInfo.productCategory._id,
              name: listing.productInfo.productCategory.name || "",
              description:
                listing.productInfo.productCategory.description || "",
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
          selectedVariations: listing.prodPricing?.selectedVariations?.map((variation: any) => ({
            variationId: variation.variationId?._id || variation.variationId,
            retailPrice: variation.retailPrice || 0,
            listingQuantity: variation.listingQuantity || 0,
            offerImages: variation.offerImages || [],
            // Include populated variation details if available
            variationDetails: variation.variationId ? {
              id: variation.variationId._id,
              attributes: variation.variationId.attributes || {},
              isSelected: variation.variationId.isSelected || false,
              isBundleVariation: variation.variationId.isBundleVariation || false,
              createdAt: variation.variationId.createdAt,
              updatedAt: variation.variationId.updatedAt,
            } : null,
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
