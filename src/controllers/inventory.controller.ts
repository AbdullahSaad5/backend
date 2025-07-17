import { inventoryService } from "@/services";
import { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import mongoose from "mongoose";
import { transformInventoryData } from "@/utils/transformInventoryData.util";
import { Inventory, Variation } from "@/models";
import { redis } from "@/datasources";
import ExcelJS from "exceljs";
import fs from "fs";
import path from "path";
import { bulkImportStandardTemplateGenerator } from "@/utils/bulkImportStandardTemplateGenerator.util";
import { processVariationsUtility } from "@/utils/processVariation.util";
interface ParsedAttribute {
  name: string;
  type: string;
  required: boolean;
  variation?: boolean;
  enums?: string[];
  validations: {
    title?: string;
    description?: string;
    editable?: boolean;
    hidden?: boolean;
    examples?: any[];
    minLength?: number;
    maxLength?: number;
    minimum?: number;
    maximum?: number;
    enum?: string[];
    enumNames?: string[];
    selectors?: any[];
    minItems?: number;
    maxItems?: number;
    minUniqueItems?: number;
    maxUniqueItems?: number;
  };
}

interface CategoryResult {
  categoryId: string;
  categoryName: string;
  attributes: ParsedAttribute[];
}
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

      // console.log("Received request to update draft inventory:", { inventoryId, stepData });

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

      // console.log("Here is the inventory : ", inventory);

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

        // isVariation: false,
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
  // getAllTemplateInventoryNames: async (req: Request, res: Response) => {
  //   try {
  //     const templates = await inventoryService.getInventoryByCondition({
  //       isTemplate: true,
  //     });

  //     // console.log("templatestemplates : ", templates);

  //     if (!templates.length) {
  //       return res.status(StatusCodes.NOT_FOUND).json({
  //         success: false,
  //         message: "No templates found",
  //       });
  //     }

  //     const templateList = templates.map((template: any, index: number) => {
  //       // console.log("templatetemplate : ", template);

  //       const inventoryId = template._id;
  //       const templateAlias = template.alias;

  //       // console.log("templateListNAme : " , templateAlias)

  //       const kind = (template.kind || "UNKNOWN").toLowerCase();

  //       // const itemCategory = template.productInfo.productCategory?.name;
  //       const itemCategory = template.productInfo?.productCategory?.name ||
  //                    template.productInfo?.productCategory?.toString() ||
  //                    "UNKNOWN";

  //       // console.log("kindiiii : ", kind);

  //       // ✅ Ensure correct access to prodTechInfo
  //       const prodInfo = (template as any).prodTechInfo || {};
  //       let fields: string[] = [];

  //       switch (itemCategory) {
  //         case "laptops":
  //     fields = [
  //       prodInfo.processor_description?.[0]?.value,
  //       prodInfo.model_name?.[0]?.value,
  //       prodInfo.ssd_capacity?.[0]?.value,
  //       prodInfo.hard_disk?.[0]?.value,
  //       prodInfo.warranty_description?.[0]?.value,
  //       prodInfo.operating_system?.[0]?.value
  //     ];
  //     break;
  // case "all in one":
  //   fields = [
  //     prodInfo.type?.[0]?.value,
  //     prodInfo.memory?.[0]?.value,
  //     prodInfo.processor_description?.[0]?.value,
  //     prodInfo.operating_system?.[0]?.value
  //   ];

  //       case "mini pc":
  //         fields = [prodInfo.type, prodInfo.memory, prodInfo.processor, prodInfo.operatingSystem];
  //         break;
  //       case "computers":
  //         fields = [prodInfo.type, prodInfo.memory, prodInfo.processor, prodInfo.operatingSystem];
  //         break;
  //       case "projectors":
  //         fields = [prodInfo.type, prodInfo.model];
  //         break;
  //       case "monitors":
  //         fields = [prodInfo.screenSize, prodInfo.maxResolution];
  //         break;
  //       case "gaming pc":
  //         fields = [prodInfo.processor, prodInfo.gpu, prodInfo.operatingSystem];
  //         break;
  //       case "network equipments":
  //         fields = [prodInfo.networkType, prodInfo.processorType];
  //         break;
  //         default:
  //           fields = ["UNKNOWN"];
  //       }

  //       console.log("fields : ", fields);

  //       const fieldString = fields.filter(Boolean).join("-") || "UNKNOWN";
  //       const srno = (index + 1).toString().padStart(2, "0");
  //       const templateName =
  //         ` ${kind === "part" ? "PART" : "PRODUCT"} || Category:${itemCategory} || Fields: ${fieldString} || Sr.no: ${srno}`.toUpperCase();

  //       console.log("templateNametemplateName : ", templateName);

  //       return { templateName, inventoryId, templateAlias };
  //     });

  //     // Sorting based on numerical value at the end of templateName
  //     templateList.sort((a, b) => {
  //       const numA = Number(a.templateName.match(/\d+$/)?.[0] || 0);
  //       const numB = Number(b.templateName.match(/\d+$/)?.[0] || 0);
  //       return numB - numA;
  //     });

  //     // console.log("templateList : " , templateList)

  //     return res.status(StatusCodes.OK).json({
  //       success: true,
  //       message: "Templates fetched successfully",
  //       data: templateList,
  //     });
  //   } catch (error: any) {
  //     console.error("Error fetching templates:", error);
  //     return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
  //       success: false,
  //       message: error.message || "Error fetching templates",
  //     });
  //   }
  // },
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

      const templateList = templates.map((template: any, index: number) => {
        const inventoryId = template._id;
        const templateAlias = template.alias;
        const kind = (template.kind || "UNKNOWN").toLowerCase();

        // Properly access the category name
        const itemCategory = template.productInfo?.productCategory?.name || "UNKNOWN";
        const title = template.productInfo?.item_name?.[0]?.value || "Untitled";

        const prodInfo = template.prodTechInfo || {};
        let fields: string[] = [];

        // Use proper field access based on your actual data structure
        switch (itemCategory.toLowerCase()) {
          case "laptops":
            fields = [
              prodInfo.processor_description?.[0]?.value || prodInfo.processor,
              prodInfo.model_name?.[0]?.value || prodInfo.model,
            ];
            break;
          case "all in one":
            fields = [
              prodInfo.type?.[0]?.value,
              prodInfo.memory?.[0]?.value,
              prodInfo.processor_description?.[0]?.value,
              prodInfo.operating_system?.[0]?.value,
            ];

          case "mini pc":
            fields = [prodInfo.type, prodInfo.memory, prodInfo.processor, prodInfo.operatingSystem];
            break;
          case "computers":
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
          // Add other cases
          default:
            fields = ["UNKNOWN"];
        }

        const fieldString = fields.filter(Boolean).join("-") || "UNKNOWN";
        const srno = (index + 1).toString().padStart(2, "0");
        const templateName =
          ` ${kind === "part" ? "PART" : "PRODUCT"} || Title:${title} || Category:${itemCategory} || Fields: ${fieldString} || Sr.no: ${srno}`.toUpperCase();

        return { templateName, inventoryId, templateAlias };
      });

      // Sorting logic remains the same
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
          case "inventory_all_in_one_pc":
            fields = [prodInfo.type, prodInfo.memory, prodInfo.processor, prodInfo.operatingSystem];
            break;
          case "inventory_mini_pc":
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

  toggleIsTemplate: async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { isTemplate } = req.body;

      if (typeof isTemplate !== "boolean") {
        return res.status(StatusCodes.BAD_REQUEST).json({
          success: false,
          message: "isTemplate must be a boolean value",
        });
      }

      const updatedInventory = await inventoryService.toggleIsTemplate(id, isTemplate);

      if (!updatedInventory) {
        return res.status(StatusCodes.NOT_FOUND).json({
          success: false,
          message: "Inventory not found",
        });
      }

      return res.status(StatusCodes.OK).json({
        success: true,
        message: `Product Catalogue ${isTemplate ? "is" : "is not"} a template now`,
        data: updatedInventory,
      });
    } catch (error: any) {
      console.error("Error toggling template status:", error);
      return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: error.message || "Error toggling template status",
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
        productCategory,
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
        productCategory: productCategory?.toString() || undefined,
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
      const inventoryItem: any = await Inventory.findById(id).populate("productInfo.productCategory");

      if (!inventoryItem) {
        return res.status(404).json({ message: "Inventory item not found" });
      }

      // **Check if variations should be created**
      if (!inventoryItem.isVariation) {
        return res.status(400).json({ message: "Variations are not enabled for this inventory item" });
      }

      // **Check product category**
      const categoryName = inventoryItem.productInfo?.productCategory?.amazonCategoryId;
      if (!categoryName) {
        return res.status(400).json({ message: "Product category not found" });
      }

      console.log("Category Name:", categoryName);

      // **Handle search queries properly**
      const searchFilters: Record<string, string[]> = {}; // Allow multiple values per key
      if (searchQueries) {
        const searchArray = Array.isArray(searchQueries) ? searchQueries : [searchQueries];
        searchArray.forEach((filter: any) => {
          const [key, value] = filter.split(":");
          if (key && value) {
            // Allow multiple values for the same attribute
            if (!searchFilters[key]) {
              searchFilters[key] = [];
            }
            searchFilters[key].push(value.toLowerCase()); // Store filter values in lowercase
          }
        });
      }

      // **Check cache first**
      const cachedVariations = await redis.get(cacheKey);
      let allVariations;

      // if (cachedVariations) {
      //   allVariations = JSON.parse(cachedVariations);
      //   console.log("Cache hit: Returning variations from cache.");
      // } else {
      // **Extract productTechInfo and filter only selected attributes**
      const attributes = inventoryItem.prodTechInfo?.toObject?.() || inventoryItem.prodTechInfo;

      if (!attributes || typeof attributes !== "object") {
        return res.status(400).json({ message: "Invalid or missing prodTechInfo" });
      }

      // **Process attributes dynamically based on category**
      const processedAttributes = processVariationsUtility.processAttributesByCategory(categoryName, attributes);
      console.log("Processed Attributes:", processedAttributes);
      if (Object.keys(processedAttributes).length === 0) {
        return res.status(400).json({ message: "No valid attributes found for variations" });
      }

      // **Generate variations dynamically using the processed attributes**
      allVariations = await inventoryService.generateCombinations(processedAttributes);

      // **Cache generated variations in Redis (TTL: 1 hour)**
      await redis.setex(cacheKey, 3600, JSON.stringify(allVariations));
      console.log("Cache miss: Generated and cached all variations.");
      // }

      // **Apply dynamic search filters (allow multiple values per filter)**
      if (Object.keys(searchFilters).length > 0) {
        allVariations = allVariations.filter((variation: any) => {
          return Object.keys(searchFilters).every((key) => {
            const filterValues = searchFilters[key];
            const variationValue = variation[key]?.toString().toLowerCase();
            return filterValues.includes(variationValue);
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
        totalCombinations, // Total combinations (before pagination)
        variations: paginatedVariations,
        currentPage: page,
        totalPages: Math.ceil(totalCombinations / limit),
      });
    } catch (error) {
      console.error("Error generating variations:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  },
  // Controller to fetch selectable options for attributes
  getAllOptions: async (req: Request, res: Response) => {
    try {
      // Fetch the options for each attribute
      const options = await inventoryService.getAllOptions();

      // Return the options in the response
      return res.status(200).json({
        message: "Attribute options fetched successfully",
        options,
      });
    } catch (error) {
      console.error("❌ Error fetching attribute options:", error);
      return res.status(500).json({ message: "Internal server error" });
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

  //bulk delete
  bulkDeleteInventory: async (req: Request, res: Response) => {
    try {
      // First check if body exists and has inventoryIds
      // if (!req.body || !req.body.inventoryIds) {
      //   return res.status(400).json({
      //     success: false,
      //     message: "Request body must contain inventoryIds array"
      //   });
      // }

      const { inventoryIds = [], selectAllPages = false, filters = {} } = req.body;

      if (selectAllPages) {
        // Handle filter-based deletion
        const query: any = {};

        if (filters.status) {
          query.status = filters.status;
        }
        if (filters.isTemplate !== undefined) {
          query.isTemplate = filters.isTemplate;
        }
        if (filters.isBlocked !== undefined) {
          query.isBlocked = filters.isBlocked;
        }

        const result = await Inventory.deleteMany(query);
        return res.status(200).json({
          success: true,
          message: `Deleted ${result.deletedCount} listings`,
          deletedCount: result.deletedCount,
        });
      } else {
        // Ensure inventoryIds is an array
        if (!Array.isArray(inventoryIds)) {
          return res.status(400).json({
            success: false,
            message: "inventoryIds must be an array",
          });
        }
      }

      // Check if array is empty
      if (inventoryIds.length === 0) {
        return res.status(400).json({
          success: false,
          message: "No inventory IDs provided",
        });
      }

      // Validate each ID
      const invalidIds = inventoryIds.filter((id) => {
        // Handle cases where id might be null/undefined
        if (!id) return true;
        // Check if valid ObjectId
        return !mongoose.Types.ObjectId.isValid(id);
      });

      if (invalidIds.length > 0) {
        return res.status(400).json({
          success: false,
          message: `Invalid inventory IDs: ${invalidIds.join(", ")}`,
        });
      }

      // Perform deletion
      const result = await Inventory.deleteMany({
        _id: { $in: inventoryIds },
      });

      return res.status(200).json({
        success: true,
        message: `Deleted ${result.deletedCount} items`,
        deletedCount: result.deletedCount,
      });
    } catch (error: any) {
      console.error("Error in bulk delete:", error);
      return res.status(500).json({
        success: false,
        message: error.message || "Failed to perform bulk delete",
        // Only include stack in development
        ...(process.env.NODE_ENV === "development" && { stack: error.stack }),
      });
    }
  },

  generateXLSXTemplate: async (req: Request, res: Response) => {
    try {
      const workbook = new ExcelJS.Workbook();
      const categoryId = "PERSONAL_COMPUTER";
      const categoryName = "Personal Computer";

      const schema = await bulkImportStandardTemplateGenerator.getAmazonActualSchema(categoryId);
      const parsedAttributes = await bulkImportStandardTemplateGenerator.parseSchemaAttributes(schema);

      if (!parsedAttributes || parsedAttributes.length === 0) {
        throw new Error("No attributes found for category");
      }

      const worksheet = workbook.addWorksheet(createSafeSheetName(categoryName, categoryId));
      const enumSheets = createEnumSheets(workbook, parsedAttributes, categoryId);
      const headers = prepareHeaders(parsedAttributes);

      styleHeaders(worksheet, headers);
      addDataValidation(worksheet, headers, parsedAttributes, enumSheets);

      worksheet.views = [{ state: "frozen", xSplit: 0, ySplit: 1 }];

      createInstructionsSheet(workbook);
      const buffer = await generateAndSaveFile(workbook, res);

      res.send(buffer);
      console.log(`✅ XLSX template with category sheets generated successfully!`);
      console.log(`📁 File saved to: ${path.join(__dirname, "../../exports")}`);
      console.log(`🎯 Category processed: ${categoryName}`);
    } catch (error: any) {
      console.error("❌ Error generating XLSX template:", error);
      res.status(500).json({
        success: false,
        message: "Error generating XLSX template",
        error: error.message,
      });
    }
  },
};

// Creates a safe sheet name
function createSafeSheetName(categoryName: string, categoryId: string): string {
  const idPart = ` (${categoryId})`;
  let safeName = categoryName.replace(/[\\/?*[\]:]/g, "");
  const maxNameLength = 31 - idPart.length;
  if (safeName.length > maxNameLength) {
    safeName = safeName.slice(0, maxNameLength);
  }
  return `${safeName}${idPart}`;
}

function createEnumSheets(workbook: ExcelJS.Workbook, attributes: ParsedAttribute[], categoryId: string): any {
  const enumSheets: any = {};
  const createdSheetNames = new Set<string>();

  attributes.forEach((attr, index) => {
    if (attr.type === "enum" && attr.enums && attr.enums.length > 0) {
      // Skip if we already processed this attribute
      if (enumSheets[attr.name]) {
        console.log(`[createEnumSheets] Skipping duplicate attribute: ${attr.name}`);
        return;
      }

      // Generate a base name, replacing dots with underscores for nested attributes
      let baseSheetName = `List_${attr.name.replace(/[^a-zA-Z0-9]/g, "_")}`;
      let enumSheetName = createSafeSheetName(baseSheetName, categoryId);
      let counter = 1;

      // Ensure unique sheet name by appending counter if needed
      while (createdSheetNames.has(enumSheetName.toLowerCase())) {
        enumSheetName = createSafeSheetName(`${baseSheetName}_${counter}`, categoryId);
        counter++;
      }

      console.log(
        `[createEnumSheets] Creating enum sheet: ${enumSheetName} for attribute: ${attr.name} with values:`,
        attr.enums
      );

      try {
        const enumSheet = workbook.addWorksheet(enumSheetName);
        createdSheetNames.add(enumSheetName.toLowerCase()); // Store lowercase for case-insensitive comparison

        attr.enums.forEach((value: string, rowIndex: number) => {
          enumSheet.getCell(rowIndex + 1, 1).value = value;
        });

        enumSheets[attr.name] = {
          sheetName: enumSheetName,
          range: `${enumSheetName}!$A$1:$A${attr.enums.length}`,
          count: attr.enums.length,
        };

        enumSheet.state = "hidden";
      } catch (error) {
        console.error(`[createEnumSheets] Error creating sheet ${enumSheetName} for attribute ${attr.name}:`, error);
        // Continue with the next attribute instead of throwing
      }
    }
  });
  console.log(`[createEnumSheets] Created ${Object.keys(enumSheets).length} enum sheets`);
  return enumSheets;
}

// Prepares headers for the worksheet
function prepareHeaders(attributes: ParsedAttribute[]): string[] {
  const uniqueHeaders = new Set<string>();
  const staticHeaders = ["Allow Variations*", "Title*", "Description*", "inventoryCondition*", "Brand*"];
  staticHeaders.forEach((header) => uniqueHeaders.add(header));

  attributes.forEach((attr) => {
    let title = attr.name || "Unknown";
    if (attr.required) title += "*";
    if (attr.variation) title += " (variation allowed)";
    uniqueHeaders.add(title);
  });

  return Array.from(uniqueHeaders);
}

// Styles worksheet headers
function styleHeaders(worksheet: ExcelJS.Worksheet, headers: string[]) {
  const headerRow = worksheet.getRow(1);
  headers.forEach((header, index) => {
    const cell = headerRow.getCell(index + 1);
    cell.value = header;
    cell.font = { bold: true, color: { argb: "FFFFFF" } };
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "4472C4" },
    };
    cell.alignment = { vertical: "middle", horizontal: "center" };
    cell.border = {
      top: { style: "thin" },
      left: { style: "thin" },
      bottom: { style: "thin" },
      right: { style: "thin" },
    };
  });

  headers.forEach((header, index) => {
    const column = worksheet.getColumn(index + 1);
    column.width = Math.max(header.length + 5, 15);
  });
}

// Fixed: Adds data validation for enum columns
function addDataValidation(
  worksheet: ExcelJS.Worksheet,
  headers: string[],
  attributes: ParsedAttribute[],
  enumSheets: any
) {
  console.log(`[addDataValidation] Starting validation for ${attributes.length} attributes`);
  console.log(`[addDataValidation] Available enum sheets:`, Object.keys(enumSheets));

  attributes.forEach((attr, index) => {
    // Check if attribute has enums and they exist
    if (attr.enums && attr.enums.length > 0) {
      console.log(`[addDataValidation] Processing attribute: ${attr.name} with enums:`, attr.enums);

      // Find the corresponding enum sheet using attribute name
      const enumSheetInfo = enumSheets[attr.name];
      if (!enumSheetInfo) {
        console.warn(`[addDataValidation] No enum sheet found for attribute ${attr.name}`);
        return;
      }

      // Find the header that matches this attribute (with possible suffixes)
      const possibleHeaders = [
        attr.name,
        `${attr.name}*`,
        `${attr.name} (variation allowed)`,
        `${attr.name}* (variation allowed)`,
      ];

      let headerIndex = -1;
      let matchedHeader = "";

      for (const possibleHeader of possibleHeaders) {
        headerIndex = headers.indexOf(possibleHeader);
        if (headerIndex >= 0) {
          matchedHeader = possibleHeader;
          break;
        }
      }

      if (headerIndex >= 0) {
        const columnLetter = String.fromCharCode(65 + headerIndex);

        console.log(
          `[addDataValidation] Applying validation for ${attr.name} in column ${columnLetter} (header: ${matchedHeader}) with range ${enumSheetInfo.range}`
        );

        // Apply validation to a reasonable number of rows (1000 should be enough)
        for (let row = 2; row <= 1000; row++) {
          const cell = worksheet.getCell(`${columnLetter}${row}`);
          cell.dataValidation = {
            type: "list",
            allowBlank: !attr.required,
            formulae: [enumSheetInfo.range],
            showErrorMessage: true,
            errorStyle: "error",
            errorTitle: "Invalid Entry",
            error: `Value must be selected from the dropdown list for ${attr.name}`,
            showInputMessage: true,
            promptTitle: `Select ${attr.name}`,
            prompt: "Click the dropdown arrow to select a value",
          };
          cell.border = {
            top: { style: "thin" },
            left: { style: "thin" },
            bottom: { style: "thin" },
            right: { style: "thin" },
          };
        }
      } else {
        console.warn(`[addDataValidation] Header not found for attribute ${attr.name}. Available headers:`, headers);
      }
    }
  });
}

// Creates instructions sheet
function createInstructionsSheet(workbook: ExcelJS.Workbook) {
  const instructionsSheet = workbook.addWorksheet("Instructions");
  const instructions = [
    ["📋 XLSX Template Usage Instructions"],
    [""],
    ["🔧 How to Use:"],
    ["1. Go to the category-specific sheet"],
    ["2. Click on any cell in columns with dropdowns"],
    ["3. You will see a dropdown arrow appear"],
    ["4. Click the dropdown arrow to select values"],
    ["5. Only values from the dropdown are allowed"],
    [""],
    ["📊 Notes:"],
    ["• Each sheet represents a category"],
    ["• Headers with * are required"],
    ["• Headers with (variation allowed) support variations"],
    ["• Dropdown columns show valid values"],
    ["• Sample data is provided in row 2"],
  ];

  instructions.forEach((row, rowIndex) => {
    row.forEach((cell, colIndex) => {
      const excelCell = instructionsSheet.getCell(rowIndex + 1, colIndex + 1);
      excelCell.value = cell;
      if (rowIndex === 0) {
        excelCell.font = { bold: true, size: 16, color: { argb: "4472C4" } };
      }
      if (cell && (cell.includes("🔧") || cell.includes("📊"))) {
        excelCell.font = { bold: true, size: 12, color: { argb: "4472C4" } };
      }
    });
  });

  instructionsSheet.getColumn(1).width = 50;
}

// Generates and saves the XLSX file
async function generateAndSaveFile(workbook: ExcelJS.Workbook, res: Response): Promise<Buffer> {
  const buffer: any = await workbook.xlsx.writeBuffer();
  const exportsDir = path.join(__dirname, "../../exports");
  if (!fs.existsSync(exportsDir)) {
    fs.mkdirSync(exportsDir, { recursive: true });
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const filename = `category-template-${timestamp}.xlsx`;
  const filepath = path.join(exportsDir, filename);

  fs.writeFileSync(filepath, buffer);

  res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
  res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
  res.setHeader("Content-Length", buffer.length);

  return buffer;
}
