import { Listing, User } from "@/models";
import Papa from "papaparse";
import mongoose from "mongoose";
import fs from "fs";
import { validateCsvData } from "@/utils/bulkImport.util";
export const listingService = {
  // Create a new draft listing
  createDraftListingService: async (stepData: any) => {
    try {
      if (!stepData || typeof stepData !== "object") {
        throw new Error("Invalid or missing 'stepData'");
      }

      if (!stepData.productInfo || typeof stepData.productInfo !== "object") {
        throw new Error("Invalid or missing 'productInfo' in stepData");
      }

      const { kind, inventoryId, title, productDescription, brand, listingImages, listingCondition } =
        stepData.productInfo;

      if (!kind || !Listing.discriminators || !Listing.discriminators[kind]) {
        throw new Error("Invalid or missing 'kind' (listing type)");
      }

      // const categoryId = mongoose.isValidObjectId(productCategory)
      //   ? new mongoose.Types.ObjectId(productCategory)
      //   : null;
      // const supplierId = mongoose.isValidObjectId(productSupplier)
      //   ? new mongoose.Types.ObjectId(productSupplier)
      //   : null;

      // if (!categoryId) throw new Error("Invalid or missing 'productCategory'");
      // if (!supplierId) throw new Error("Invalid or missing 'productSupplier'");

      // ✅ Ensure listingImages is correctly mapped inside productInfo
      const productInfo = {
      
        title: title || "",
        productDescription: productDescription || "",
        brand: brand || "",
        listingCondition: listingCondition || "",
        lisitngImages: Array.isArray(listingImages) ? listingImages : [], // ✅ Ensure images are saved
      };

      const draftListingData: any = {
        status: "draft",
        isBlocked: false,
        kind,
        productInfo, // ✅ Fixed: Now correctly storing listingImages inside productInfo
        prodPricing: stepData.prodPricing || {},
        prodTechInfo: stepData.prodTechInfo || {},
        prodDelivery: stepData.prodDelivery || {},
        prodSeo: stepData.prodSeo || {},
      };

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
      const draftProduct: any = await Listing.findById(listingId);
      if (!draftProduct) {
        throw new Error("Draft listing not found");
      }

      if (stepData.status !== undefined) {
        draftProduct.status = stepData.status;
        draftProduct.isTemplate = stepData.isTemplate;
        await draftProduct.save({ validateBeforeSave: false });
        return draftProduct;
      }

      const step = stepData.step;

      if (step === "prodDelivery") {
        // console.log("🟡 Processing prodDelivery step separately...");

        if (!draftProduct.platformDetails) {
          draftProduct.platformDetails = { amazon: {}, ebay: {}, website: {} };
        }

        ["amazon", "ebay", "website"].forEach((platform) => {
          if (!draftProduct.platformDetails[platform]) {
            draftProduct.platformDetails[platform] = {};
          }

          if (!draftProduct.platformDetails[platform].prodDelivery) {
            draftProduct.platformDetails[platform].prodDelivery = {};
          }
        });

        Object.keys(stepData).forEach((key) => {
          if (key === "step") return;

          const entry = stepData[key];
          const { isAmz, isEbay, isWeb, ...rest } = entry;

          const updateField = (platform: string, shouldUpdate: boolean) => {
            if (!shouldUpdate) return;
            if (!draftProduct.platformDetails[platform].prodDelivery) {
              draftProduct.platformDetails[platform].prodDelivery = {};
            }

            if (typeof entry === "object" && !Array.isArray(entry) && entry.value === undefined) {
              // Handle nested objects (e.g., packageWeight, packageDimensions)
              draftProduct.platformDetails[platform].prodDelivery[key] = {};
              Object.keys(entry).forEach((subKey) => {
                if (subKey.startsWith("is")) return; // Ignore flags
                draftProduct.platformDetails[platform].prodDelivery[key][subKey] = entry[subKey].value;
              });
            } else {
              // Handle direct key-value pairs (e.g., postagePolicy, irregularPackage)
              draftProduct.platformDetails[platform].prodDelivery[key] = entry.value;
            }
          };

          updateField("amazon", isAmz);
          updateField("ebay", isEbay);
          updateField("website", isWeb);
        });

        draftProduct.markModified("platformDetails.amazon.prodDelivery");
        draftProduct.markModified("platformDetails.ebay.prodDelivery");
        draftProduct.markModified("platformDetails.website.prodDelivery");
      } else {
        // Recursive function to update platform details
        const processStepData = (
          data: any,
          platformDetails: any,
          keyPrefix: string = "",
          inheritedFlags: {
            isAmz?: boolean;
            isEbay?: boolean;
            isWeb?: boolean;
          } = {}
        ) => {
          Object.keys(data).forEach((key) => {
            const currentKey = keyPrefix ? `${keyPrefix}.${key}` : key;
            const entry = data[key];

            // Inherit platform flags
            const {
              isAmz = inheritedFlags.isAmz,
              isEbay = inheritedFlags.isEbay,
              isWeb = inheritedFlags.isWeb,
            } = entry || {};
            if (entry && typeof entry === "object" && !Array.isArray(entry) && entry.value === undefined) {
              // Recursive call for nested objects
              processStepData(entry, platformDetails, currentKey, {
                isAmz,
                isEbay,
                isWeb,
              });
            } else {
              let value = entry?.value ?? entry;
              const step = stepData.step;
              // console.log(`🔹 Processing: ${currentKey} | Value:`, value);

              if (step === "productInfo") {
                if (isAmz) platformDetails.amazon.productInfo ||= {};
                if (isEbay) platformDetails.ebay.productInfo ||= {};
                if (isWeb) platformDetails.website.productInfo ||= {};
                if (isAmz) platformDetails.amazon.productInfo[currentKey] = value;
                if (isEbay) platformDetails.ebay.productInfo[currentKey] = value;
                if (isWeb) platformDetails.website.productInfo[currentKey] = value;
                if (currentKey === "productSupplier") {
                  platformDetails.amazon.productInfo.productSupplier = value;
                  platformDetails.ebay.productInfo.productSupplier = value;
                  platformDetails.website.productInfo.productSupplier = value;
                }
              } else if (step === "prodMedia") {
                if (currentKey.startsWith("platformMedia.")) {
                  const keyParts = currentKey.split(".").slice(1); // ["ebay", "images"]
                  if (
                    keyParts.length === 2 &&
                    ["amazon", "ebay", "website"].includes(keyParts[0]) &&
                    ["images", "videos"].includes(keyParts[1])
                  ) {
                    const [platform, mediaType] = keyParts;

                    // 1. Initialize platform if missing
                    if (!platformDetails[platform]) {
                      platformDetails[platform] = {}; // ← Fixes "Cannot read 'ebay'"
                    }

                    // 2. Initialize prodMedia structure
                    if (!platformDetails[platform].prodMedia) {
                      platformDetails[platform].prodMedia = {
                        images: [],
                        videos: [],
                      };
                    }

                    // 3. Assign the media array
                    platformDetails[platform].prodMedia[mediaType] = value;
                  }
                }
              } else if (step === "prodTechInfo") {
                if (isAmz) platformDetails.amazon.prodTechInfo ||= {};
                if (isEbay) platformDetails.ebay.prodTechInfo ||= {};
                if (isWeb) platformDetails.website.prodTechInfo ||= {};
                if (isAmz) platformDetails.amazon.prodTechInfo[currentKey] = value;
                if (isEbay) platformDetails.ebay.prodTechInfo[currentKey] = value;
                if (isWeb) platformDetails.website.prodTechInfo[currentKey] = value;
              } else if (step === "prodPricing") {
                if (isAmz) platformDetails.amazon.prodPricing ||= {};
                if (isEbay) platformDetails.ebay.prodPricing ||= {};
                if (isWeb) platformDetails.website.prodPricing ||= {};
                if (isAmz) platformDetails.amazon.prodPricing[currentKey] = value;
                if (isEbay) platformDetails.ebay.prodPricing[currentKey] = value;
                if (isWeb) platformDetails.website.prodPricing[currentKey] = value;
              } else {
                if (isAmz) platformDetails.amazon.prodSeo ||= {};
                if (isEbay) platformDetails.ebay.prodSeo ||= {};
                if (isWeb) platformDetails.website.prodSeo ||= {};
                if (isAmz) platformDetails.amazon.prodSeo[currentKey] = value;
                if (isEbay) platformDetails.ebay.prodSeo[currentKey] = value;
                if (isWeb) platformDetails.website.prodSeo[currentKey] = value;
              }
            }
          });
        };
        processStepData(stepData, draftProduct.platformDetails);
      }

      await draftProduct.save({ validateBeforeSave: false });
      return draftProduct;
    } catch (error: any) {
      console.error("❌ Error updating draft listing:", error.message, error.stack);
      throw new Error(`Failed to update draft listing: ${error.message}`);
    }
  },

  getFullListingById: async (id: string) => {
    try {
      const listing = await Listing.findById(id)
        .populate("platformDetails.amazon.productInfo.productCategory")
        .populate("platformDetails.ebay.productInfo.productCategory")
        .populate("platformDetails.website.productInfo.productCategory")
        .populate("platformDetails.amazon.productInfo.productSupplier")
        .populate("platformDetails.ebay.productInfo.productSupplier")
        .populate("platformDetails.website.productInfo.productSupplier");
      // .lean();

      if (!listing) throw new Error("Listing not found");
      return listing;
    } catch (error) {
      console.error(`Error fetching full listing by ID: ${id}`, error);
      throw new Error("Failed to fetch full listing");
    }
  },

  getAllListings: async () => {
    try {
      return await Listing.find()
        .populate("platformDetails.website.productInfo.productCategory")
        .populate("platformDetails.amazon.productInfo.productCategory")
        .populate("platformDetails.ebay.productInfo.productCategory")
        .populate("platformDetails.amazon.productInfo.productSupplier")
        .populate("platformDetails.ebay.productInfo.productSupplier")
        .populate("platformDetails.website.productInfo.productSupplier")
        .populate("platformDetails.website.prodPricing.paymentPolicy")
        .populate("platformDetails.amazon.prodPricing.paymentPolicy")
        .populate("platformDetails.ebay.prodPricing.paymentPolicy");
    } catch (error) {
      console.error("Error fetching all products:", error);
      throw new Error("Failed to fetch products");
    }
  },
  //getting all template products name and their id
  getListingsByCondition: async (condition: Record<string, any>) => {
    try {
      // Find products matching the condition
      return await Listing.find(condition)
        .populate("platformDetails.website.productInfo.productCategory")
        .populate("platformDetails.amazon.productInfo.productCategory")
        .populate("platformDetails.ebay.productInfo.productCategory")
        .populate("platformDetails.amazon.productInfo.productSupplier")
        .populate("platformDetails.ebay.productInfo.productSupplier")
        .populate("platformDetails.website.productInfo.productSupplier")
        .select("_id platformDetails website.productInfo productCategory brand model srno kind");
    } catch (error) {
      console.error("Error fetching products by condition:", error);
      throw new Error("Failed to fetch products by condition");
    }
  },
  getListingById: async (id: string) => {
    try {
      const listing = await Listing.findById(id)
        .populate("platformDetails.website.productInfo.productCategory")
        .populate("platformDetails.amazon.productInfo.productCategory")
        .populate("platformDetails.ebay.productInfo.productCategory")
        .populate("platformDetails.amazon.productInfo.productSupplier")
        .populate("platformDetails.ebay.productInfo.productSupplier")
        .populate("platformDetails.website.productInfo.productSupplier")
        .populate("platformDetails.website.prodPricing.paymentPolicy")
        .populate("platformDetails.amazon.prodPricing.paymentPolicy")
        .populate("platformDetails.ebay.prodPricing.paymentPolicy");
      if (!listing) throw new Error("Listing not found");
      // if (listing.platformDetails[platform]) {
      //   return listing.platformDetails[platform];
      // }
      // throw new Error(`No details found for platform: ${platform}`);
      return listing;
    } catch (error) {
      // console.error(`Error fetching listing by ID for platform ${platform}:`, error);
      console.error(`Error fetching listing`, error);
      throw new Error("Failed to fetch listing");
    }
  },
  updateListing: async (id: string, platform: "amazon" | "ebay" | "website", data: any) => {
    try {
      const updateQuery = { [`platformDetails.${platform}`]: data };
      const updatedProduct = await Listing.findByIdAndUpdate(id, updateQuery, {
        new: true,
      });
      if (!updatedProduct) throw new Error("Listing not found");
      return updatedProduct.platformDetails[platform];
    } catch (error) {
      console.error(`Error updating listing for platform ${platform}:`, error);
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
      const updatedProduct = await Listing.findByIdAndUpdate(id, { isBlocked }, { new: true });
      if (!updatedProduct) throw new Error("Listing not found");
      return updatedProduct;
    } catch (error) {
      console.error("Error toggling block status:", error);
      throw new Error("Failed to toggle block status");
    }
  },
  // New API for fetching listing stats (separate service logic)
  getListingStats: async () => {
    try {
      const totalProducts = await Listing.countDocuments({});
      const activeProducts = await Listing.countDocuments({
        isBlocked: false,
      });
      const blockedProducts = await Listing.countDocuments({
        isBlocked: true,
      });
      const PublishedProducts = await Listing.countDocuments({
        status: "published",
      });
      const DraftProducts = await Listing.countDocuments({
        status: "draft",
      });
      const TemplateProducts = await Listing.countDocuments({
        isTemplate: true,
      });

      return {
        totalProducts,
        activeProducts,
        blockedProducts,
        PublishedProducts,
        DraftProducts,
        TemplateProducts,
      };
    } catch (error) {
      console.error("Error fetching Products stats:", error);
      throw new Error("Error fetching products statistics");
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
            "platformDetails.amazon.productInfo.title": {
              $regex: searchQuery,
              $options: "i",
            },
          },
          {
            "platformDetails.amazon.productInfo.brand": {
              $regex: searchQuery,
              $options: "i",
            },
          },
          {
            "platformDetails.ebay.productInfo.title": {
              $regex: searchQuery,
              $options: "i",
            },
          },
          {
            "platformDetails.ebay.productInfo.brand": {
              $regex: searchQuery,
              $options: "i",
            },
          },
          {
            "platformDetails.website.productInfo.title": {
              $regex: searchQuery,
              $options: "i",
            },
          },
          {
            "platformDetails.website.productInfo.brand": {
              $regex: searchQuery,
              $options: "i",
            },
          },
          {
            "platformDetails.amazon.prodPricing.condition": {
              $regex: searchQuery,
              $options: "i",
            },
          },
          {
            "platformDetails.ebay.prodPricing.condition": {
              $regex: searchQuery,
              $options: "i",
            },
          },
          {
            "platformDetails.website.prodPricing.condition": {
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

      // Fetch products with pagination
      const products = await Listing.find(query).populate("userType").skip(skip).limit(limitNumber);

      // Count total products
      const totalProducts = await Listing.countDocuments(query);

      return {
        products,
        pagination: {
          totalProducts,
          currentPage: pageNumber,
          totalPages: Math.ceil(totalProducts / limitNumber),
          perPage: limitNumber,
        },
      };
    } catch (error) {
      console.error("Error during search and filter:", error);
      throw new Error("Error during search and filter");
    }
  },
  //bulk import products as CSV
  bulkImportListings: async (filePath: string): Promise<void> => {
    try {
      // ✅ Validate CSV data (supplier validation happens inside)
      const { validRows, invalidRows } = await validateCsvData(filePath);

      if (invalidRows.length > 0) {
        console.log("❌ Some rows were skipped due to validation errors:");
        invalidRows.forEach(({ row, errors }) => {
          console.log(`Row ${row}: ${errors.join(", ")}`);
        });
      }

      if (validRows.length === 0) {
        console.log("❌ No valid products to import.");
        return;
      }

      // ✅ Fetch all existing listing titles to prevent duplicates
      const existingTitles = new Set((await Listing.find({}, "title")).map((p: any) => p.title));

      // ✅ Fetch all suppliers in one query to optimize validation
      const supplierKeys = validRows.map(({ data }) => data.productSupplierKey);
      const existingSuppliers = await User.find(
        { supplierKey: { $in: supplierKeys } },
        "_id supplierKey"
        // ).lean();
      );
      const supplierMap = new Map(existingSuppliers.map((supplier) => [supplier.supplierKey, supplier._id]));

      // ✅ Filter out invalid suppliers
      const filteredRows = validRows.filter(({ data }) => {
        if (!supplierMap.has(data.productSupplierKey)) {
          invalidRows.push({
            row: data.row,
            errors: [`supplierKey ${data.productSupplierKey} does not exist.`],
          });
          return false;
        }
        return true;
      });

      if (filteredRows.length === 0) {
        console.log("❌ No valid products to insert after supplier validation.");
        return;
      }

      // ✅ Bulk insert new products (avoiding duplicates)
      const bulkOperations = filteredRows
        .filter(({ data }) => !existingTitles.has(data.title))
        .map(({ data }) => ({
          insertOne: {
            document: {
              title: data.title,
              brand: data.brand,
              productDescription: data.productDescription,
              productCategory: new mongoose.Types.ObjectId(data.productCategory),
              productSupplier: supplierMap.get(data.productSupplierKey), // ✅ Replace supplierKey with actual _id
              price: parseFloat(data.price),
              media: {
                images: data.images.map((url: string) => ({
                  url,
                  type: "image/jpeg",
                })),
                videos: data.videos.map((url: string) => ({
                  url,
                  type: "video/mp4",
                })),
              },
              platformDetails: ["amazon", "ebay", "website"].reduce((acc: { [key: string]: any }, platform) => {
                acc[platform] = {
                  productInfo: {
                    brand: data.brand,
                    title: data.title,
                    productDescription: data.productDescription,
                    productCategory: new mongoose.Types.ObjectId(data.productCategory),
                    productSupplier: supplierMap.get(data.productSupplierKey),
                  },
                  prodPricing: {
                    price: parseFloat(data.price),
                    condition: "new",
                    quantity: 10,
                    vat: 5,
                  },
                  prodMedia: {
                    images: data.images.map((url: string) => ({
                      url,
                      type: "image/jpeg",
                    })),
                    videos: data.videos.map((url: string) => ({
                      url,
                      type: "video/mp4",
                    })),
                  },
                };
                return acc;
              }, {}),
            },
          },
        }));

      if (bulkOperations.length === 0) {
        console.log("✅ No new products to insert.");
        return;
      }

      // ✅ Perform Bulk Insert Operation
      await Listing.bulkWrite(bulkOperations);
      console.log(`✅ Bulk import completed. Successfully added ${bulkOperations.length} new products.`);

      // ✅ Log skipped rows due to invalid suppliers
      if (invalidRows.length > 0) {
        console.log("❌ Some products were skipped due to invalid suppliers:");
        invalidRows.forEach(({ row, errors }) => {
          console.log(`Row ${row}: ${errors.join(", ")}`);
        });
      }
    } catch (error) {
      console.error("❌ Bulk import failed:", error);
    }
  },

  //bulk Export products to CSV
  exportListings: async (): Promise<string> => {
    try {
      // Fetch all products from the database
      const products = await Listing.find({});

      // Format the products data for CSV export
      const formattedData = products.map((listing: any) => ({
        listingId: listing._id,
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
      const filePath = `exports/products_${Date.now()}.csv`;

      // Write the CSV data to a file
      fs.writeFileSync(filePath, csv);

      console.log("✅ Export completed successfully.");
      return filePath;
    } catch (error) {
      console.error("❌ Export Failed:", error);
      throw new Error("Failed to export products.");
    }
  },
  bulkUpdateListingTaxDiscount: async (listingIds: string[], discountValue: number, vat: number) => {
    try {
      // Check if the discountValue and vat are numbers and valid
      if (typeof discountValue !== "number" || typeof vat !== "number") {
        throw new Error("Invalid discountValue or vat. They must be numbers.");
      }

      // Perform bulk update with nested prodPricing field
      const result = await Listing.updateMany(
        { _id: { $in: listingIds } }, // Filter valid listing IDs
        {
          $set: {
            "platformDetails.amazon.prodPricing.discountValue": discountValue,
            "platformDetails.ebay.prodPricing.discountValue": discountValue,
            "platformDetails.website.prodPricing.discountValue": discountValue,
            "platformDetails.amazon.prodPricing.vat": vat,
            "platformDetails.ebay.prodPricing.vat": vat,
            "platformDetails.website.prodPricing.vat": vat,
          },
        }
      );

      if (result.modifiedCount === 0) {
        throw new Error("No products were updated. Please verify listing IDs and data.");
      }

      return result;
    } catch (error: any) {
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
