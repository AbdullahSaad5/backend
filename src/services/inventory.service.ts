import { Inventory, User } from "@/models";
import Papa from "papaparse";
import mongoose from "mongoose";
import fs from "fs";
import { validateCsvData } from "@/utils/bulkImport.util";
import { allInOnePCTechnicalSchema, gamingPCTechnicalSchema, laptopTechnicalSchema, monitorTechnicalSchema, networkEquipmentsTechnicalSchema, prodDeliverySchema, prodMediaSchema, prodPricingSchema, prodSeoSchema, projectorTechnicalSchema } from "@/models/inventory.model";


// Define a type for the tech schemas
type TechSchemas = {
  laptops: typeof laptopTechnicalSchema,
  all_in_one_pc: typeof allInOnePCTechnicalSchema,
  projectors: typeof projectorTechnicalSchema,
  monitors: typeof monitorTechnicalSchema,
  gaming_pc: typeof gamingPCTechnicalSchema,
  network_equipments: typeof networkEquipmentsTechnicalSchema
};

// Helper function to get correct tech schema
function getTechSchema(kind: keyof TechSchemas) {
  const techSchemas: TechSchemas = {
    'laptops': laptopTechnicalSchema,
    'all_in_one_pc': allInOnePCTechnicalSchema,
    'projectors': projectorTechnicalSchema,
    'monitors': monitorTechnicalSchema,
    'gaming_pc': gamingPCTechnicalSchema,
    'network_equipments': networkEquipmentsTechnicalSchema
  };
  return techSchemas[kind] || {};
}

// Utility function to pick allowed fields
function pick(obj: any, keys: string[]) {
  return keys.reduce((acc: { [key: string]: any }, key) => {
    if (obj[key] !== undefined) acc[key] = obj[key];
    return acc;
  }, {});
}
export const inventoryService = {
  // Create a new draft inventory
  createDraftInventory: async (stepData: any) => {
    try {
      const { kind, productCategory, productSupplier } = stepData;

      if (!kind || !Inventory.discriminators || !Inventory.discriminators[kind]) {
        throw new Error("Invalid or missing 'kind' (inventory type)");
      }

      const categoryId = mongoose.isValidObjectId(productCategory)
        ? new mongoose.Types.ObjectId(productCategory)
        : null;
      const supplierId = mongoose.isValidObjectId(productSupplier)
        ? new mongoose.Types.ObjectId(productSupplier)
        : null;

      if (!categoryId) {
        throw new Error("Invalid or missing 'productCategory'");
      }
      if (!supplierId) {
        throw new Error("Invalid or missing 'productSupplier'");
      }

      const draftInventoryData: { [key: string]: any } = {
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
        prodTechInfo: stepData.prodTechInfo || {},
        prodMedia: stepData.prodMedia || {},
        prodDelivery: stepData.prodDelivery || {},
        prodSeo: stepData.prodSeo || {},
      };

      // ✅ Remove undefined fields to prevent validation errors
      Object.keys(draftInventoryData).forEach((key) => {
        if (draftInventoryData[key] && typeof draftInventoryData[key] === "object") {
          Object.keys(draftInventoryData[key]).forEach((subKey) => {
            if (draftInventoryData[key][subKey] === undefined) {
              delete draftInventoryData[key][subKey];
            }
          });
        }
      });

      if (!Inventory.discriminators || !Inventory.discriminators[kind]) {
        throw new Error("Invalid or missing 'kind' (inventory type)");
      }
      const draftInventory = new Inventory.discriminators[kind](draftInventoryData);

      await draftInventory.save({ validateBeforeSave: false });
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

      // Handle status updates first
      if (stepData.status !== undefined) {
        draftInventory.status = stepData.status;
        draftInventory.isTemplate = stepData.isTemplate || false;
        await draftInventory.save({ validateBeforeSave: false });
        return draftInventory;
      }

      // Define schema sections with their exact paths
      const schemaSections = {
        productInfo: ['productCategory', 'productSupplier', 'title', 'productDescription', 'brand'],
        prodPricing: Object.keys(prodPricingSchema),
        prodDelivery: Object.keys(prodDeliverySchema),
        prodSeo: Object.keys(prodSeoSchema),
        prodMedia: Object.keys(prodMediaSchema),
        prodTechInfo: [] // Will be dynamically handled
      };

      // 1. Handle productInfo fields (special nested structure)
      if (schemaSections.productInfo.some(field => stepData[field])) {
        draftInventory.productInfo = {
          ...draftInventory.productInfo,
          ...pick(stepData, schemaSections.productInfo)
        };
        draftInventory.markModified('productInfo');
      }

      // 2. Handle nested sections with schema validation
      for (const [section, allowedFields] of Object.entries(schemaSections)) {
        if (section === 'productInfo' || section === 'prodTechInfo') continue;

        if (stepData[section]) {
          // Filter valid fields for the section
          const validUpdate = pick(stepData[section], allowedFields);

          // Merge updates
          draftInventory[section] = {
            ...draftInventory[section],
            ...validUpdate
          };

          draftInventory.markModified(section);
        }
      }

      // 3. Handle tech specs (discriminator-aware)
      if (stepData.prodTechInfo) {
        const techSchema = getTechSchema(draftInventory.kind);
        const validTechFields = Object.keys(techSchema);

        draftInventory.prodTechInfo = {
          ...draftInventory.prodTechInfo,
          ...pick(stepData.prodTechInfo, validTechFields)
        };
        draftInventory.markModified('prodTechInfo');
      }

      // 4. Handle top-level inventory fields
      const topLevelFields = [
        'publishToEbay', 'publishToAmazon', 'publishToWebsite',
        'stockThreshold', 'isBlocked', 'Kind'
      ];

      topLevelFields.forEach(field => {
        if (stepData[field] !== undefined) {
          draftInventory[field] = stepData[field];
        }
      });

      await draftInventory.save({ validateBeforeSave: false });
      return draftInventory;
    } catch (error: any) {
      console.error("Error updating draft inventory:", error);
      throw new Error(`Failed to update draft inventory: ${error.message}`);
    }
  },



  getFullInventoryById: async (id: string) => {
    try {
      const inventory = await Inventory.findById(id)
        .populate("platformDetails.amazon.productInfo.productCategory")
        .populate("platformDetails.ebay.productInfo.productCategory")
        .populate("platformDetails.website.productInfo.productCategory")
        .populate("platformDetails.amazon.productInfo.productSupplier")
        .populate("platformDetails.ebay.productInfo.productSupplier")
        .populate("platformDetails.website.productInfo.productSupplier");
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
      console.error("Error fetching all inventory:", error);
      throw new Error("Failed to fetch inventory");
    }
  },
  //getting all template inventory name and their id
  getInventoryByCondition: async (condition: Record<string, any>) => {
    try {
      // Find inventory matching the condition
      return await Inventory.find(condition)
        .populate("platformDetails.website.productInfo.productCategory")
        .populate("platformDetails.amazon.productInfo.productCategory")
        .populate("platformDetails.ebay.productInfo.productCategory")
        .populate("platformDetails.amazon.productInfo.productSupplier")
        .populate("platformDetails.ebay.productInfo.productSupplier")
        .populate("platformDetails.website.productInfo.productSupplier")
        .select("_id platformDetails website.productInfo productCategory brand model srno kind");
    } catch (error) {
      console.error("Error fetching inventory by condition:", error);
      throw new Error("Failed to fetch inventory by condition");
    }
  },
  getInventoryById: async (id: string) => {
    try {
      const inventory = await Inventory.findById(id)
        .populate("platformDetails.website.productInfo.productCategory")
        .populate("platformDetails.amazon.productInfo.productCategory")
        .populate("platformDetails.ebay.productInfo.productCategory")
        .populate("platformDetails.amazon.productInfo.productSupplier")
        .populate("platformDetails.ebay.productInfo.productSupplier")
        .populate("platformDetails.website.productInfo.productSupplier")
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
  updateInventory: async (id: string, data: any) => {
    try {
      const updateQuery = { [`platformDetails.`]: data };
      const updatedInventory = await Inventory.findByIdAndUpdate(id, updateQuery, {
        new: true,
      });
      if (!updatedInventory) throw new Error("Inventory not found");
      return updatedInventory;
    } catch (error) {
      console.error(`Error updating inventory`, error);
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
  getInventorStats: async () => {
    try {
      const totalInventory = await Inventory.countDocuments({});
      const activeInventory = await Inventory.countDocuments({
        isBlocked: false,
      });
      const blockedInventory = await Inventory.countDocuments({
        isBlocked: true,
      });
      const PublishedInventory = await Inventory.countDocuments({
        status: "published",
      });
      const DraftInventory = await Inventory.countDocuments({
        status: "draft",
      });
      const TemplateInventory = await Inventory.countDocuments({
        isTemplate: true,
      });

      return {
        totalInventory,
        activeInventory,
        blockedInventory,
        PublishedInventory,
        DraftInventory,
        TemplateInventory,
      };
    } catch (error) {
      console.error("Error fetching Inventory stats:", error);
      throw new Error("Error fetching inventory statistics");
    }
  },
  searchAndFilterInventory: async (filters: any) => {
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

      // Fetch inventory with pagination
      const inventory = await Inventory.find(query).populate("userType").skip(skip).limit(limitNumber);

      // Count total inventory
      const totalInventory = await Inventory.countDocuments(query);

      return {
        inventory,
        pagination: {
          totalInventory,
          currentPage: pageNumber,
          totalPages: Math.ceil(totalInventory / limitNumber),
          perPage: limitNumber,
        },
      };
    } catch (error) {
      console.error("Error during search and filter:", error);
      throw new Error("Error during search and filter");
    }
  },
  //bulk import inventory as CSV
  bulkImportInventory: async (filePath: string): Promise<void> => {
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
        console.log("❌ No valid inventory to import.");
        return;
      }

      // ✅ Fetch all existing inventory titles to prevent duplicates
      const existingTitles = new Set((await Inventory.find({}, "title")).map((p: any) => p.title));

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
        console.log("❌ No valid inventory to insert after supplier validation.");
        return;
      }

      // ✅ Bulk insert new inventory (avoiding duplicates)
      const bulkOperations = filteredRows
        .filter(({ data }) => !existingTitles.has(data.title))
        .map(({ data }) => ({
          insertOne: {
            document: {
              title: data.title,
              brand: data.brand,
              inventoryDescription: data.inventoryDescription,
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
                    inventoryDescription: data.inventoryDescription,
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
        console.log("✅ No new inventory to insert.");
        return;
      }

      // ✅ Perform Bulk Insert Operation
      await Inventory.bulkWrite(bulkOperations);
      console.log(`✅ Bulk import completed. Successfully added ${bulkOperations.length} new inventory.`);

      // ✅ Log skipped rows due to invalid suppliers
      if (invalidRows.length > 0) {
        console.log("❌ Some inventory were skipped due to invalid suppliers:");
        invalidRows.forEach(({ row, errors }) => {
          console.log(`Row ${row}: ${errors.join(", ")}`);
        });
      }
    } catch (error) {
      console.error("❌ Bulk import failed:", error);
    }
  },

  //bulk Export inventory to CSV
  exportInventory: async (): Promise<string> => {
    try {
      // Fetch all inventory from the database
      const inventory = await Inventory.find({});

      // Format the inventory data for CSV export
      const formattedData = inventory.map((inventory: any) => ({
        InventoryID: inventory._id,
        Title: inventory.title,
        Description: inventory.description,
        Price: inventory.price,
        Category: inventory.category,
        // ProductSupplier: inventory?.supplier?.name,
        Stock: inventory.stock,
        SupplierId: inventory.supplier?._id,
        AmazonInfo: JSON.stringify(inventory.platformDetails.amazon.productInfo),
        EbayInfo: JSON.stringify(inventory.platformDetails.ebay.productInfo),
        WebsiteInfo: JSON.stringify(inventory.platformDetails.website.productInfo),
      }));

      // Convert the data to CSV format using Papa.unparse
      const csv = Papa.unparse(formattedData);

      // Generate a unique file path for the export
      const filePath = `exports/inventory_${Date.now()}.csv`;

      // Write the CSV data to a file
      fs.writeFileSync(filePath, csv);

      console.log("✅ Export completed successfully.");
      return filePath;
    } catch (error) {
      console.error("❌ Export Failed:", error);
      throw new Error("Failed to export inventory.");
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
        throw new Error("No inventory were updated. Please verify inventory IDs and data.");
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
