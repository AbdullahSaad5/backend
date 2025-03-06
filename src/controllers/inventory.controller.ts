import { ebayService,inventoryService } from "@/services";
import { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import mongoose from "mongoose";
import { transformInventoryData } from "@/utils/transformInventoryData.util";

export const inventoryController = {
  createDraftInventory: async (req: Request, res: Response) => {
    try {
      const { stepData } = req.body;

      if (!stepData || typeof stepData !== "object") {
        return res.status(StatusCodes.BAD_REQUEST).json({
          success: false,
          message: "Invalid or missing 'stepData' in request payload",
        });
      }

      // Save draft inventory in MongoDB
      const draftInventory = await inventoryService.createDraftInventory(stepData);

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

  updateDraftInventory: async (req: Request, res: Response) => {
    try {
      const inventoryId = req.params.id;
      const { stepData } = req.body;

      // Validate inventoryId
      if (!mongoose.isValidObjectId(inventoryId)) {
        return res.status(StatusCodes.BAD_REQUEST).json({
          success: false,
          message: "Invalid or missing 'inventoryId'",
        });
      }

      // Validate stepData
      if (!stepData || typeof stepData !== "object") {
        return res.status(StatusCodes.BAD_REQUEST).json({
          success: false,
          message: "Invalid or missing 'stepData' in request payload",
        });
      }

      // Update the draft inventory in MongoDB
      const updatedInventory = await inventoryService.updateDraftInventory(
        inventoryId,
        stepData
      );

      // Check if the inventory is marked for publishing
     

      // If not marked for publishing, just return the updated inventory
      return res.status(StatusCodes.OK).json({
        success: true,
        message: "Draft inventory updated successfully",
        data: updatedInventory,
      });
    } catch (error: any) {
      console.error("Error updating draft inventory:", error);

      // Check if the error is related to eBay synchronization
      if (error.message.includes("eBay")) {
        return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
          success: false,
          message: `Error syncing inventory with eBay: ${error.message}`,
        });
      }

      // Generic internal error
      return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: error.message || "Error updating draft inventory",
      });
    }
  },

  getAllInventory: async (req: Request, res: Response) => {
    try {
      const inventorys = await inventoryService.getAllInventorys();
      return res.status(StatusCodes.OK).json({
        success: true,
        inventorys,
      });
    } catch (error: any) {
      console.error("Error fetching inventorys:", error);
      return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: error.message || "Error fetching inventorys",
      });
    }
  },

  getInventoryById: async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      // const platform = req.query.platform as "amazon" | "ebay" | "website";

      // if (!platform) {
      //   return res.status(StatusCodes.BAD_REQUEST).json({
      //     success: false,
      //     message: "Platform query parameter is required",
      //   });
      // }

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
  getAllTemplateInventorys: async (req: Request, res: Response) => {
    try {
      const templates = await inventoryService.getInventorysByCondition({
        isTemplate: true,
      });

      if (!templates.length) {
        return res.status(StatusCodes.NOT_FOUND).json({
          success: false,
          message: "No templates found",
        });
      }

      let templateList = templates.map((template, index) => {
        const inventoryId = template._id;
        const kind = template.kind || "UNKNOWN";

        let fields: string[] = [];
        const prodInfo: any =
          template.platformDetails.website?.prodTechInfo || {};

        switch (kind.toLowerCase()) {
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
            fields = [
              prodInfo.type,
              prodInfo.memory,
              prodInfo.processor,
              prodInfo.operatingSystem,
            ];
            break;
          case "projectors":
            fields = [prodInfo.type, prodInfo.model];
            break;
          case "monitors":
            fields = [prodInfo.screenSize, prodInfo.maxResolution];
            break;
          case "gaming pc":
            fields = [
              prodInfo.processor,
              prodInfo.gpu,
              prodInfo.operatingSystem,
            ];
            break;
          case "network equipments":
            fields = [prodInfo.networkType, prodInfo.processorType];
            break;
          default:
            fields = ["UNKNOWN"];
            break;
        }

        const fieldString = fields.filter(Boolean).join("-") || "UNKNOWN";

        const srno = (index + 1).toString().padStart(2, "0");

        const templateName = `${kind}-${fieldString}-${srno}`.toUpperCase();

        return { templateName, inventoryId };
      });

      // 🔹 Sort by the number at the end of templateName in descending order
      templateList.sort((a, b) => {
        const numA = parseInt(a.templateName.match(/(\d+)$/)?.[0] || "0", 10);
        const numB = parseInt(b.templateName.match(/(\d+)$/)?.[0] || "0", 10);
        return numB - numA; // Descending order
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
      const drafts = await inventoryService.getInventorysByCondition({
        status: "draft",
      });

      if (!drafts.length) {
        return res.status(StatusCodes.NOT_FOUND).json({
          success: false,
          message: "No draft inventorys found",
        });
      }

      let draftList = drafts.map((draft, index) => {
        const inventoryId = draft._id;
        const kind = draft.kind || "UNKNOWN";

        let fields: string[] = [];
        const prodInfo: any = draft.platformDetails.website?.prodTechInfo || {};

        switch (kind.toLowerCase()) {
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
            fields = [
              prodInfo.type,
              prodInfo.memory,
              prodInfo.processor,
              prodInfo.operatingSystem,
            ];
            break;
          case "projectors":
            fields = [prodInfo.type, prodInfo.model];
            break;
          case "monitors":
            fields = [prodInfo.screenSize, prodInfo.maxResolution];
            break;
          case "gaming pc":
            fields = [
              prodInfo.processor,
              prodInfo.gpu,
              prodInfo.operatingSystem,
            ];
            break;
          case "network equipments":
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

      // 🔹 Sort by the number at the end of draftName in descending order
      draftList.sort((a, b) => {
        const numA = parseInt(a.draftName.match(/(\d+)$/)?.[0] || "0", 10);
        const numB = parseInt(b.draftName.match(/(\d+)$/)?.[0] || "0", 10);
        return numB - numA; // Descending order
      });

      return res.status(StatusCodes.OK).json({
        success: true,
        message: "Draft inventorys names fetched successfully",
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

      const updatedInventory = await inventoryService.updateInventory(
        id,
        platform,
        data
      );

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
      res
        .status(StatusCodes.INTERNAL_SERVER_ERROR)
        .json({ success: false, message: "Error deleting inventory" });
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
      return res
        .status(StatusCodes.INTERNAL_SERVER_ERROR)
        .json({ message: "Error fetching inventorys statistics" });
    }
  },
  searchAndFilterInventorys: async (req: Request, res: Response) => {
    try {
      // Extract filters from query params
      const {
        searchQuery = "",
        userType,
        status, // Extract status properly
        isBlocked,
        isTemplate,
        startDate,
        endDate,
        page = "1",
        limit = "10",
      } = req.query;

      // Safe parsing and validation
      const filters = {
        searchQuery: searchQuery as string,
        userType: userType ? userType.toString() : undefined,
        status:
          status && ["draft", "published"].includes(status.toString())
            ? status.toString()
            : undefined, // Validate status
        isBlocked:
          isBlocked === "true"
            ? true
            : isBlocked === "false"
              ? false
              : undefined, // Convert only valid booleans
        isTemplate:
          isTemplate === "true"
            ? true
            : isTemplate === "false"
              ? false
              : undefined, // Convert only valid booleans
        startDate:
          startDate && !isNaN(Date.parse(startDate as string))
            ? new Date(startDate as string)
            : undefined,
        endDate:
          endDate && !isNaN(Date.parse(endDate as string))
            ? new Date(endDate as string)
            : undefined,
        page: Math.max(parseInt(page as string, 10) || 1, 1), // Ensure valid positive integer
        limit: parseInt(limit as string, 10) || 10, // Default to 10 if invalid
      };

      // Call the service to search and filter the inventorys
      const inventorys = await inventoryService.searchAndFilterInventorys(filters);

      // Return the results
      res.status(200).json({
        success: true,
        message: "Search and filter completed successfully",
        data: inventorys,
      });
    } catch (error) {
      console.error("Error in search and filter:", error);
      res.status(500).json({
        success: false,
        message: "Error in search and filter inventorys",
      });
    }
  },
  bulkUpdateInventoryTaxDiscount: async (req: Request, res: Response) => {
    try {
      const { inventoryIds, discountValue, vat } = req.body;

      if (!Array.isArray(inventoryIds) || inventoryIds.length === 0) {
        return res
          .status(400)
          .json({ message: "inventoryIds array is required" });
      }

      if (discountValue === undefined || vat === undefined) {
        return res
          .status(400)
          .json({ message: "Both discount and VAT/tax are required" });
      }

      // Validate each inventoryId format
      for (const inventoryId of inventoryIds) {
        if (!mongoose.Types.ObjectId.isValid(inventoryId)) {
          return res
            .status(400)
            .json({ message: `Invalid inventoryId: ${inventoryId}` });
        }
      }

      // Perform bulk update
      const result = await inventoryService.bulkUpdateInventoryTaxDiscount(
        inventoryIds,
        discountValue,
        vat
      );

      return res.status(200).json({
        message: "Inventory VAT/tax and discount updated successfully",
        result,
      });
    } catch (error: any) {
      res
        .status(500)
        .json({ message: "Internal Server Error", error: error.message });
    }
  },
  upsertInventoryParts: async (req: Request, res: Response) => {
    try {
      const inventory = await inventoryService.upsertInventoryPartsService(
        req.params.id,
        req.body.selectedVariations
      );
      if (!inventory)
        return res.status(404).json({ message: "Inventory not found" });

      res
        .status(200)
        .json({ message: "Inventory variations updated successfully", inventory });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  },
  // Get selected variations
  getSelectedInventoryParts: async (req: Request, res: Response) => {
    try {
      const inventory: any = await inventoryService.getSelectedInventoryPartsService(
        req.params.id
      );
      if (!inventory)
        return res.status(404).json({ message: "Inventory not found" });

      res.status(200).json({ selectedVariations: inventory.selectedVariations });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  },
};
