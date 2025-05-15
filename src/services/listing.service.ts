import { Listing, ProductCategory, User } from "@/models";
import Papa from "papaparse";
import mongoose from "mongoose";
import fs from "fs";
// import { newToken } from "./ebay-listing.service";
import { getStoredEbayAccessToken } from "@/utils/ebay-helpers.util";
import { parseStringPromise } from "xml2js";
export const listingService = {
  // Create a new draft listing
  createDraftListingService: async (stepData: any) => {
    try {
      if (!stepData || typeof stepData !== "object") {
        throw new Error("Invalid or missing 'stepData'");
      }

      // console.log("step Data in listing : ", stepData);

      if (!stepData.productInfo || typeof stepData.productInfo !== "object") {
        throw new Error("Invalid or missing 'productInfo' in stepData");
      }

      const { kind, title, sku, description, brand, productCategory } = stepData.productInfo;
      const { inventoryId } = stepData;

      if (!kind || !Listing.discriminators || !Listing.discriminators[kind]) {
        throw new Error("Invalid or missing 'kind' (listing type)");
      }

      const productInfo = {
        kind,
        title: title || "",
        sku: sku || "",
        description: description || "",
        brand: brand || "",
        productCategory: productCategory || "",
      };

      const draftListingData: any = {
        status: "draft",
        isBlocked: false,
        kind,
        inventoryId,
        listingHasVariations: stepData.listingHasVariations || false,
        listingwithStock: stepData.listingwithStock,
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

      console.log("listing has variatio  check : ", stepData.listingwithStock);
      console.log("draftListingData here there : ", draftListingData);

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

      console.log("draftListingData before save : ", draftListingData);

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
      // console.log("Received update request:", { listingId, stepData });

      // Validate listingId
      if (!mongoose.isValidObjectId(listingId)) {
        throw new Error("Invalid listing ID");
      }

      // Find listing
      const draftListing: any = await Listing.findById(listingId).populate("productInfo.productCategory");
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
          console.log(`Updating ${section} with:`, stepData[section]);
          draftListing[section] = {
            // ...(draftListing[section] || {}), // Preserve existing data
            ...stepData[section], // Merge new data
          };
          draftListing.markModified(section);
        }
      });

      // Update Top-Level Fields
      const topLevelFields = [
        "ebayItemId",
        "ebaySandboxUrl",
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

      // console.log("templateListing in service : ", templateListing);

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
        .populate({
          path: "selectedStockId",
          populate: {
            path: "productSupplier",
            model: "User", // Ensure this matches your Variation model name
          },
        })
        .populate({
          path: "selectedStockId",
          populate: {
            path: "receivedBy",
            model: "User", // Ensure this matches your Variation model name
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
  toggleIsTemplate: async (id: string, isTemplate: boolean) => {
    try {
      const updatedListing = await Listing.findByIdAndUpdate(id, { isTemplate }, { new: true });
      if (!updatedListing) throw new Error("Listing not found");
      return updatedListing;
    } catch (error) {
      console.error("Error toggling listing template status:", error);
      throw new Error("Failed to toggle listing template status");
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
        listingwithStock,
        isTemplate,
        publishToAmazon,
        publishToEbay,
        publishToWebsite,
        status,
        startDate,
        endDate,
        page = 1,
        limit = 10,
      } = filters;

      const pageNumber = Math.max(parseInt(page, 10) || 1, 1);
      const limitNumber = parseInt(limit, 10) || 10;
      const skip = (pageNumber - 1) * limitNumber;

      const query: any = {};

      if (searchQuery) {
        // Base search fields
        query.$or = [
          { "productInfo.title": { $regex: searchQuery, $options: "i" } },
          { "productInfo.brand": { $regex: searchQuery, $options: "i" } },
          { "prodPricing.condition": { $regex: searchQuery, $options: "i" } },
        ];

        // Search productCategory and productSupplier in parallel
        const [productCategories] = await Promise.all([
          ProductCategory.find({
            name: { $regex: searchQuery, $options: "i" },
          }).select("_id"),

          // ProductSupplier.find({
          //   $or: [
          //     { firstName: { $regex: searchQuery, $options: "i" } },
          //     { lastName: { $regex: searchQuery, $options: "i" } },
          //   ],
          // }).select("_id"),
        ]);

        // Support full name searches like "Asad Khan"
        // if (searchQuery.includes(" ")) {
        //   const [firstNameQuery, lastNameQuery] = searchQuery.split(" ");
        //   const fullNameMatches = await ProductSupplier.find({
        //     $or: [
        //       {
        //         $and: [
        //           { firstName: { $regex: firstNameQuery, $options: "i" } },
        //           { lastName: { $regex: lastNameQuery, $options: "i" } },
        //         ],
        //       },
        //     ],
        //   }).select("_id");

        //   productSuppliers.push(...fullNameMatches);
        // }

        // Add ObjectId-based search conditions
        query.$or.push(
          {
            "productInfo.productCategory": {
              $in: productCategories.map((c) => c._id),
            },
          }
          // {
          //   "productInfo.productSupplier": {
          //     $in: productSuppliers.map((s) => s._id),
          //   },
          // }
        );
      }

      if (status && ["draft", "published"].includes(status)) {
        query.status = status;
      }

      if (isBlocked !== undefined) {
        query.isBlocked = isBlocked;
      }

      if (listingwithStock !== undefined) {
        query.listingWithStock = listingwithStock;
      }

      if (publishToAmazon !== undefined) {
        query.publishToAmazon = publishToAmazon;
      }

      if (publishToEbay !== undefined) {
        query.publishToEbay = publishToEbay;
      }

      if (publishToWebsite !== undefined) {
        query.publishToWebsite = publishToWebsite;
      }

      if (isTemplate !== undefined) {
        query.isTemplate = isTemplate;
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

      const listing = await Listing.find(query)
        .populate("userType")
        .populate("productInfo.productCategory")
        .populate("productInfo.productSupplier")
        .populate("selectedStockId")
        .skip(skip)
        .limit(limitNumber);

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
        SKU: listing.sku,
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

        // If retailPrice is provided, update it in the variations or the main listing
        if (retailPrice) {
          // Case 1: Listings with variations
          if (Array.isArray(prodPricing.selectedVariations) && prodPricing.selectedVariations.length > 0) {
            const updatedVariations = prodPricing.selectedVariations.map((variation: any) => {
              const basePrice = variation.retailPrice || 0;
              let newDiscountValue = 0;

              // Calculate discount for each variation
              if (basePrice === 0) {
                newDiscountValue = 0;
              } else {
                // Calculate discount value based on discount type
                if (discountType === "percentage") {
                  const discountAmount = (basePrice * discountValue) / 100; // Calculate discount amount
                  newDiscountValue = basePrice - discountAmount; // Apply discount to the retail price
                } else if (discountType === "fixed") {
                  newDiscountValue = basePrice - discountValue; // Apply fixed discount
                }
              }

              // Return updated variation object with new retail price and discount value
              return {
                ...variation,
                retailPrice: retailPrice, // Set retailPrice in each variation
                discountValue: newDiscountValue, // Set the discounted price
              };
            });

            update.$set["prodPricing.selectedVariations"] = updatedVariations;
          }
          // Case 2: Listings without variations (already handled previously)
          else if (typeof prodPricing.retailPrice === "number") {
            update.$set["prodPricing.retailPrice"] = retailPrice;
          }
        }

        // Case 2: Listings without variations (update the variation inside selectedVariations)
        else if (prodPricing.selectedVariations && prodPricing.selectedVariations.length > 0) {
          const updatedVariations = prodPricing.selectedVariations.map((variation: any) => {
            let newDiscountValue = 0;
            const basePrice = variation.retailPrice || 0;

            // If retailPrice is missing, discountValue will be set to 0
            if (basePrice === 0) {
              newDiscountValue = 0;
            } else {
              // Calculate discount value based on discount type
              if (discountType === "percentage") {
                const discountAmount = (basePrice * discountValue) / 100; // Calculate discount amount
                newDiscountValue = basePrice - discountAmount; // Apply discount to the retail price
              } else if (discountType === "fixed") {
                newDiscountValue = basePrice - discountValue; // Apply fixed discount
              }
            }

            return {
              ...variation,
              retailPrice: retailPrice, // Set retailPrice in each variation
              discountValue: newDiscountValue, // Set the discounted price
            };
          });

          update.$set["prodPricing.selectedVariations"] = updatedVariations;
        }
        // Case 2: Listings without variations (update discount)
        else if (typeof prodPricing.retailPrice === "number") {
          let newDiscountValue = 0;

          if (prodPricing.retailPrice === 0) {
            newDiscountValue = 0; // If retailPrice is missing or 0, no discount
          } else {
            if (discountType === "percentage") {
              const discountAmount = (prodPricing.retailPrice * discountValue) / 100; // Calculate discount amount
              newDiscountValue = prodPricing.retailPrice - discountAmount; // Apply discount to retail price
            } else if (discountType === "fixed") {
              newDiscountValue = prodPricing.retailPrice - discountValue; // Apply fixed discount
            }
          }

          update.$set["prodPricing.discountValue"] = newDiscountValue;
        }

        // Log the final update object
        console.log("Update Object for Listing ID", listing._id, ":", JSON.stringify(update, null, 2));

        // Use updateDoc to update with $set
        return {
          updateOne: {
            filter: { _id: listing._id }, // Dynamically use listing.kind
            update: update,
          },
        };
      });

      // Log the bulkOps to check the operations
      console.log("Bulk Update Operations:", JSON.stringify(bulkOps, null, 2));

      // Execute bulk update using bulkWrite
      const result = await Listing.bulkWrite(bulkOps);
      console.log("Bulk Write Result:", result);
      // await Promise.all(
      //   bulkOps.map(
      //     (op) => Listing.updateOne(op.updateOne.filter, op.updateOne.update, { new: true }) // Use updateOne for each operation
      //   )
      // );
      return { status: 200, message: "Listing updates successful" };
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

  getEbaySellerList: async () => {
    const token = await getStoredEbayAccessToken();
    try {
      if (!token) {
        throw new Error("Missing or invalid eBay access token");
      }
      const ebayUrl = "https://api.sandbox.ebay.com/ws/api.dll";

      const listingBody = `
       <?xml version="1.0" encoding="utf-8"?>
<GetSellerListRequest xmlns="urn:ebay:apis:eBLBaseComponents">
	<ErrorLanguage>en_US</ErrorLanguage>
	<WarningLevel>High</WarningLevel>

  <GranularityLevel>Coarse</GranularityLevel>
<StartTimeFrom>2025-02-01T00:00:00.000Z</StartTimeFrom>
<StartTimeTo>2025-04-26T23:59:59.000Z</StartTimeTo>
  <IncludeWatchCount>true</IncludeWatchCount>
  <Pagination>
    <EntriesPerPage>2</EntriesPerPage>
  </Pagination>
</GetSellerListRequest>

      `;

      console.log("Request Body For get seller List:", listingBody, null, 2);
      const response = await fetch(ebayUrl, {
        method: "POST",
        headers: {
          "X-EBAY-API-SITEID": "3", // UK site ID
          "X-EBAY-API-COMPATIBILITY-LEVEL": "967",
          "X-EBAY-API-CALL-NAME": "GetSellerList",
          "X-EBAY-API-IAF-TOKEN": token,
          // "X-EBAY-API-IAF-TOKEN": newToken,
          "Content-Type": "text/xml",
        },
        body: listingBody,
      });

      const responseBody = await response.text();
      const parsedXML = await parseStringPromise(responseBody);
      return JSON.stringify({
        status: response.status,
        statusText: response.statusText,
        rawXML: responseBody,
        parsed: parsedXML,
      });
    } catch (error: any) {
      console.error("Error getting getSellerList from eBay:", error.message);

      return JSON.stringify({
        status: 500,
        message: error.message,
      });
    }
  },

  getCategorySubTree: async (categoryId: string) => {
    const token = getStoredEbayAccessToken();
    try {
      const response = await fetch(
        `https://api.sandbox.ebay.com/commerce/taxonomy/v1/category_tree/3/get_category_subtree?category_id=${categoryId}`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: "application/json",
            "Accept-Encoding": "gzip",
          },
        }
      );

      const jsonData = await response.json();

      return JSON.stringify({
        status: response.status,
        statusText: response.statusText,
        data: jsonData, // actual parsed data
      });
    } catch (error: any) {
      console.error("Error getting getCategorySubTree from eBay:", error.message);

      return JSON.stringify({
        status: 500,
        message: error.message,
      });
    }
  },

  getCategoryFeatures: async () => {
    try {
      const token = await getStoredEbayAccessToken();

      if (!token) {
        throw new Error("Missing or invalid eBay access token");
      }
      const ebayUrl = "https://api.sandbox.ebay.com/ws/api.dll";

      const listingBody = `
     <?xml version="1.0" encoding="utf-8"?>
<GetCategoryFeaturesRequest xmlns="urn:ebay:apis:eBLBaseComponents">
	<ErrorLanguage>en_US</ErrorLanguage>
	<WarningLevel>High</WarningLevel>
  <AllFeaturesForCategory>true</AllFeaturesForCategory>
</GetCategoryFeaturesRequest>
      `;

      console.log("Request Body For get seller List:", listingBody, null, 2);
      const response = await fetch(ebayUrl, {
        method: "POST",
        headers: {
          "X-EBAY-API-SITEID": "3", // UK site ID
          "X-EBAY-API-COMPATIBILITY-LEVEL": "967",
          "X-EBAY-API-CALL-NAME": "GetCategoryFeatures",
          "X-EBAY-API-IAF-TOKEN": token,
          // "X-EBAY-API-IAF-TOKEN": newToken,
          "Content-Type": "text/xml",
        },
        body: listingBody,
      });

      const responseBody = await response.text();
      const parsedXML = await parseStringPromise(responseBody);
      return JSON.stringify({
        status: response.status,
        statusText: response.statusText,
        rawXML: responseBody,
        parsed: parsedXML,
      });
    } catch (error: any) {
      console.error("Error getting getSellerList from eBay:", error.message);

      return JSON.stringify({
        status: 500,
        message: error.message,
      });
    }
  },
};
