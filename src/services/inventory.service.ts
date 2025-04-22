import { Inventory, ProductCategory, Stock, User, UserCategory } from "@/models";
import { Parser } from "json2csv";
import mongoose from "mongoose";
import fs from "fs";
import os from "os";
import { validateCsvData } from "@/utils/bulkImport.util";
import {
  allInOnePCTechnicalSchema,
  gamingPCTechnicalSchema,
  laptopTechnicalSchema,
  monitorTechnicalSchema,
  networkEquipmentsTechnicalSchema,
  projectorTechnicalSchema,
} from "@/models/inventory.model";
import { v4 as uuidv4 } from "uuid";
import { addLog } from "@/utils/bulkImportLogs.util";
import path from "path";
import { productCategory } from "@/routes/product-category.route";
import { cond } from "lodash";

// space

// Define a type for the tech schemas
type TechSchemas = {
  laptops: typeof laptopTechnicalSchema;
  all_in_one_pc: typeof allInOnePCTechnicalSchema;
  projectors: typeof projectorTechnicalSchema;
  monitors: typeof monitorTechnicalSchema;
  gaming_pc: typeof gamingPCTechnicalSchema;
  network_equipments: typeof networkEquipmentsTechnicalSchema;
};

// Helper function to get correct tech schema
function getTechSchema(kind: keyof TechSchemas) {
  const techSchemas: TechSchemas = {
    laptops: laptopTechnicalSchema,
    all_in_one_pc: allInOnePCTechnicalSchema,
    projectors: projectorTechnicalSchema,
    monitors: monitorTechnicalSchema,
    gaming_pc: gamingPCTechnicalSchema,
    network_equipments: networkEquipmentsTechnicalSchema,
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
  createDraftInventoryService: async (stepData: any) => {
    console.log("stepData:", stepData);
    try {
      if (!stepData || typeof stepData !== "object") {
        throw new Error("Invalid or missing 'stepData'");
      }

      if (!stepData.productInfo || typeof stepData.productInfo !== "object") {
        throw new Error("Invalid or missing 'productInfo' in stepData");
      }

      // ✅ Extract `isPart` from stepData (NOT from productInfo)
      const isPart = stepData.isPart === true || stepData.isPart === "true"; // Ensure it's a boolean
      const isMultiBrand = stepData.isMultiBrand === true || stepData.isMultiBrand === "true"; // Ensure it's a boolean
      const { kind, productCategory, productSupplier, title, description, brand, inventoryImages, inventoryCondition } =
        stepData.productInfo;

      if (!kind || !Inventory.discriminators || !Inventory.discriminators[kind]) {
        throw new Error("Invalid or missing 'kind' (inventory type)");
      }

      const categoryId = mongoose.isValidObjectId(productCategory)
        ? new mongoose.Types.ObjectId(productCategory)
        : null;
      const supplierId = mongoose.isValidObjectId(productSupplier)
        ? new mongoose.Types.ObjectId(productSupplier)
        : null;

      if (!categoryId) throw new Error("Invalid or missing 'productCategory'");
      if (!supplierId) throw new Error("Invalid or missing 'productSupplier'");

      // ✅ Ensure inventoryImages is correctly mapped inside productInfo
      const productInfo = {
        productCategory: categoryId,
        productSupplier: supplierId,
        title: title || "",
        description: description || "",
        brand: brand || "",
        inventoryCondition: inventoryCondition || "",
        inventoryImages: Array.isArray(inventoryImages) ? inventoryImages : [],
      };

      const draftInventoryData: any = {
        status: "draft",
        isBlocked: false,
        kind,
        isPart, // ✅ Now correctly storing `isPart`
        productInfo,
        // isTemplate,
        // isVariation,
        isMultiBrand,
        prodPricing: stepData.prodPricing || {},
        prodTechInfo: stepData.prodTechInfo || {},
        prodDelivery: stepData.prodDelivery || {},
        prodSeo: stepData.prodSeo || {},
      };

      console.log("draftInventoryData before cleaning:", draftInventoryData);

      Object.keys(draftInventoryData).forEach((key) => {
        if (typeof draftInventoryData[key] === "object" && draftInventoryData[key]) {
          Object.keys(draftInventoryData[key]).forEach((subKey) => {
            if (draftInventoryData[key][subKey] === undefined) {
              delete draftInventoryData[key][subKey];
            }
          });
        }
      });

      console.log("Final draftInventoryData before saving:", draftInventoryData);

      const draftInventory = new Inventory.discriminators[kind](draftInventoryData);
      await draftInventory.save({ validateBeforeSave: false });

      return draftInventory;
    } catch (error: any) {
      console.error("Error creating draft inventory:", error);
      throw new Error(error.message || "Failed to create draft inventory");
    }
  },

  // Update an existing draft inventory when user move to next stepper
  updateDraftInventory: async (inventoryId: string, stepData: any) => {
    try {
      console.log("Received update request:", { inventoryId, stepData });

      // Validate inventoryId
      if (!mongoose.isValidObjectId(inventoryId)) {
        throw new Error("Invalid inventory ID");
      }

      // Find inventory
      const draftInventory: any = await Inventory.findById(inventoryId);
      if (!draftInventory) {
        console.error("Draft inventory not found:", inventoryId);
        throw new Error("Draft inventory not found");
      }

      console.log("Existing inventory before update:", JSON.stringify(draftInventory, null, 2));

      // Update Status & Template Check
      if (stepData.status !== undefined) {
        draftInventory.status = stepData.status;
        draftInventory.isTemplate = stepData.isTemplate || false;
        draftInventory.alias = stepData.alias || "";
      }

      // Update Nested Sections Dynamically
      const sectionsToUpdate = ["productInfo", "prodPricing", "prodDelivery", "prodSeo", "prodMedia", "prodTechInfo"];
      sectionsToUpdate.forEach((section) => {
        if (stepData[section]) {
          console.log(`Updating ${section} with:`, stepData[section]);
          draftInventory[section] = {
            ...(draftInventory[section] || {}), // Preserve existing data
            ...stepData[section], // Merge new data
          };
          draftInventory.markModified(section);
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
        "stocks",
        "stockThreshold",
        "isTemplate",
        "alias",
        "isVariation",
        "isMultiBrand",
        "status",
      ];
      topLevelFields.forEach((field) => {
        if (stepData[field] !== undefined) {
          draftInventory[field] = stepData[field];
        }
      });

      console.log("Final inventory object before save:", JSON.stringify(draftInventory, null, 2));

      // Save updated inventory
      await draftInventory.save({ validateBeforeSave: false });

      console.log("Updated inventory after save:", JSON.stringify(draftInventory, null, 2));

      return draftInventory;
    } catch (error: any) {
      console.error("Error updating draft inventory:", error);
      throw new Error(`Failed to update draft inventory: ${error.message}`);
    }
  },

  getInventoriesWithStock: async () => {
    try {
      // ✅ Step 1: Get unique inventory IDs from Stock where `markAsStock` is true
      const stockInventories = await Stock.distinct("inventoryId", { markAsStock: true });

      if (!stockInventories.length) {
        return [];
      }

      // ✅ Step 2: Find Inventories that match the stock inventory IDs
      const inventories = await Inventory.find({ _id: { $in: stockInventories } }).lean();

      return inventories;
    } catch (error) {
      console.error("❌ Error retrieving inventories with stock:", error);
      throw new Error("Failed to fetch inventories with stock");
    }
  },

  getFullInventoryById: async (id: string) => {
    try {
      const inventory = await Inventory.findById(id)
        .populate("productInfo.productCategory")
        .populate("productInfo.productSupplier");
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
        .populate("productInfo.productCategory")
        .populate("productInfo.productSupplier")
        .populate("prodPricing.paymentPolicy");
    } catch (error) {
      console.error("Error fetching all inventory:", error);
      throw new Error("Failed to fetch inventory");
    }
  },
  //getting all template inventory name and their id
  getInventoryByCondition: async (condition: Record<string, any>) => {
    try {
      return await Inventory.find(condition)
        .populate("productInfo.productCategory")
        .populate("productInfo.productSupplier")
        .select("_id kind prodTechInfo brand model alias srno productCategory productInfo") // ✅ Explicitly include prodTechInfo
        .lean(); // ✅ Converts Mongoose document to plain object (avoids type issues)
    } catch (error) {
      console.error("Error fetching inventory by condition:", error);
      throw new Error("Failed to fetch inventory by condition");
    }
  },
  
  getInventoryById: async (id: string) => {
    try {
      const inventory = await Inventory.findById(id)
        .populate("productInfo.productCategory")
        .populate("productInfo.productSupplier")
        .populate("prodPricing.paymentPolicy");
      if (!inventory) throw new Error("Inventory not found");
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
  toggleIsTemplate: async (id: string, isTemplate: boolean) => {
    try {
      const updatedInventory = await Inventory.findByIdAndUpdate(id, { isTemplate }, { new: true });
      if (!updatedInventory) throw new Error("Inventory not found");
      return updatedInventory;
    } catch (error) {
      console.error("Error toggling template status:", error);
      throw new Error("Failed to toggle template status");
    }
  },
  // New API for fetching inventory stats (separate service logic)
  getInventoryStats: async () => {
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
        kind,
        status, // Extract status from filters
        startDate,
        endDate,
        isPart,
        page = 1, // Default to page 1 if not provided
        limit = 10, // Default to 10 records per page
      } = filters;

      // Convert page and limit to numbers safely
      const pageNumber = Math.max(parseInt(page, 10) || 1, 1); // Ensure minimum page is 1
      const limitNumber = parseInt(limit, 10) || 10;
      const skip = (pageNumber - 1) * limitNumber;

      // Build the query dynamically based on filters
      const query: any = {};

      // Search logic if searchQuery is provided
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
            "prodPricing.condition": {
              $regex: searchQuery,
              $options: "i",
            },
          },
        ];

        // Perform searches for productSupplier and productCategory in parallel using Promise.all
        const [productSuppliers, productCategories] = await Promise.all([
          User.find({
            $or: [
              { firstName: { $regex: searchQuery, $options: "i" } },
              { lastName: { $regex: searchQuery, $options: "i" } },
              { email: { $regex: searchQuery, $options: "i" } },
            ],
          }).select("_id"),

          ProductCategory.find({
            name: { $regex: searchQuery, $options: "i" },
          }).select("_id"),
        ]);

        // Check if search query contains both first and last name (e.g., "Asad Khan")
        if (searchQuery.includes(" ")) {
          const [firstNameQuery, lastNameQuery] = searchQuery.split(" ");

          // Filter product suppliers based on both first name and last name
          const supplierQuery = {
            $or: [
              { firstName: { $regex: firstNameQuery, $options: "i" } },
              { lastName: { $regex: lastNameQuery, $options: "i" } },
            ],
          };

          const suppliersWithFullName = await User.find(supplierQuery).select("_id");
          // Combine both individual and full-name matches
          productSuppliers.push(...suppliersWithFullName);
        }

        // Add filters for productSupplier and productCategory ObjectIds to the query
        query.$or.push(
          {
            "productInfo.productSupplier": {
              $in: productSuppliers.map((supplier) => supplier._id),
            },
          },
          {
            "productInfo.productCategory": {
              $in: productCategories.map((category) => category._id),
            },
          }
        );
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
      if (isPart !== undefined) {
        query.isPart = isPart;
      }
      if (kind === "part") {
        query.kind = kind;
      }

      // Date range filter for createdAt
      if (startDate || endDate) {
        const dateFilter: any = {};
        if (startDate && !isNaN(Date.parse(startDate))) dateFilter.$gte = new Date(startDate);
        if (endDate && !isNaN(Date.parse(endDate))) dateFilter.$lte = new Date(endDate);
        if (Object.keys(dateFilter).length > 0) query.createdAt = dateFilter;
      }

      // Fetch filtered inventory with pagination and populate the necessary fields
      const inventory = await Inventory.find(query)
        .populate("userType")
        .populate("productInfo.productCategory")
        .populate("productInfo.productSupplier")
        .skip(skip)
        .limit(limitNumber);

      // Count total filtered inventory
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
  bulkImportInventory: async (validRows: { row: number; data: any }[]): Promise<void> => {
    try {
      if (validRows.length === 0) {
        addLog("❌ No valid Inventory to import.");
        return;
      }

      // Debugging the valid rows received
      addLog("🔹 Valid Rows Received for Bulk Import:");
      validRows.forEach(({ row, data }) => {
        console.log(`Row: ${row}`);
        console.log("Data:", data);
      });

      // Fetch all existing product titles to prevent duplicates
      // const existingTitles = new Set(
      //   (await Inventory.find({}, "productInfo.title")).map((p: any) => p.productInfo.title)
      // );
      // console.log("🔹 Existing Titles:", existingTitles);

      // Prepare bulk operations
      const bulkOperations = validRows
        .filter(({ data }) => {
          // Ensure the data object and title exist
          if (!data || !data.title) {
            console.log(`❌ Missing title or invalid data for row ${data?.row}`);
            return false; // Skip invalid rows
          }
          // if (existingTitles.has(data.title)) {
          //   console.log(`❌ Duplicate title found for row ${data.row}: ${data.title}`);
          //   return false; // Skip rows with duplicate titles
          // }
          return true;
        })
        .map(({ data }) => {
          addLog(`📦 Preparing to insert row ${data.row} with title: ${data.title}`);

          return {
            insertOne: {
              document: {
                isBlocked: false,
                kind: "inventory_laptops", // Adjust if necessary based on the kind
                status: "draft", // Default status
                isVariation: false, // Default value
                isMultiBrand: false, // Default value
                isTemplate: false, // Default value
                isPart: false, // Default value
                stocks: [], // Assuming empty initially
                stockThreshold: 10, // Default value
                prodTechInfo: {
                  processor: data.processor || [],
                  model: data.model || [],
                  operatingSystem: data.operatingSystem || "",
                  storageType: data.storageType || [],
                  features: data.features || [],
                  ssdCapacity: data.ssdCapacity || [],
                  screenSize: data.screenSize || "14 px",
                  gpu: data.gpu || "",
                  unitType: data.unitType || "box",
                  unitQuantity: data.unitQuantity || "1",
                  mpn: data.mpn || "",
                  processorSpeed: data.processorSpeed || "",
                  series: data.series || "",
                  ramSize: data.ramSize || [],
                  californiaProp65Warning: data.californiaProp65Warning || "",
                  type: data.type || "",
                  releaseYear: data.releaseYear || "",
                  hardDriveCapacity: data.hardDriveCapacity || [],
                  color: data.color || [],
                  maxResolution: data.maxResolution || "",
                  mostSuitableFor: data.mostSuitableFor || "",

                  graphicsProcessingType: data.graphicsProcessingType || "",
                  connectivity: data.connectivity || "",
                  manufacturerWarranty: data.manufacturerWarranty || "",
                  regionOfManufacture: data.regionOfManufacture || "",
                  height: data.height || "",
                  length: data.length || "",
                  weight: data.weight || "",
                  width: data.width || "",
                  /* Default/Empty values for various tech fields */
                },
                productInfo: {
                  productCategory: new mongoose.Types.ObjectId(data.productCategory),
                  productSupplier: data.productSupplier, // Directly use the passed supplier _id
                  title: data.title,
                  description: data.description,
                  inventoryImages: data.images.map((url: string) => ({
                    id: `media-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                    size: 0, // Placeholder size
                    url,
                    type: "image/jpeg",
                  })),
                  inventoryCondition: data.inventoryCondition || "new",
                  brand: data.brand || [],
                },
              },
            },
          };
        });

      if (bulkOperations.length === 0) {
        addLog("✅ No new Inventory to insert.");
        return;
      }

      // Perform Bulk Insert Operation
      await Inventory.bulkWrite(bulkOperations);
      addLog(`✅ Bulk import completed. Successfully added ${bulkOperations.length} new Inventory.`);
    } catch (error: any) {
      addLog(`❌ Bulk import failed: ${error.message}`);
    }
  },
  //bulk Export inventory to CSV
  exportInventory: async (inventoryIds: string[]) => {
    const items = await Inventory.find({ _id: { $in: inventoryIds } }).lean();

    if (!items.length) throw new Error("No inventory items found");

    const flattened = items.map((item: any) => ({
      brand: item.productInfo?.brand?.join(", "),
      title: item.productInfo?.title,
      description: item.productInfo?.description?.replace(/<[^>]*>?/gm, ""),
      productCategory: item.productInfo?.productCategory?.name,
      condition: item.productInfo?.inventoryCondition,
      processor: item.prodTechInfo?.processor?.join(", "),
      gpu: item.prodTechInfo?.gpu,
      screenSize: item.prodTechInfo?.screenSize,
      images: item.productInfo?.inventoryImages?.map((img: any) => img.url).join(", "),
    }));

    const fields = Object.keys(flattened[0] || {});
    const parser = new Parser({ fields });
    const csv = parser.parse(flattened);

    const filename = `inventory-export-${uuidv4()}.csv`;

    const downloadsFolder = path.join(os.homedir(), "Downloads");
    const filePath = path.join(__dirname, "..", "exports", filename);
    // const filePath = path.join(downloadsFolder, filename);

    fs.mkdirSync(downloadsFolder, { recursive: true });
    fs.writeFileSync(filePath, csv);

    return filePath;
  },
  bulkUpdateInventoryTaxAndDiscount: async (inventoryIds: string[], discountValue: number, vat: number) => {
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
            "prodPricing.discountValue": discountValue,
            "prodPricing.vat": vat,
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
  // Function to generate all possible combinations of multi-select attributes
  generateCombinations: async (attributes: Record<string, any>) => {
    const keys = Object.keys(attributes);
    const values = Object.values(attributes);

    const cartesianProduct = (arrays: any[][]) => {
      return arrays.reduce(
        (acc, curr, index) => acc.flatMap((a) => curr.map((b) => ({ ...a, [keys[index]]: b }))),
        [{}]
      );
    };

    return cartesianProduct(values);
  },
  getAllOptions: async () => {
    try {
      // List of all top-level fields and subfields you want to get unique values for
      const fields = [
        // Top-level fields

        // ProductInfo subfields
        // "productInfo.productCategory",
        // "productInfo.productSupplier",
        // "productInfo.title",
        // "productInfo.description",
        "productInfo.inventoryCondition",
        "productInfo.brand",

        // ProdTechInfo subfields
        "prodTechInfo.processor",
        "prodTechInfo.model",
        "prodTechInfo.operatingSystem",
        "prodTechInfo.storageType",
        "prodTechInfo.features",
        "prodTechInfo.ssdCapacity",
        "prodTechInfo.gpu",
        "prodTechInfo.unitType",
        "prodTechInfo.unitQuantity",
        "prodTechInfo.mpn",
        "prodTechInfo.processorSpeed",
        "prodTechInfo.series",
        "prodTechInfo.ramSize",
        "prodTechInfo.californiaProp65Warning",
        "prodTechInfo.type",
        "prodTechInfo.releaseYear",
        "prodTechInfo.hardDriveCapacity",
        "prodTechInfo.color",
        "prodTechInfo.maxResolution",
        "prodTechInfo.mostSuitableFor",
        "prodTechInfo.screenSize",
        "prodTechInfo.graphicsProcessingType",
        "prodTechInfo.connectivity",
        "prodTechInfo.manufacturerWarranty",
        "prodTechInfo.regionOfManufacture",
        "prodTechInfo.height",
        "prodTechInfo.length",
        "prodTechInfo.weight",
        "prodTechInfo.width",

        "prodTechInfo.motherboardModel",

        "prodTechInfo.operatingSystemEdition",
        "prodTechInfo.memory",
        "prodTechInfo.maxRamCapacity",

        "prodTechInfo.formFactor",
        "prodTechInfo.ean",
        "prodTechInfo.inventoryType",

        "prodTechInfo.nonNewConditionDetails",

        "prodTechInfo.numberOfLANPorts",
        "prodTechInfo.maximumWirelessData",
        "prodTechInfo.maximumLANDataRate",
        "prodTechInfo.ports",
        "prodTechInfo.toFit",
        "prodTechInfo.displayType",
        "prodTechInfo.aspectRatio",
        "prodTechInfo.imageBrightness",
        "prodTechInfo.throwRatio",
        "prodTechInfo.compatibleOperatingSystem",
        "prodTechInfo.compatibleFormat",
        "prodTechInfo.lensMagnification",
        "prodTechInfo.yearManufactured",
        "prodTechInfo.nativeResolution",
        "prodTechInfo.displayTechnology",
        "prodTechInfo.energyEfficiencyRating",
        "prodTechInfo.videoInputs",
        "prodTechInfo.refreshRate",
        "prodTechInfo.responseTime",
        "prodTechInfo.brightness",
        "prodTechInfo.contrastRatio",
        "prodTechInfo.ecRange",
        "prodTechInfo.productLine",
        "prodTechInfo.customBundle",
        "prodTechInfo.interface",
        "prodTechInfo.networkConnectivity",
        "prodTechInfo.networkManagementType",
        "prodTechInfo.networkType",
        "prodTechInfo.processorManufacturer",
        "prodTechInfo.numberOfProcessors",
        "prodTechInfo.numberOfVANPorts",
        "prodTechInfo.processorType",
        "prodTechInfo.raidLfevel",
        "prodTechInfo.memoryType",
        "prodTechInfo.deviceConnectivity",
        "prodTechInfo.connectorType",
        "prodTechInfo.supportedWirelessProtocol",
      ];

      // Create an object to store the distinct values for each field
      const fetchPromises = fields.map((field) =>
        Inventory.find({})
          .distinct(field)
          .then((distinctValues) => {
            distinctValues = distinctValues.filter((value) => value !== "" && value !== null && value !== undefined);
            return { field, distinctValues };
          })
      );

      const results = await Promise.all(fetchPromises);

      const allOptions: Record<string, any> = {};
      results.forEach(({ field, distinctValues }) => {
        if (distinctValues.length > 0) {
          allOptions[field] = distinctValues;
        }
      });

      // Separate into productInfo and prodTechInfo
      const productInfo: Record<string, any> = {};
      const prodTechInfo: Record<string, any> = {};

      Object.entries(allOptions).forEach(([key, value]) => {
        if (key.startsWith("productInfo.")) {
          productInfo[key.replace("productInfo.", "")] = value;
        } else if (key.startsWith("prodTechInfo.")) {
          prodTechInfo[key.replace("prodTechInfo.", "")] = value;
        }
      });

      return { productInfo, prodTechInfo };
    } catch (error) {
      console.error("Error fetching all options:", error);
      throw new Error("Failed to fetch all options");
    }
  },
};
