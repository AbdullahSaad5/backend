import { Inventory, User } from "@/models";
import Papa from "papaparse";
import mongoose from "mongoose";
import fs from "fs";
import { validateCsvData } from "@/utils/bulkImport.util";
export const inventoryService = {
  // Create a new draft inventory
  createDraftInventory: async (stepData: any) => {
    try {
      const { kind, productCategory, inventorySupplier } = stepData;

      const categoryId = mongoose.isValidObjectId(productCategory)
        ? new mongoose.Types.ObjectId(productCategory)
        : null;
      const supplierId = mongoose.isValidObjectId(inventorySupplier)
        ? new mongoose.Types.ObjectId(inventorySupplier)
        : null;

      if (!categoryId) {
        throw new Error("Invalid or missing 'productCategory'");
      }
      if (!supplierId) {
        throw new Error("Invalid or missing 'inventorySupplier'");
      }

      const draftInventory = new Inventory({
        status: "draft",
        isBlocked: false,
        kind,
        productInfo: {
          productCategory: categoryId,
          productSupplier: supplierId,
          title: stepData.title || "",
          productDescription: stepData.productDescription || "",
          brand: stepData.brand || "",
        },
        prodPricing: stepData.prodPricing || {},
        prodMedia: stepData.prodMedia || {},
        prodDelivery: stepData.prodDelivery || {},
        prodSeo: stepData.prodSeo || {},
      });

      await draftInventory.save();
      return draftInventory;
    } catch (error) {
      console.error("Error creating draft inventory:", error);
      throw new Error("Failed to create draft inventory");
    }
  },

  // Update an existing draft inventory when user move to next stepper
  updateDraftInventory: async (inventoryId: string, stepData: any) => {
    try {
      const draftInventory: any = await Inventory.findById(inventoryId);
      if (!draftInventory) {
        throw new Error("Draft inventory not found");
      }

      if (stepData.status !== undefined) {
        draftInventory.status = stepData.status;
        draftInventory.isTemplate = stepData.isTemplate;
        await draftInventory.save({ validateBeforeSave: false });
        return draftInventory;
      }

      const step = stepData.step;

      if (step === "prodDelivery") {
        // console.log("🟡 Processing prodDelivery step separately...");

        if (!draftInventory.platformDetails) {
          draftInventory.platformDetails = { amazon: {}, ebay: {}, website: {} };
        }

        ["amazon", "ebay", "website"].forEach((platform) => {
          if (!draftInventory.platformDetails[platform]) {
            draftInventory.platformDetails[platform] = {};
          }

          if (!draftInventory.platformDetails[platform].prodDelivery) {
            draftInventory.platformDetails[platform].prodDelivery = {};
          }
        });

        Object.keys(stepData).forEach((key) => {
          if (key === "step") return;

          const entry = stepData[key];
          const { isAmz, isEbay, isWeb, ...rest } = entry;

          const updateField = (platform: string, shouldUpdate: boolean) => {
            if (!shouldUpdate) return;
            if (!draftInventory.platformDetails[platform].prodDelivery) {
              draftInventory.platformDetails[platform].prodDelivery = {};
            }

            if (typeof entry === "object" && !Array.isArray(entry) && entry.value === undefined) {
              // Handle nested objects (e.g., packageWeight, packageDimensions)
              draftInventory.platformDetails[platform].prodDelivery[key] = {};
              Object.keys(entry).forEach((subKey) => {
                if (subKey.startsWith("is")) return; // Ignore flags
                draftInventory.platformDetails[platform].prodDelivery[key][subKey] = entry[subKey].value;
              });
            } else {
              // Handle direct key-value pairs (e.g., postagePolicy, irregularPackage)
              draftInventory.platformDetails[platform].prodDelivery[key] = entry.value;
            }
          };

          updateField("amazon", isAmz);
          updateField("ebay", isEbay);
          updateField("website", isWeb);
        });

        draftInventory.markModified("platformDetails.amazon.prodDelivery");
        draftInventory.markModified("platformDetails.ebay.prodDelivery");
        draftInventory.markModified("platformDetails.website.prodDelivery");
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

              if (step === "inventoryInfo") {
                if (isAmz) platformDetails.amazon.inventoryInfo ||= {};
                if (isEbay) platformDetails.ebay.inventoryInfo ||= {};
                if (isWeb) platformDetails.website.inventoryInfo ||= {};
                if (isAmz) platformDetails.amazon.inventoryInfo[currentKey] = value;
                if (isEbay) platformDetails.ebay.inventoryInfo[currentKey] = value;
                if (isWeb) platformDetails.website.inventoryInfo[currentKey] = value;
                if (currentKey === "inventorySupplier") {
                  platformDetails.amazon.inventoryInfo.inventorySupplier = value;
                  platformDetails.ebay.inventoryInfo.inventorySupplier = value;
                  platformDetails.website.inventoryInfo.inventorySupplier = value;
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
        processStepData(stepData, draftInventory.platformDetails);
      }

      await draftInventory.save({ validateBeforeSave: false });
      return draftInventory;
    } catch (error: any) {
      console.error("❌ Error updating draft inventory:", error.message, error.stack);
      throw new Error(`Failed to update draft inventory: ${error.message}`);
    }
  },

  getFullInventoryById: async (id: string) => {
    try {
      const inventory = await Inventory.findById(id)
        .populate("platformDetails.amazon.inventoryInfo.productCategory")
        .populate("platformDetails.ebay.inventoryInfo.productCategory")
        .populate("platformDetails.website.inventoryInfo.productCategory")
        .populate("platformDetails.amazon.inventoryInfo.inventorySupplier")
        .populate("platformDetails.ebay.inventoryInfo.inventorySupplier")
        .populate("platformDetails.website.inventoryInfo.inventorySupplier");
      // .lean();

      if (!inventory) throw new Error("Inventory not found");
      return inventory;
    } catch (error) {
      console.error(`Error fetching full inventory by ID: ${id}`, error);
      throw new Error("Failed to fetch full inventory");
    }
  },

  getAllInventory: async () => {
    try {
      return await Inventory.find()
        .populate("platformDetails.website.inventoryInfo.productCategory")
        .populate("platformDetails.amazon.inventoryInfo.productCategory")
        .populate("platformDetails.ebay.inventoryInfo.productCategory")
        .populate("platformDetails.amazon.inventoryInfo.inventorySupplier")
        .populate("platformDetails.ebay.inventoryInfo.inventorySupplier")
        .populate("platformDetails.website.inventoryInfo.inventorySupplier")
        .populate("platformDetails.website.prodPricing.paymentPolicy")
        .populate("platformDetails.amazon.prodPricing.paymentPolicy")
        .populate("platformDetails.ebay.prodPricing.paymentPolicy");
    } catch (error) {
      console.error("Error fetching all inventorys:", error);
      throw new Error("Failed to fetch inventorys");
    }
  },
  //getting all template inventorys name and their id
  getInventorysByCondition: async (condition: Record<string, any>) => {
    try {
      // Find inventorys matching the condition
      return await Inventory.find(condition)
        .populate("platformDetails.website.inventoryInfo.productCategory")
        .populate("platformDetails.amazon.inventoryInfo.productCategory")
        .populate("platformDetails.ebay.inventoryInfo.productCategory")
        .populate("platformDetails.amazon.inventoryInfo.inventorySupplier")
        .populate("platformDetails.ebay.inventoryInfo.inventorySupplier")
        .populate("platformDetails.website.inventoryInfo.inventorySupplier")
        .select("_id platformDetails website.inventoryInfo productCategory brand model srno kind");
    } catch (error) {
      console.error("Error fetching inventorys by condition:", error);
      throw new Error("Failed to fetch inventorys by condition");
    }
  },
  getInventoryById: async (id: string) => {
    try {
      const inventory = await Inventory.findById(id)
        .populate("platformDetails.website.inventoryInfo.productCategory")
        .populate("platformDetails.amazon.inventoryInfo.productCategory")
        .populate("platformDetails.ebay.inventoryInfo.productCategory")
        .populate("platformDetails.amazon.inventoryInfo.inventorySupplier")
        .populate("platformDetails.ebay.inventoryInfo.inventorySupplier")
        .populate("platformDetails.website.inventoryInfo.inventorySupplier")
        .populate("platformDetails.website.prodPricing.paymentPolicy")
        .populate("platformDetails.amazon.prodPricing.paymentPolicy")
        .populate("platformDetails.ebay.prodPricing.paymentPolicy");
      if (!inventory) throw new Error("Inventory not found");
      // if (inventory.platformDetails[platform]) {
      //   return inventory.platformDetails[platform];
      // }
      // throw new Error(`No details found for platform: ${platform}`);
      return inventory;
    } catch (error) {
      // console.error(`Error fetching inventory by ID for platform ${platform}:`, error);
      console.error(`Error fetching inventory`, error);
      throw new Error("Failed to fetch inventory");
    }
  },
  updateInventory: async (id: string, platform: "amazon" | "ebay" | "website", data: any) => {
    try {
      const updateQuery = { [`platformDetails.${platform}`]: data };
      const updatedInventory = await Inventory.findByIdAndUpdate(id, updateQuery, {
        new: true,
      });
      if (!updatedInventory) throw new Error("Inventory not found");
      return updatedInventory.platformDetails[platform];
    } catch (error) {
      console.error(`Error updating inventory for platform ${platform}:`, error);
      throw new Error("Failed to update inventory");
    }
  },
  deleteInventory: (id: string) => {
    const inventory = Inventory.findByIdAndDelete(id);
    if (!inventory) {
      throw new Error("Category not found");
    }
    return inventory;
  },
  toggleBlock: async (id: string, isBlocked: boolean) => {
    try {
      const updatedInventory = await Inventory.findByIdAndUpdate(id, { isBlocked }, { new: true });
      if (!updatedInventory) throw new Error("Inventory not found");
      return updatedInventory;
    } catch (error) {
      console.error("Error toggling block status:", error);
      throw new Error("Failed to toggle block status");
    }
  },
  // New API for fetching inventory stats (separate service logic)
  getInventoryStats: async () => {
    try {
      const totalInventorys = await Inventory.countDocuments({});
      const activeInventorys = await Inventory.countDocuments({
        isBlocked: false,
      });
      const blockedInventorys = await Inventory.countDocuments({
        isBlocked: true,
      });
      const PublishedInventorys = await Inventory.countDocuments({
        status: "published",
      });
      const DraftInventorys = await Inventory.countDocuments({
        status: "draft",
      });
      const TemplateInventorys = await Inventory.countDocuments({
        isTemplate: true,
      });

      return {
        totalInventorys,
        activeInventorys,
        blockedInventorys,
        PublishedInventorys,
        DraftInventorys,
        TemplateInventorys,
      };
    } catch (error) {
      console.error("Error fetching Inventorys stats:", error);
      throw new Error("Error fetching inventorys statistics");
    }
  },
  searchAndFilterInventorys: async (filters: any) => {
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

      // Search within platformDetails (amazon, ebay, website) for inventoryInfo.title and inventoryInfo.brand
      if (searchQuery) {
        query.$or = [
          {
            "platformDetails.amazon.inventoryInfo.title": {
              $regex: searchQuery,
              $options: "i",
            },
          },
          {
            "platformDetails.amazon.inventoryInfo.brand": {
              $regex: searchQuery,
              $options: "i",
            },
          },
          {
            "platformDetails.ebay.inventoryInfo.title": {
              $regex: searchQuery,
              $options: "i",
            },
          },
          {
            "platformDetails.ebay.inventoryInfo.brand": {
              $regex: searchQuery,
              $options: "i",
            },
          },
          {
            "platformDetails.website.inventoryInfo.title": {
              $regex: searchQuery,
              $options: "i",
            },
          },
          {
            "platformDetails.website.inventoryInfo.brand": {
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

      // Fetch inventorys with pagination
      const inventorys = await Inventory.find(query).populate("userType").skip(skip).limit(limitNumber);

      // Count total inventorys
      const totalInventorys = await Inventory.countDocuments(query);

      return {
        inventorys,
        pagination: {
          totalInventorys,
          currentPage: pageNumber,
          totalPages: Math.ceil(totalInventorys / limitNumber),
          perPage: limitNumber,
        },
      };
    } catch (error) {
      console.error("Error during search and filter:", error);
      throw new Error("Error during search and filter");
    }
  },
  //bulk import inventorys as CSV
  bulkImportInventorys: async (filePath: string): Promise<void> => {
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
        console.log("❌ No valid inventorys to import.");
        return;
      }

      // ✅ Fetch all existing inventory titles to prevent duplicates
      const existingTitles = new Set((await Inventory.find({}, "title")).map((p: any) => p.title));

      // ✅ Fetch all suppliers in one query to optimize validation
      const supplierKeys = validRows.map(({ data }) => data.inventorySupplierKey);
      const existingSuppliers = await User.find(
        { supplierKey: { $in: supplierKeys } },
        "_id supplierKey"
        // ).lean();
      );
      const supplierMap = new Map(existingSuppliers.map((supplier) => [supplier.supplierKey, supplier._id]));

      // ✅ Filter out invalid suppliers
      const filteredRows = validRows.filter(({ data }) => {
        if (!supplierMap.has(data.inventorySupplierKey)) {
          invalidRows.push({
            row: data.row,
            errors: [`supplierKey ${data.inventorySupplierKey} does not exist.`],
          });
          return false;
        }
        return true;
      });

      if (filteredRows.length === 0) {
        console.log("❌ No valid inventorys to insert after supplier validation.");
        return;
      }

      // ✅ Bulk insert new inventorys (avoiding duplicates)
      const bulkOperations = filteredRows
        .filter(({ data }) => !existingTitles.has(data.title))
        .map(({ data }) => ({
          insertOne: {
            document: {
              title: data.title,
              brand: data.brand,
              inventoryDescription: data.inventoryDescription,
              productCategory: new mongoose.Types.ObjectId(data.productCategory),
              inventorySupplier: supplierMap.get(data.inventorySupplierKey), // ✅ Replace supplierKey with actual _id
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
                  inventoryInfo: {
                    brand: data.brand,
                    title: data.title,
                    inventoryDescription: data.inventoryDescription,
                    productCategory: new mongoose.Types.ObjectId(data.productCategory),
                    inventorySupplier: supplierMap.get(data.inventorySupplierKey),
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
        console.log("✅ No new inventorys to insert.");
        return;
      }

      // ✅ Perform Bulk Insert Operation
      await Inventory.bulkWrite(bulkOperations);
      console.log(`✅ Bulk import completed. Successfully added ${bulkOperations.length} new inventorys.`);

      // ✅ Log skipped rows due to invalid suppliers
      if (invalidRows.length > 0) {
        console.log("❌ Some inventorys were skipped due to invalid suppliers:");
        invalidRows.forEach(({ row, errors }) => {
          console.log(`Row ${row}: ${errors.join(", ")}`);
        });
      }
    } catch (error) {
      console.error("❌ Bulk import failed:", error);
    }
  },

  //bulk Export inventorys to CSV
  exportInventorys: async (): Promise<string> => {
    try {
      // Fetch all inventorys from the database
      const inventorys = await Inventory.find({});

      // Format the inventorys data for CSV export
      const formattedData = inventorys.map((inventory: any) => ({
        InventoryID: inventory._id,
        Title: inventory.title,
        Description: inventory.description,
        Price: inventory.price,
        Category: inventory.category,
        // InventorySupplier: inventory?.supplier?.name,
        Stock: inventory.stock,
        SupplierId: inventory.supplier?._id,
        AmazonInfo: JSON.stringify(inventory.platformDetails.amazon.inventoryInfo),
        EbayInfo: JSON.stringify(inventory.platformDetails.ebay.inventoryInfo),
        WebsiteInfo: JSON.stringify(inventory.platformDetails.website.inventoryInfo),
      }));

      // Convert the data to CSV format using Papa.unparse
      const csv = Papa.unparse(formattedData);

      // Generate a unique file path for the export
      const filePath = `exports/inventorys_${Date.now()}.csv`;

      // Write the CSV data to a file
      fs.writeFileSync(filePath, csv);

      console.log("✅ Export completed successfully.");
      return filePath;
    } catch (error) {
      console.error("❌ Export Failed:", error);
      throw new Error("Failed to export inventorys.");
    }
  },
  bulkUpdateInventoryTaxDiscount: async (inventoryIds: string[], discountValue: number, vat: number) => {
    try {
      // Check if the discountValue and vat are numbers and valid
      if (typeof discountValue !== "number" || typeof vat !== "number") {
        throw new Error("Invalid discountValue or vat. They must be numbers.");
      }

      // Perform bulk update with nested prodPricing field
      const result = await Inventory.updateMany(
        { _id: { $in: inventoryIds } }, // Filter valid inventory IDs
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
        throw new Error("No inventorys were updated. Please verify inventory IDs and data.");
      }

      return result;
    } catch (error: any) {
      throw new Error(`Error during bulk update: ${error.message}`);
    }
  },

  upsertInventoryPartsService: async (inventoryId: string, selectedVariations: any) => {
    return await Inventory.findByIdAndUpdate(
      inventoryId,
      { $set: { selectedVariations } }, // If exists, update. If not, create.
      { new: true, upsert: true } // `upsert: true` ensures creation if missing.
    );
  },

  // Get selected variations for a inventory
  getSelectedInventoryPartsService: async (inventoryId: string) => {
    return await Inventory.findById(inventoryId).select("selectedVariations");
  },
};
