import { inventoryService } from "@/services";
import { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import mongoose from "mongoose";
import { transformInventoryData } from "@/utils/transformInventoryData.util";
import { Inventory, Stock, User, Variation } from "@/models";
import { redis } from "@/datasources";
import { setCacheWithTTL } from "@/datasources/redis.datasource";
import { validateCsvData } from "@/utils/bulkImport.util";
export const inventoryController = {
  // Controller - inventoryController.js

  createDraftInventory: async (req: Request, res: Response) => {
    try {
      const { stepData } = req.body;

      if (!stepData || typeof stepData !== "object") {
        return res.status(StatusCodes.BAD_REQUEST).json({
          success: false,
          message: "Invalid or missing 'stepData' in request payload",
        });
      }

      if (!stepData.productInfo || typeof stepData.productInfo !== "object") {
        return res.status(StatusCodes.BAD_REQUEST).json({
          success: false,
          message: "Invalid or missing 'productInfo' in request payload",
        });
      }

      const draftInventory = await inventoryService.createDraftInventoryService(stepData);

      return res.status(StatusCodes.CREATED).json({
        success: true,
        message: "Draft inventory created successfully",
        data: { inventoryId: draftInventory._id },
      });
    } catch (error: any) {
      console.error("Error creating draft inventory:", error);
      return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: error.message || "Error creating draft inventory",
      });
    }
  },
  updateDraftInventoryController: async (req: Request, res: Response) => {
    try {
      const inventoryId = req.params.id;
      const { stepData } = req.body;

      console.log("Received request to update draft inventory:", { inventoryId, stepData });

      // Validate inventory ID
      if (!mongoose.isValidObjectId(inventoryId)) {
        return res.status(StatusCodes.BAD_REQUEST).json({
          success: false,
          message: "Invalid inventory ID",
        });
      }

      // Validate stepData
      if (!stepData || typeof stepData !== "object") {
        return res.status(StatusCodes.BAD_REQUEST).json({
          success: false,
          message: "Invalid or missing 'stepData' in request payload",
        });
      }

      // Update inventory
      const updatedInventory = await inventoryService.updateDraftInventory(inventoryId, stepData);

      if (!updatedInventory) {
        return res.status(StatusCodes.NOT_FOUND).json({
          success: false,
          message: "Inventory not found or could not be updated",
        });
      }

      return res.status(StatusCodes.OK).json({
        success: true,
        message: "Draft inventory updated successfully",
        data: updatedInventory,
      });
    } catch (error: any) {
      console.error("Error updating draft inventory:", error);

      return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: error.message || "Error updating draft inventory",
      });
    }
  },
  getAllInventory: async (req: Request, res: Response) => {
    try {
      const inventory = await inventoryService.getAllInventory();
      return res.status(StatusCodes.OK).json({
        success: true,
        inventory,
      });
    } catch (error: any) {
      console.error("Error fetching inventory:", error);
      return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: error.message || "Error fetching inventory",
      });
    }
  },
  getInventoriesWithStock: async (req: Request, res: Response) => {
    try {
      const inventories = await inventoryService.getInventoriesWithStock();

      if (!inventories.length) {
        return res.status(StatusCodes.OK).json({
          success: true,
          message: "No inventories found with stock",
          data: [],
        });
      }

      return res.status(StatusCodes.OK).json({
        success: true,
        message: "Inventories with stock retrieved successfully",
        total: inventories.length,
        data: inventories,
      });
    } catch (error: any) {
      console.error("❌ Error fetching inventories with stock:", error);
      return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: "Error fetching inventories with stock",
      });
    }
  },
  getInventoryById: async (req: Request, res: Response) => {
    try {
      const { id } = req.params;

      const inventory = await inventoryService.getInventoryById(id);

      if (!inventory) {
        return res.status(StatusCodes.NOT_FOUND).json({
          success: false,
          message: "Inventory not found",
        });
      }

      return res.status(StatusCodes.OK).json({
        success: true,
        inventory,
      });
    } catch (error: any) {
      console.error("Error fetching inventory by ID:", error);
      return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: error.message || "Error fetching inventory",
      });
    }
  },
  getInventoryTemplateById: async (req: Request, res: Response) => {
    try {
      const { id } = req.params;

      // Fetch the original inventory based on the provided ID
      const inventory = await inventoryService.getInventoryById(id);

      if (!inventory) {
        return res.status(StatusCodes.NOT_FOUND).json({
          success: false,
          message: "Inventory not found",
        });
      }

      // Create a new inventory item with the same data
      const newInventory = {
        ...inventory.toObject(),
        _id: undefined,

        isTemplate: false,

        isVariation: false,
        status: "draft",
      }; // Remove the _id to create a new one
      const createdInventory = await Inventory.create(newInventory);

      // Return the new inventory item and its ID
      return res.status(StatusCodes.OK).json({
        success: true,
        inventory: createdInventory,
        // newInventoryId: createdInventory._id, // Return the new inventory ID
      });
    } catch (error: any) {
      console.error("Error fetching and creating new inventory from template:", error);
      return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: error.message || "Error fetching and creating new inventory",
      });
    }
  },

  transformAndSendInventory: async (req: Request, res: Response) => {
    try {
      const { id } = req.params;

      // Validate inventory ID
      if (!mongoose.isValidObjectId(id)) {
        return res.status(StatusCodes.BAD_REQUEST).json({
          success: false,
          message: "Invalid inventory ID",
        });
      }

      // Fetch inventory from DB
      const inventory = await inventoryService.getFullInventoryById(id);

      if (!inventory) {
        return res.status(StatusCodes.NOT_FOUND).json({
          success: false,
          message: "Inventory not found",
        });
      }

      // Transform inventory data using utility
      const transformedInventory = transformInventoryData(inventory);

      // Send transformed inventory as response
      return res.status(StatusCodes.OK).json({
        success: true,
        message: "Inventory transformed successfully",
        data: transformedInventory,
      });
    } catch (error: any) {
      console.error("Error transforming inventory:", error);
      return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: error.message || "Error transforming inventory",
      });
    }
  },
  //Get All Template Inventory Names
  getAllTemplateInventoryNames: async (req: Request, res: Response) => {
    try {
      const templates = await inventoryService.getInventoryByCondition({
        isTemplate: true,
      });

      if (!templates.length) {
        return res.status(StatusCodes.NOT_FOUND).json({
          success: false,
          message: "No templates found",
        });
      }

      const templateList = templates.map((template, index) => {
        const inventoryId = template._id;
        const kind = (template.kind || "UNKNOWN").toLowerCase();

        // ✅ Ensure correct access to prodTechInfo
        const prodInfo = (template as any).prodTechInfo || {};
        let fields: string[] = [];

        switch (kind) {
          case "laptops":
            fields = [
              prodInfo.processor,
              prodInfo.model,
              prodInfo.ssdCapacity,
              prodInfo.hardDriveCapacity,
              prodInfo.manufacturerWarranty,
              prodInfo.operatingSystem,
            ];
            break;
          case "all in one pc":
            fields = [prodInfo.type, prodInfo.memory, prodInfo.processor, prodInfo.operatingSystem];
            break;
          case "projectors":
            fields = [prodInfo.type, prodInfo.model];
            break;
          case "monitors":
            fields = [prodInfo.screenSize, prodInfo.maxResolution];
            break;
          case "gaming pc":
            fields = [prodInfo.processor, prodInfo.gpu, prodInfo.operatingSystem];
            break;
          case "network equipments":
            fields = [prodInfo.networkType, prodInfo.processorType];
            break;
          default:
            fields = ["UNKNOWN"];
        }

        const fieldString = fields.filter(Boolean).join("-") || "UNKNOWN";
        const srno = (index + 1).toString().padStart(2, "0");
        const templateName = `${kind}-${fieldString}-${srno}`.toUpperCase();

        return { templateName, inventoryId };
      });

      // Sorting based on numerical value at the end of templateName
      templateList.sort((a, b) => {
        const numA = Number(a.templateName.match(/\d+$/)?.[0] || 0);
        const numB = Number(b.templateName.match(/\d+$/)?.[0] || 0);
        return numB - numA;
      });

      return res.status(StatusCodes.OK).json({
        success: true,
        message: "Templates fetched successfully",
        data: templateList,
      });
    } catch (error: any) {
      console.error("Error fetching templates:", error);
      return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: error.message || "Error fetching templates",
      });
    }
  },
  //Get All Draft Inventory Names
  getAllDraftInventoryNames: async (req: Request, res: Response) => {
    try {
      const drafts = await inventoryService.getInventoryByCondition({ status: "draft" });

      if (!drafts || drafts.length === 0) {
        return res.status(StatusCodes.NOT_FOUND).json({
          success: false,
          message: "No draft inventory found",
        });
      }

      const draftList = drafts.map((draft, index) => {
        const inventoryId = draft._id;
        const kind = draft?.kind || "UNKNOWN";
        // const prodInfo = draft?.prodTechInfo || {}; // Ensure we reference the correct object
        const prodInfo = (draft as any).prodTechInfo || {};

        let fields: string[] = [];

        switch (kind.toLowerCase()) {
          case "inventory_laptops":
            fields = [
              prodInfo.processor,
              prodInfo.model,
              prodInfo.ssdCapacity,
              prodInfo.hardDriveCapacity,
              prodInfo.manufacturerWarranty,
              prodInfo.operatingSystem,
            ];
            break;
          case "inventory_all_iPn_one_pc":
            fields = [prodInfo.type, prodInfo.memory, prodInfo.processor, prodInfo.operatingSystem];
            break;
          case "inventory_projectors":
            fields = [prodInfo.type, prodInfo.model];
            break;
          case "inventory_monitors":
            fields = [prodInfo.screenSize, prodInfo.maxResolution];
            break;
          case "inventory_gaming_pc":
            fields = [prodInfo.processor, prodInfo.gpu, prodInfo.operatingSystem];
            break;
          case "inventory_network_equipments":
            fields = [prodInfo.networkType, prodInfo.processorType];
            break;
          default:
            fields = ["UNKNOWN"];
            break;
        }

        const fieldString = fields.filter(Boolean).join("-") || "UNKNOWN";
        const srno = (index + 1).toString().padStart(2, "0");
        const draftName = `DRAFT-${kind}-${fieldString}-${srno}`.toUpperCase();

        return { draftName, inventoryId };
      });

      draftList.sort((a, b) => {
        const numA = parseInt(a.draftName.match(/(\d+)$/)?.[0] || "0", 10);
        const numB = parseInt(b.draftName.match(/(\d+)$/)?.[0] || "0", 10);
        return numB - numA;
      });

      return res.status(StatusCodes.OK).json({
        success: true,
        message: "Draft inventory names fetched successfully",
        data: draftList,
      });
    } catch (error: any) {
      console.error("Error fetching Draft names:", error);
      return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: error.message || "Error fetching draft names",
      });
    }
  },
  //Selected transformed draft Inventory
  transformAndSendDraftInventory: async (req: Request, res: Response) => {
    try {
      const { id } = req.params;

      // Validate inventory ID
      if (!mongoose.isValidObjectId(id)) {
        return res.status(StatusCodes.BAD_REQUEST).json({
          success: false,
          message: "Invalid draft ID",
        });
      }

      // Fetch inventory from DB
      const inventory = await inventoryService.getFullInventoryById(id);

      if (!inventory) {
        return res.status(StatusCodes.NOT_FOUND).json({
          success: false,
          message: "Inventory not found",
        });
      }

      // Transform inventory data using utility
      const transformedInventoryDraft = transformInventoryData(inventory);

      // Send transformed Draft inventory as response
      return res.status(StatusCodes.OK).json({
        success: true,
        message: "draft transformed and Fetched successfully",
        data: transformedInventoryDraft,
      });
    } catch (error: any) {
      console.error("Error transforming inventory Draft:", error);
      return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: error.message || "Error transforming inventory Draft",
      });
    }
  },
  //Selected transformed Template Inventory
  transformAndSendTemplateInventory: async (req: Request, res: Response) => {
    try {
      const { id } = req.params;

      // Validate inventory ID
      if (!mongoose.isValidObjectId(id)) {
        return res.status(StatusCodes.BAD_REQUEST).json({
          success: false,
          message: "Invalid template ID",
        });
      }

      // Fetch inventory from DB
      const inventory = await inventoryService.getFullInventoryById(id);

      if (!inventory) {
        return res.status(StatusCodes.NOT_FOUND).json({
          success: false,
          message: "Inventory not found",
        });
      }

      // Transform inventory data using utility
      const transformedInventoryTemplate = transformInventoryData(inventory);

      // Send transformed inventory as response
      return res.status(StatusCodes.OK).json({
        success: true,
        message: "template transformed and Fetched successfully",
        data: transformedInventoryTemplate,
      });
    } catch (error: any) {
      console.error("Error transforming inventory Template:", error);
      return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: error.message || "Error transforming inventory Template",
      });
    }
  },
  updateInventoryById: async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { platform, data } = req.body;

      if (!platform || !data) {
        return res.status(StatusCodes.BAD_REQUEST).json({
          success: false,
          message: "Platform and data are required to update the inventory",
        });
      }

      const updatedInventory = await inventoryService.updateInventory(id, data);

      if (!updatedInventory) {
        return res.status(StatusCodes.NOT_FOUND).json({
          success: false,
          message: "Inventory not found",
        });
      }

      return res.status(StatusCodes.OK).json({
        success: true,
        message: "Inventory updated successfully",
        data: updatedInventory,
      });
    } catch (error: any) {
      console.error("Error updating inventory:", error);
      return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: error.message || "Error updating inventory",
      });
    }
  },
  deleteInventory: async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const result = await inventoryService.deleteInventory(id);
      res.status(StatusCodes.OK).json({
        success: true,
        message: "Inventory deleted successfully",
        deletedInventory: result,
      });
    } catch (error) {
      console.error("Delete Inventory Error:", error);
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ success: false, message: "Error deleting inventory" });
    }
  },
  toggleBlock: async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { isBlocked } = req.body;

      if (typeof isBlocked !== "boolean") {
        return res.status(StatusCodes.BAD_REQUEST).json({
          success: false,
          message: "isBlocked must be a boolean value",
        });
      }

      const updatedInventory = await inventoryService.toggleBlock(id, isBlocked);

      if (!updatedInventory) {
        return res.status(StatusCodes.NOT_FOUND).json({
          success: false,
          message: "Inventory not found",
        });
      }

      return res.status(StatusCodes.OK).json({
        success: true,
        message: `Inventory ${isBlocked ? "blocked" : "unblocked"} successfully`,
        data: updatedInventory,
      });
    } catch (error: any) {
      console.error("Error toggling block status:", error);
      return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: error.message || "Error toggling block status",
      });
    }
  },
  getInventoryStats: async (req: Request, res: Response) => {
    try {
      const stats = await inventoryService.getInventoryStats();
      return res.status(StatusCodes.OK).json(stats);
    } catch (error) {
      return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ message: "Error fetching inventory statistics" });
    }
  },
  searchAndFilterInventory: async (req: Request, res: Response) => {
    try {
      // Extract filters from query params
      const {
        searchQuery = "",
        userType,
        status, // Extract status properly
        isBlocked,
        isTemplate,
        kind,
        isPart,
        startDate,
        endDate,
        page = "1",
        limit = "10",
      } = req.query;

      // Safe parsing and validation
      const filters = {
        searchQuery: searchQuery as string,
        userType: userType ? userType.toString() : undefined,
        status: status && ["draft", "published"].includes(status.toString()) ? status.toString() : undefined, // Validate status
        isBlocked: isBlocked === "true" ? true : isBlocked === "false" ? false : undefined, // Convert only valid booleans
        isTemplate: isTemplate === "true" ? true : isTemplate === "false" ? false : undefined, // Convert only valid booleans
        isPart: isPart === "true" ? true : isPart === "false" ? false : undefined, // Convert only valid booleans
        kind: kind && ["part"].includes(kind.toString()) ? kind.toString() : undefined,
        startDate: startDate && !isNaN(Date.parse(startDate as string)) ? new Date(startDate as string) : undefined,
        endDate: endDate && !isNaN(Date.parse(endDate as string)) ? new Date(endDate as string) : undefined,
        page: Math.max(parseInt(page as string, 10) || 1, 1), // Ensure valid positive integer
        limit: parseInt(limit as string, 10) || 10, // Default to 10 if invalid
      };

      // Call the service to search and filter the inventorys
      const inventory = await inventoryService.searchAndFilterInventory(filters);

      // Return the results
      res.status(200).json({
        success: true,
        message: "Search and filter completed successfully",
        data: inventory,
      });
    } catch (error) {
      console.error("Error in search and filter:", error);
      res.status(500).json({
        success: false,
        message: "Error in search and filter inventory",
      });
    }
  },
  bulkUpdateInventoryTaxAndDiscount: async (req: Request, res: Response) => {
    try {
      const { inventoryIds, discountValue, vat } = req.body;

      if (!Array.isArray(inventoryIds) || inventoryIds.length === 0) {
        return res.status(400).json({ message: "inventoryIds array is required" });
      }

      if (discountValue === undefined || vat === undefined) {
        return res.status(400).json({ message: "Both discount and VAT/tax are required" });
      }

      // Validate each inventoryId format
      for (const inventoryId of inventoryIds) {
        if (!mongoose.Types.ObjectId.isValid(inventoryId)) {
          return res.status(400).json({ message: `Invalid inventoryId: ${inventoryId}` });
        }
      }

      // Perform bulk update
      const result = await inventoryService.bulkUpdateInventoryTaxAndDiscount(inventoryIds, discountValue, vat);

      return res.status(200).json({
        message: "Inventory VAT/tax and discount updated successfully",
        result,
      });
    } catch (error: any) {
      res.status(500).json({ message: "Internal Server Error", error: error.message });
    }
  },
  upsertInventoryParts: async (req: Request, res: Response) => {
    try {
      const inventory = await inventoryService.upsertInventoryPartsService(req.params.id, req.body.selectedVariations);
      if (!inventory) return res.status(404).json({ message: "Inventory not found" });

      res.status(200).json({ message: "Inventory variations updated successfully", inventory });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  },
  // Get selected variations
  getSelectedInventoryParts: async (req: Request, res: Response) => {
    try {
      const inventory: any = await inventoryService.getSelectedInventoryPartsService(req.params.id);
      if (!inventory) return res.status(404).json({ message: "Inventory not found" });

      res.status(200).json({ selectedVariations: inventory.selectedVariations });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  },
  // Function to handle caching and pagination of variations
  generateAndStoreVariations: async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;
      const searchQueries = req.query.search; // Search can be a string or an array
      const cacheKey = `variations:${id}`; // Cache key based on inventory ID

      // **Fetch inventory item first**
      const inventoryItem: any = await Inventory.findById(id);
      if (!inventoryItem) {
        return res.status(404).json({ message: "Inventory item not found" });
      }

      // **Check if variations should be created**
      if (!inventoryItem.isVariation) {
        return res.status(400).json({ message: "Variations are not enabled for this inventory item" });
      }

      // **Handle search queries properly**
      const searchFilters: Record<string, string> = {};
      if (searchQueries) {
        const searchArray = Array.isArray(searchQueries) ? searchQueries : [searchQueries];

        searchArray.forEach((filter: any) => {
          const [key, value] = filter.split(":");
          if (key && value) {
            searchFilters[key] = value.toLowerCase(); // Store search filters as lowercase for case-insensitive matching
          }
        });
      }

      // **Check cache first**
      const cachedVariations = await redis.get(cacheKey);
      let allVariations;

      if (cachedVariations) {
        allVariations = JSON.parse(cachedVariations);
        console.log("Cache hit: Returning variations from cache.");
      } else {
        // **Extract multi-select attributes**
        // **Extract multi-select attributes**
        const attributes = inventoryItem.prodTechInfo;
        const multiSelectAttributes = Object.keys(attributes).reduce((acc: any, key) => {
          if (Array.isArray(attributes[key]) && attributes[key].length > 0) {
            acc[key] = attributes[key];
          }
          return acc;
        }, {});

        // **Exclude 'brand' and 'features' from multi-select attributes**
        const excludedAttributes = ["brand", "features", "model"];
        const filteredAttributes = Object.keys(multiSelectAttributes).reduce((acc: any, key) => {
          if (!excludedAttributes.includes(key)) {
            acc[key] = multiSelectAttributes[key];
          }
          return acc;
        }, {});

        if (Object.keys(filteredAttributes).length === 0) {
          return res.status(400).json({ message: "No multi-select attributes found for variations" });
        }

        // **Generate variations dynamically using the filtered attributes**
        allVariations = await inventoryService.generateCombinations(filteredAttributes);

        // **Cache generated variations in Redis (TTL: 1 hour)**
        await redis.setex(cacheKey, 3600, JSON.stringify(allVariations));
        console.log("Cache miss: Generated and cached all variations.");
      }

      // **Apply dynamic search filters**
      if (Object.keys(searchFilters).length > 0) {
        allVariations = allVariations.filter((variation: any) => {
          return Object.keys(searchFilters).every((key) => {
            return variation[key] && variation[key].toString().toLowerCase() === searchFilters[key];
          });
        });
      }

      // **Get total combinations count (before pagination)**
      const totalCombinations = allVariations.length;

      // **Apply pagination**
      const paginatedVariations = allVariations.slice((page - 1) * limit, page * limit);

      // **Return response**
      return res.status(200).json({
        message: "Variations fetched",
        totalCombinations, // 🔥 Total combinations (before pagination)
        variations: paginatedVariations,
        currentPage: page,
        totalPages: Math.ceil(totalCombinations / limit),
      });
    } catch (error) {
      console.error("❌ Error generating variations:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  },

  // Store Selected Variations (POST Request)
  storeSelectedVariations: async (req: Request, res: Response) => {
    try {
      const { inventoryId, variations } = req.body;

      if (!inventoryId) {
        return res.status(400).json({ message: "Missing inventory ID in request" });
      }

      if (!mongoose.Types.ObjectId.isValid(inventoryId)) {
        return res.status(400).json({ message: "Invalid inventory ID format" });
      }

      if (!variations || variations.length === 0) {
        return res.status(400).json({ message: "No variations selected" });
      }

      // ✅ Check if inventory exists and if `isVariation` is true
      const inventoryItem = await Inventory.findById(inventoryId);

      if (!inventoryItem) {
        return res.status(404).json({ message: "Inventory item not found" });
      }

      if (!inventoryItem.isVariation) {
        return res.status(400).json({ message: "Variations are not allowed for this inventory item." });
      }

      // ✅ Proceed with storing variations if isVariation is true
      const variationsToStore = variations.map((variation: any) => {
        const { tempId, ...attributes } = variation;
        return {
          tempId,
          inventoryId,
          attributes,
          isSelected: true,
        };
      });

      const storedVariations = await Variation.insertMany(variationsToStore);

      // ✅ Include tempId in response
      const responseVariations = storedVariations.map((variation, index) => ({
        tempId: variations[index].tempId,
        id: variation._id,
      }));

      res.status(201).json({
        message: "Selected variations saved successfully",
        variations: responseVariations,
      });
    } catch (error) {
      console.error("❌ Error saving selected variations:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  },
  //bulk import inventory as CSV

  updateVariations: async (req: Request, res: Response) => {
    try {
      const { id } = req.params; // Inventory ID
      const { variations } = req.body; // Array of variations to update

      if (!id || !variations || !Array.isArray(variations)) {
        return res.status(400).json({ message: "Missing required data" });
      }

      if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({ message: "Invalid inventory ID format" });
      }

      const bulkOps = variations.map((variation: any) => ({
        updateOne: {
          filter: { _id: variation.variationId, inventoryId: id }, // Ensure variation belongs to this inventory
          update: { $set: { ...variation } }, // Update variation details
        },
      }));

      const bulkWriteResult = await Variation.bulkWrite(bulkOps);

      if (bulkWriteResult.modifiedCount === 0) {
        return res.status(404).json({ message: "No variations were updated" });
      }

      // Fetch updated documents
      const updatedVariations = await Variation.find({
        _id: { $in: variations.map((v: any) => v.variationId) },
      });

      res.status(200).json({
        message: "Variations updated successfully",
        modifiedCount: bulkWriteResult.modifiedCount,
        variations: updatedVariations,
      });
    } catch (error) {
      console.error("❌ Error updating variations:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  },
};
