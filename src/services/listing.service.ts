import { Listing, User } from "@/models";
import Papa from "papaparse";
import mongoose from "mongoose";
import fs from "fs";

export const listingService = {
  // Create a new draft listing
  createDraftListingService: async (stepData: any) => {
    try {
      if (!stepData || typeof stepData !== "object") {
        throw new Error("Invalid or missing 'stepData'");
      }

      // console.log("step Data : ", stepData);

      if (!stepData.productInfo || typeof stepData.productInfo !== "object") {
        throw new Error("Invalid or missing 'productInfo' in stepData");
      }

      const { kind, title, description, brand, productCategory } = stepData.productInfo;
      const { inventoryId } = stepData;

      if (!kind || !Listing.discriminators || !Listing.discriminators[kind]) {
        throw new Error("Invalid or missing 'kind' (listing type)");
      }

      const productInfo = {
        kind,
        title: title || "",
        description: description || "",
        brand: brand || "",
        productCategory: productCategory || "",
      };

      const draftListingData: any = {
        status: "draft",
        isBlocked: false,
        kind,
        inventoryId,
        publishToEbay: stepData.publishToEbay || false,
        publishToAmazon: stepData.publishToAmazon || false,
        publishToWebsite: stepData.publishToWebsite || false,
        selectedStockId: stepData.selectedStockId || "",
        productInfo,
        prodPricing: stepData.prodPricing || {},
        prodMedia: stepData.prodMedia || {},
        prodTechInfo: stepData.prodTechInfo || {},
        prodDelivery: stepData.prodDelivery || {},
        prodSeo: stepData.prodSeo || {},
      };

      // ✅ Remove fields if they are null or undefined
      if (draftListingData.prodTechInfo?.ean == null) {
        delete draftListingData.prodTechInfo.ean;
      }

      // Remove undefined values
      Object.keys(draftListingData).forEach((key) => {
        if (typeof draftListingData[key] === "object" && draftListingData[key]) {
          Object.keys(draftListingData[key]).forEach((subKey) => {
            if (draftListingData[key][subKey] === undefined) {
              delete draftListingData[key][subKey];
            }
          });
        }
      });

      const draftListing = new Listing.discriminators[kind](draftListingData);
      await draftListing.save({ validateBeforeSave: false });

      return draftListing;
    } catch (error: any) {
      console.error("Error creating draft listing:", error);
      throw new Error(error.message || "Failed to create draft listing");
    }
  },

  // Update an existing draft listing when user move to next stepper
  updateDraftListing: async (listingId: string, stepData: any) => {
    try {
      console.log("Received update request:", { listingId, stepData });

      // Validate listingId
      if (!mongoose.isValidObjectId(listingId)) {
        throw new Error("Invalid listing ID");
      }

      // Find listing
      const draftListing: any = await Listing.findById(listingId);
      if (!draftListing) {
        console.error("Draft Listing not found:", listingId);
        throw new Error("Draft Listing not found");
      }

      // console.log("Existing Listing before update:", JSON.stringify(draftListing, null, 2));

      // console.log("draft listing is here : " , draftListing)

      // Update Status
      if (stepData.status !== undefined) {
        console.log("draft if work");
        draftListing.status = stepData.status;
        // draftListing.isTemplate = stepData.isTemplate || false;
      }
      // Update Template Check
      if (stepData.isTemplate) {
        console.log("template if work");
        // draftListing.status = stepData.status;
        draftListing.isTemplate = stepData.isTemplate || false;
        draftListing.alias = stepData.alias || "";
      }

      // Update Nested Sections Dynamically
      const sectionsToUpdate = ["productInfo", "prodPricing", "prodDelivery", "prodSeo", "prodMedia", "prodTechInfo"];
      sectionsToUpdate.forEach((section) => {
        if (stepData[section]) {
          // console.log(`Updating ${section} with:`, stepData[section]);
          draftListing[section] = {
            ...(draftListing[section] || {}), // Preserve existing data
            ...stepData[section], // Merge new data
          };
          draftListing.markModified(section);
        }
      });

      // Update Top-Level Fields
      const topLevelFields = [
        "publishToEbay",
        "publishToAmazon",
        "publishToWebsite",
        "stockThreshold",
        "isBlocked",
        "kind",
        "selectedStockId",
      ];
      topLevelFields.forEach((field) => {
        if (stepData[field] !== undefined) {
          draftListing[field] = stepData[field];
        }
      });

      // console.log("Final Listing object before save:", JSON.stringify(draftListing, null, 2));

      // Save updated Listing
      await draftListing.save({ validateBeforeSave: false });

      // console.log("Updated Listing after save:", JSON.stringify(draftListing, null, 2));

      return draftListing;
    } catch (error: any) {
      console.error("Error updating draft Listing:", error);
      throw new Error(`Failed to update draft Listing: ${error.message}`);
    }
  },

  getFullListingById: async (id: string) => {
    try {
      const listing = await Listing.findById(id)

        .populate("productInfo.productCategory")
        .populate("productInfo.productSupplier");

      // .lean();

      if (!listing) throw new Error("Listing not found");
      return listing;
    } catch (error) {
      console.error(`Error fetching full listing by ID: ${id}`, error);
      throw new Error("Failed to fetch full listing");
    }
  },

  getAllListing: async () => {
    try {
      return await Listing.find()
        .populate("productInfo.productCategory")
        .populate("productInfo.productSupplier")
        .populate("prodPricing.paymentPolicy");
    } catch (error) {
      console.error("Error fetching all listing:", error);
      throw new Error("Failed to fetch listing");
    }
  },

  //getting all template products name and their id
  getListingByCondition: async (condition: Record<string, any>) => {
    try {
      const templateListing = await Listing.find(condition)
        .populate("productInfo.productCategory")
        .populate("productInfo.productSupplier")
        // .select("_id kind prodTechInfo brand model srno productCategory productInfo") // ✅ Explicitly include prodTechInfo
        .lean(); // ✅ Converts Mongoose document to plain object (avoids type issues)

      console.log("templateListing in service : ", templateListing);

      return templateListing;
    } catch (error) {
      console.error("Error fetching listing by condition:", error);
      throw new Error("Failed to fetch listing by condition");
    }
  },

  getListingById: async (id: string) => {
    try {
      const listing = await Listing.findById(id)
        .populate("selectedStockId")
        .populate({
          path: "selectedStockId",
          populate: {
            path: "selectedVariations.variationId",
            model: "Variation", // Ensure this matches your Variation model name
          },
        })
        .populate("productInfo.productCategory")
        .populate("productInfo.productSupplier")
        .populate("prodPricing.paymentPolicy");
      if (!listing) throw new Error("Listing not found");
      return listing;
    } catch (error) {
      // console.error(`Error fetching listing by ID for platform ${platform}:`, error);
      console.error(`Error fetching listing`, error);
      throw new Error("Failed to fetch listing");
    }
  },

  getListingsByInventoryId: async (inventoryId: string) => {
    try {
      const listings = await Listing.find({ inventoryId }).lean();
      const total = await Listing.countDocuments({ inventoryId });

      return { listings, total };
    } catch (error) {
      console.error("Error retrieving listings:", error);
      throw new Error("Failed to fetch listings");
    }
  },
  updateListing: async (id: string, data: any) => {
    try {
      const updateQuery = { [`platformDetails.`]: data };
      const updatedListing = await Listing.findByIdAndUpdate(id, updateQuery, {
        new: true,
      });
      if (!updatedListing) throw new Error("Listing not found");
      return updatedListing;
    } catch (error) {
      console.error(`Error updating listing`, error);
      throw new Error("Failed to update listing");
    }
  },
  deleteListing: (id: string) => {
    const listing = Listing.findByIdAndDelete(id);
    if (!listing) {
      throw new Error("Category not found");
    }
    return listing;
  },
  toggleBlock: async (id: string, isBlocked: boolean) => {
    try {
      const updatedListing = await Listing.findByIdAndUpdate(id, { isBlocked }, { new: true });
      if (!updatedListing) throw new Error("Listing not found");
      return updatedListing;
    } catch (error) {
      console.error("Error toggling block status:", error);
      throw new Error("Failed to toggle block status");
    }
  },
  // New API for fetching listing stats (separate service logic)
  getListingStats: async () => {
    try {
      const totalListing = await Listing.countDocuments({});
      const activeListing = await Listing.countDocuments({
        isBlocked: false,
      });
      const blockedListing = await Listing.countDocuments({
        isBlocked: true,
      });
      const PublishedListing = await Listing.countDocuments({
        status: "published",
      });
      const DraftListing = await Listing.countDocuments({
        status: "draft",
      });
      const TemplateListing = await Listing.countDocuments({
        isTemplate: true,
      });

      return {
        totalListing,
        activeListing,
        blockedListing,
        PublishedListing,
        DraftListing,
        TemplateListing,
      };
    } catch (error) {
      console.error("Error fetching Listing stats:", error);
      throw new Error("Error fetching listing statistics");
    }
  },
  searchAndFilterListings: async (filters: any) => {
    try {
      const {
        searchQuery = "",
        isBlocked,
        isTemplate,
        status, // Extract status from filters
        startDate,
        endDate,
        page = 1, // Default to page 1 if not provided
        limit = 10, // Default to 10 records per page
      } = filters;

      // Convert page and limit to numbers safely
      const pageNumber = Math.max(parseInt(page, 10) || 1, 1); // Ensure minimum page is 1
      const limitNumber = parseInt(limit, 10) || 10;
      const skip = (pageNumber - 1) * limitNumber;

      // Build the query dynamically based on filters
      const query: any = {};

      // Search within platformDetails (amazon, ebay, website) for productInfo.title and productInfo.brand
      if (searchQuery) {
        query.$or = [
          {
            "productInfo.title": {
              $regex: searchQuery,
              $options: "i",
            },
          },
          {
            "productInfo.brand": {
              $regex: searchQuery,
              $options: "i",
            },
          },
          {
            "productInfo.title": {
              $regex: searchQuery,
              $options: "i",
            },
          },
          {
            "productInfo.brand": {
              $regex: searchQuery,
              $options: "i",
            },
          },
          {
            "productInfo.title": {
              $regex: searchQuery,
              $options: "i",
            },
          },
          {
            "productInfo.brand": {
              $regex: searchQuery,
              $options: "i",
            },
          },
          {
            "prodPricing.condition": {
              $regex: searchQuery,
              $options: "i",
            },
          },
          {
            "prodPricing.condition": {
              $regex: searchQuery,
              $options: "i",
            },
          },
          {
            "prodPricing.condition": {
              $regex: searchQuery,
              $options: "i",
            },
          },
        ];
      }

      // Add filters for status, isBlocked, and isTemplate
      if (status && ["draft", "published"].includes(status)) {
        query.status = status;
      }
      if (isBlocked !== undefined) {
        query.isBlocked = isBlocked;
      }
      if (isTemplate !== undefined) {
        query.isTemplate = isTemplate;
      }

      // Date range filter for createdAt
      if (startDate || endDate) {
        const dateFilter: any = {};
        if (startDate && !isNaN(Date.parse(startDate))) dateFilter.$gte = new Date(startDate);
        if (endDate && !isNaN(Date.parse(endDate))) dateFilter.$lte = new Date(endDate);
        if (Object.keys(dateFilter).length > 0) query.createdAt = dateFilter;
      }

      // Fetch listing with pagination
      const listing = await Listing.find(query)
        .populate("userType")
        .populate("productInfo.productCategory")
        .populate("productInfo.productSupplier")
        .populate("selectedStockId")
        .skip(skip)
        .limit(limitNumber);

      // Count total listing
      const totalListing = await Listing.countDocuments(query);

      return {
        listing,
        pagination: {
          totalListing,
          currentPage: pageNumber,
          totalPages: Math.ceil(totalListing / limitNumber),
          perPage: limitNumber,
        },
      };
    } catch (error) {
      console.error("Error during search and filter:", error);
      throw new Error("Error during search and filter");
    }
  },


  //bulk Export listing to CSV
  exportListing: async (): Promise<string> => {
    try {
      // Fetch all listing from the database
      const listing: any = await Listing.find({});

      // Format the listing data for CSV export
      const formattedData = listing.map((listing: any) => ({
        ListingID: listing._id,
        Title: listing.title,
        Description: listing.description,
        Price: listing.price,
        Category: listing.category,
        // ProductSupplier: listing?.supplier?.name,
        Stock: listing.stock,
        SupplierId: listing.supplier?._id,
        AmazonInfo: JSON.stringify(listing.platformDetails.amazon.productInfo),
        EbayInfo: JSON.stringify(listing.platformDetails.ebay.productInfo),
        WebsiteInfo: JSON.stringify(listing.platformDetails.website.productInfo),
      }));

      // Convert the data to CSV format using Papa.unparse
      const csv = Papa.unparse(formattedData);

      // Generate a unique file path for the export
      const filePath = `exports/listing_${Date.now()}.csv`;

      // Write the CSV data to a file
      fs.writeFileSync(filePath, csv);

      console.log("✅ Export completed successfully.");
      return filePath;
    } catch (error) {
      console.error("❌ Export Failed:", error);
      throw new Error("Failed to export listing.");
    }
  },
  //service
  bulkUpdateListingTaxDiscount: async (
    listingIds: string[],
    discountType: "fixed" | "percentage",
    discountValue: number,
    vat: number,
    retailPrice: number
  ) => {
    try {
      // Validate the format of the listing IDs
      if (!Array.isArray(listingIds) || listingIds.length === 0) {
        return { status: 400, message: "listingIds array is required" };
      }

      // Validate that each listingId is a valid ObjectId
      const invalidIds = listingIds.filter((id) => !mongoose.Types.ObjectId.isValid(id));
      if (invalidIds.length > 0) {
        return { status: 400, message: `Invalid listingId(s): ${invalidIds.join(", ")}` };
      }

      // Fetch listings from the database
      const listings = await Listing.find({ _id: { $in: listingIds } });
      if (listings.length !== listingIds.length) {
        const existingIds = listings.map((listing: any) => listing._id.toString());
        const missingIds = listingIds.filter((id) => !existingIds.includes(id));
        return { status: 400, message: `Listing(s) with ID(s) ${missingIds.join(", ")} not found.` };
      }

      const percent = discountType === "percentage" ? discountValue / 100 : 0;

      const bulkOps = listings.map((listing: any) => {
        const prodPricing = listing.prodPricing || {}; // Ensure prodPricing is not undefined
        console.log("Updating listing:", listing._id);
        console.log("prodPricing:", prodPricing);

        // Initialize update object for VAT and discountType
        let update: any = {
          $set: {
            "prodPricing.vat": vat,
            "prodPricing.discountType": discountType,
          },
        };

        // If retailPrice is provided, update it
        if (retailPrice) {
          // Case 1: Listings with variations
          if (Array.isArray(prodPricing.selectedVariations) && prodPricing.selectedVariations.length > 0) {
            const updatedVariations = prodPricing.selectedVariations.map((variation: any) => {
              return {
                ...variation,
                retailPrice: retailPrice, // Set retailPrice in each variation
              };
            });

            update.$set["prodPricing.selectedVariations"] = updatedVariations;
          }

          // Case 2: Listings without variations
          else if (typeof prodPricing.retailPrice === "number") {
            update.$set["prodPricing.retailPrice"] = retailPrice;
          }
        }

        // Case 1: Listings with variations (update discount based on discountType)
        if (Array.isArray(prodPricing.selectedVariations) && prodPricing.selectedVariations.length > 0) {
          const updatedVariations = prodPricing.selectedVariations.map((variation: any) => {
            const basePrice = variation.retailPrice || 0;
            let newDiscountValue = variation.discountValue || 0;

            // Update discount value based on discount type
            if (discountType === "percentage") {
              const calculatedDiscount = +(basePrice * percent).toFixed(2);
              newDiscountValue += calculatedDiscount;
            } else if (discountType === "fixed") {
              newDiscountValue += discountValue;
            }

            return {
              ...variation,
              discountValue: newDiscountValue, // Final discounted value
            };
          });

          update.$set["prodPricing.selectedVariations"] = updatedVariations;
        }

        // Case 2: Listings without variations (update discount)
        else if (typeof prodPricing.retailPrice === "number") {
          let newDiscountValue = prodPricing.discountValue || 0;

          if (discountType === "percentage") {
            const calculatedDiscount = +(prodPricing.retailPrice * percent).toFixed(2);
            newDiscountValue += calculatedDiscount;
          } else if (discountType === "fixed") {
            newDiscountValue += discountValue;
          }

          update.$set["prodPricing.discountValue"] = newDiscountValue;
        }

        // Log the final update object
        console.log("Update Object for Listing ID", listing._id, ":", JSON.stringify(update, null, 2));

        // Use updateDoc to update with $set
        return {
          updateOne: {
            filter: { _id: listing._id, kind: listing.kind }, // Dynamically use listing.kind
            update: update,
          },
        };
      });

      // Log the bulkOps to check the operations
      console.log("Bulk Update Operations:", JSON.stringify(bulkOps, null, 2));

      // Execute bulk update using bulkWrite
      const result = await Listing.bulkWrite(bulkOps);
      console.log("Bulk Write Result:", result);

      return { status: 200, message: "Listing updates successful", result };
    } catch (error: any) {
      console.error("Error during bulk update:", error);
      throw new Error(`Error during bulk update: ${error.message}`);
    }
  },

  upsertListingPartsService: async (listingId: string, selectedVariations: any) => {
    return await Listing.findByIdAndUpdate(
      listingId,
      { $set: { selectedVariations } }, // If exists, update. If not, create.
      { new: true, upsert: true } // `upsert: true` ensures creation if missing.
    );
  },
  // Get selected variations for a listing
  getSelectedListingPartsService: async (listingId: string) => {
    return await Listing.findById(listingId).select("selectedVariations");
  },
};
