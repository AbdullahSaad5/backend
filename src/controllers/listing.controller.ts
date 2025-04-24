import { ebayListingService, listingService } from "@/services";
import { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import mongoose from "mongoose";
import { transformListingData } from "@/utils/transformListingData.util";
import { Inventory } from "@/models";

export const listingController = {
  createDraftListing: async (req: Request, res: Response) => {
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

      if (!mongoose.isValidObjectId(stepData.inventoryId)) {
        return res.status(StatusCodes.BAD_REQUEST).json({
          success: false,
          message: "Invalid or missing 'inventoryId' in request payload",
        });
      }

      // Ensure inventoryId exists in database
      const inventoryExists = await Inventory.exists({ _id: stepData.inventoryId });
      if (!inventoryExists) {
        return res.status(StatusCodes.BAD_REQUEST).json({
          success: false,
          message: "Inventory ID does not exist",
        });
      }

      const draftListing = await listingService.createDraftListingService(stepData);

      return res.status(StatusCodes.CREATED).json({
        success: true,
        message: "Draft listing created successfully",
        data: { listingId: draftListing._id },
      });
    } catch (error: any) {
      console.error("Error creating draft listing:", error);
      return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: error.message || "Error creating draft listing",
      });
    }
  },

  updateDraftListingController: async (req: Request, res: Response) => {
    try {
      const listingId = req.params.id;
      const { stepData } = req.body;

      // console.log("Received request to update draft Listing:", { listingId, stepData });

      // Validate listing ID
      if (!mongoose.isValidObjectId(listingId)) {
        return res.status(StatusCodes.BAD_REQUEST).json({
          success: false,
          message: "Invalid listing ID",
        });
      }

      // Validate stepData
      if (!stepData || typeof stepData !== "object") {
        return res.status(StatusCodes.BAD_REQUEST).json({
          success: false,
          message: "Invalid or missing 'stepData' in request payload",
        });
      }

      // Update listing
      const updatedListing = await listingService.updateDraftListing(listingId, stepData);
      // if (stepData.publishToEbay) {
      // Sync product with eBay if it's marked for publishing
      const ebayResponse = await ebayListingService.syncListingWithEbay(updatedListing);

      // Update the product with the eBay Item ID
      await listingService.updateDraftListing(updatedListing._id, {
        ebayResponse,
      });

      // Return success with the updated product
      return res.status(StatusCodes.OK).json({
        success: true,
        message: "Draft product updated and synced with eBay successfully",
        data: updatedListing,
        ebayResponse, // Include eBay Item ID in the response
      });
      // }
      if (!updatedListing) {
        return res.status(StatusCodes.NOT_FOUND).json({
          success: false,
          message: "Listing not found or could not be updated",
        });
      }

      // If not marked for publishing, just return the updated product
      return res.status(StatusCodes.OK).json({
        success: true,
        message: "Draft Listing updated successfully",
        data: updatedListing,
      });
    } catch (error: any) {
      console.error("Error updating draft Listing:", error);

      // Check if the error is related to eBay synchronization
      if (error.message.includes("eBay")) {
        return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
          success: false,
          message: `Error syncing Listing with eBay: ${error.message}`,
        });
      }

      // Generic internal error
      return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: error.message || "Error updating draft listing",
      });
    }
  },

  getAllListing: async (req: Request, res: Response) => {
    try {
      const listings = await listingService.getAllListing();
      return res.status(StatusCodes.OK).json({
        success: true,
        listings,
      });
    } catch (error: any) {
      console.error("Error fetching listing:", error);
      return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: error.message || "Error fetching listing",
      });
    }
  },

  getSellerList: async (req: Request, res: Response) => {
    try {
      const listings = await listingService.getEbaySellerList();
      return res.status(StatusCodes.OK).json({
        success: true,
        getSellerList: listings,
      });
    } catch (error: any) {
      console.error("Error fetching listing:", error);
      return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: error.message || "Error fetching listing",
      });
    }
  },

  getListingById: async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const listing = await listingService.getListingById(id);

      if (!listing) {
        return res.status(StatusCodes.NOT_FOUND).json({
          success: false,
          message: "Listing not found",
        });
      }

      return res.status(StatusCodes.OK).json({
        success: true,
        listing,
      });
    } catch (error: any) {
      console.error("Error fetching listing by ID:", error);
      return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: error.message || "Error fetching listing",
      });
    }
  },

  transformAndSendListing: async (req: Request, res: Response) => {
    try {
      const { id } = req.params;

      // Validate listing ID
      if (!mongoose.isValidObjectId(id)) {
        return res.status(StatusCodes.BAD_REQUEST).json({
          success: false,
          message: "Invalid listing ID",
        });
      }

      // Fetch listing from DB
      const listing = await listingService.getFullListingById(id);

      if (!listing) {
        return res.status(StatusCodes.NOT_FOUND).json({
          success: false,
          message: "Listing not found",
        });
      }

      // Transform listing data using utility
      const transformedListing = transformListingData(listing);

      // Send transformed listing as response
      return res.status(StatusCodes.OK).json({
        success: true,
        message: "Listing transformed successfully",
        data: transformedListing,
      });
    } catch (error: any) {
      console.error("Error transforming listing:", error);
      return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: error.message || "Error transforming listing",
      });
    }
  },
  //Get All Template Listing Names
  getAllTemplateListingNames: async (req: Request, res: Response) => {
    try {
      const templates = await listingService.getListingByCondition({
        isTemplate: true,
      });

      if (!templates.length) {
        return res.status(StatusCodes.NOT_FOUND).json({
          success: false,
          message: "No templates found",
        });
      }

      // console.log("templates :: " , templates)

      const templateList = templates.map((template: any, index) => {
        const listingId = template._id;
        const templateAlias = template?.alias;

        // console.log("templateAlias : ", templateAlias);
        const kind = (template.kind || "UNKNOWN").toLowerCase();

        // ✅ Ensure correct access to prodTechInfo
        const prodInfo = (template as any).prodTechInfo || {};
        let fields: string[] = [];

        switch (kind) {
          case "listing_laptops":
            fields = [
              prodInfo.processor,
              prodInfo.model,
              prodInfo.ssdCapacity,
              prodInfo.hardDriveCapacity,
              prodInfo.manufacturerWarranty,
              prodInfo.operatingSystem,
            ];
            break;
          case "listing_all_in_one_pc":
            fields = [prodInfo.type, prodInfo.memory, prodInfo.processor, prodInfo.operatingSystem];
            break;
          case "listing_projectors":
            fields = [prodInfo.type, prodInfo.model];
            break;
          case "listing_monitors":
            fields = [prodInfo.screenSize, prodInfo.maxResolution];
            break;
          case "listing_gaming_pc":
            fields = [prodInfo.processor, prodInfo.gpu, prodInfo.operatingSystem];
            break;
          case "listing_network_equipments":
            fields = [prodInfo.networkType, prodInfo.processorType];
            break;
          default:
            fields = ["UNKNOWN"];
        }

        const fieldString = fields.filter(Boolean).join("-") || "UNKNOWN";
        const srno = (index + 1).toString().padStart(2, "0");
        const templateName = `Category:${kind} || Fields: ${fieldString} || Sr.no: ${srno}`.toUpperCase();

        return { templateName, listingId, templateAlias };
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
        data: { templateList, templates },
      });
    } catch (error: any) {
      console.error("Error fetching templates:", error);
      return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: error.message || "Error fetching templates",
      });
    }
  },

  //Get All Draft Listing Names
  getAllDraftListingNames: async (req: Request, res: Response) => {
    try {
      const drafts = await listingService.getListingByCondition({ status: "draft" });

      if (!drafts || drafts.length === 0) {
        return res.status(StatusCodes.NOT_FOUND).json({
          success: false,
          message: "No draft Listing found",
        });
      }

      const draftList = drafts.map((draft, index) => {
        const listingId = draft._id;
        const kind = draft?.kind || "UNKNOWN";
        // const prodInfo = draft?.prodTechInfo || {}; // Ensure we reference the correct object
        const prodInfo = (draft as any).prodTechInfo || {};

        let fields: string[] = [];

        switch (kind.toLowerCase()) {
          case "listing_laptops":
            fields = [
              prodInfo.processor,
              prodInfo.model,
              prodInfo.ssdCapacity,
              prodInfo.hardDriveCapacity,
              prodInfo.manufacturerWarranty,
              prodInfo.operatingSystem,
            ];
            break;
          case "listing_all_iPn_one_pc":
            fields = [prodInfo.type, prodInfo.memory, prodInfo.processor, prodInfo.operatingSystem];
            break;
          case "listing_projectors":
            fields = [prodInfo.type, prodInfo.model];
            break;
          case "listing_monitors":
            fields = [prodInfo.screenSize, prodInfo.maxResolution];
            break;
          case "listing_gaming_pc":
            fields = [prodInfo.processor, prodInfo.gpu, prodInfo.operatingSystem];
            break;
          case "listing_network_equipments":
            fields = [prodInfo.networkType, prodInfo.processorType];
            break;
          default:
            fields = ["UNKNOWN"];
            break;
        }

        const fieldString = fields.filter(Boolean).join("-") || "UNKNOWN";
        const srno = (index + 1).toString().padStart(2, "0");
        const draftName = `DRAFT-${kind}-${fieldString}-${srno}`.toUpperCase();

        return { draftName, listingId };
      });

      draftList.sort((a, b) => {
        const numA = parseInt(a.draftName.match(/(\d+)$/)?.[0] || "0", 10);
        const numB = parseInt(b.draftName.match(/(\d+)$/)?.[0] || "0", 10);
        return numB - numA;
      });

      return res.status(StatusCodes.OK).json({
        success: true,
        message: "Draft Listing names fetched successfully",
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

  //Selected transformed draft Listing
  transformAndSendDraftListing: async (req: Request, res: Response) => {
    try {
      const { id } = req.params;

      // Validate listing ID
      if (!mongoose.isValidObjectId(id)) {
        return res.status(StatusCodes.BAD_REQUEST).json({
          success: false,
          message: "Invalid draft ID",
        });
      }

      // Fetch listing from DB
      const listing = await listingService.getFullListingById(id);

      if (!listing) {
        return res.status(StatusCodes.NOT_FOUND).json({
          success: false,
          message: "Listing not found",
        });
      }

      // Transform listing data using utility
      const transformedListingDraft = transformListingData(listing);

      // Send transformed Draft listing as response
      return res.status(StatusCodes.OK).json({
        success: true,
        message: "draft transformed and Fetched successfully",
        data: transformedListingDraft,
      });
    } catch (error: any) {
      console.error("Error transforming listing Draft:", error);
      return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: error.message || "Error transforming listing Draft",
      });
    }
  },
  //Selected transformed Template Listing
  transformAndSendTemplateListing: async (req: Request, res: Response) => {
    try {
      const { id } = req.params;

      // Validate listing ID
      if (!mongoose.isValidObjectId(id)) {
        return res.status(StatusCodes.BAD_REQUEST).json({
          success: false,
          message: "Invalid template ID",
        });
      }

      // Fetch listing from DB
      const listing = await listingService.getFullListingById(id);

      if (!listing) {
        return res.status(StatusCodes.NOT_FOUND).json({
          success: false,
          message: "Listing not found",
        });
      }

      // Send transformed listing as response
      return res.status(StatusCodes.OK).json({
        success: true,
        message: "template transformed and Fetched successfully",
        data: listing,
      });
    } catch (error: any) {
      console.error("Error transforming listing Template:", error);
      return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: error.message || "Error transforming listing Template",
      });
    }
  },
  updateListingById: async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { platform, data } = req.body;

      if (!platform || !data) {
        return res.status(StatusCodes.BAD_REQUEST).json({
          success: false,
          message: "Platform and data are required to update the listing",
        });
      }

      const updatedListing = await listingService.updateListing(id, data);

      if (!updatedListing) {
        return res.status(StatusCodes.NOT_FOUND).json({
          success: false,
          message: "Listing not found",
        });
      }

      return res.status(StatusCodes.OK).json({
        success: true,
        message: "Listing updated successfully",
        data: updatedListing,
      });
    } catch (error: any) {
      console.error("Error updating listing:", error);
      return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: error.message || "Error updating listing",
      });
    }
  },
  //get all listings by inventoryId
  getListingsByInventoryId: async (req: Request, res: Response) => {
    try {
      const { inventoryId } = req.params;

      // Validate inventoryId format
      if (!mongoose.isValidObjectId(inventoryId)) {
        return res.status(StatusCodes.BAD_REQUEST).json({
          success: false,
          message: "Invalid inventoryId",
        });
      }

      // Fetch listings and count
      const { listings, total } = await listingService.getListingsByInventoryId(inventoryId);

      return res.status(StatusCodes.OK).json({
        success: true,
        message: total > 0 ? "Listings retrieved successfully" : "No listings found",
        totalListings: total,
        data: listings,
      });
    } catch (error: any) {
      console.error("Error fetching listings by inventoryId:", error);
      return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: error.message || "Error fetching listings",
      });
    }
  },

  deleteListing: async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const result = await listingService.deleteListing(id);
      res.status(StatusCodes.OK).json({
        success: true,
        message: "Listing deleted successfully",
        deletedListing: result,
      });
    } catch (error) {
      console.error("Delete Listing Error:", error);
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ success: false, message: "Error deleting listing" });
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

      const updatedListing = await listingService.toggleBlock(id, isBlocked);

      if (!updatedListing) {
        return res.status(StatusCodes.NOT_FOUND).json({
          success: false,
          message: "Listing not found",
        });
      }

      return res.status(StatusCodes.OK).json({
        success: true,
        message: `Listing ${isBlocked ? "blocked" : "unblocked"} successfully`,
        data: updatedListing,
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

      const updatedListing = await listingService.toggleIsTemplate(id, isTemplate);

      if (!updatedListing) {
        return res.status(StatusCodes.NOT_FOUND).json({
          success: false,
          message: "Listing not found",
        });
      }

      return res.status(StatusCodes.OK).json({
        success: true,
        message: `Listing ${isTemplate ? "is" : "is not"} template now`,
        data: updatedListing,
      });
    } catch (error: any) {
      console.error("Error toggling listing tempalate status:", error);
      return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: error.message || "Error toggling listing template status",
      });
    }
  },
  getListingStats: async (req: Request, res: Response) => {
    try {
      const stats = await listingService.getListingStats();
      return res.status(StatusCodes.OK).json(stats);
    } catch (error) {
      return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ message: "Error fetching listing statistics" });
    }
  },
  searchAndFilterListing: async (req: Request, res: Response) => {
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
        status: status && ["draft", "published"].includes(status.toString()) ? status.toString() : undefined, // Validate status
        isBlocked: isBlocked === "true" ? true : isBlocked === "false" ? false : undefined, // Convert only valid booleans
        isTemplate: isTemplate === "true" ? true : isTemplate === "false" ? false : undefined, // Convert only valid booleans
        startDate: startDate && !isNaN(Date.parse(startDate as string)) ? new Date(startDate as string) : undefined,
        endDate: endDate && !isNaN(Date.parse(endDate as string)) ? new Date(endDate as string) : undefined,
        page: Math.max(parseInt(page as string, 10) || 1, 1), // Ensure valid positive integer
        limit: parseInt(limit as string, 10) || 10, // Default to 10 if invalid
      };

      // Call the service to search and filter the listing
      const listing = await listingService.searchAndFilterListings(filters);

      // Return the results
      res.status(200).json({
        success: true,
        message: "Search and filter completed successfully",
        data: listing,
      });
    } catch (error) {
      console.error("Error in search and filter:", error);
      res.status(500).json({
        success: false,
        message: "Error in search and filter listing",
      });
    }
  },
  // Controller
  bulkUpdateListingTaxDiscount: async (req: Request, res: Response) => {
    try {
      const { listingIds, discountType, discountValue, vat, retailPrice } = req.body;

      // Validate listingIds
      if (!Array.isArray(listingIds) || listingIds.length === 0) {
        return res.status(400).json({ message: "listingIds array is required" });
      }

      // Validate discountType
      // if (!["fixed", "percentage"].includes(discountType)) {
      //   return res.status(400).json({ message: "Invalid discountType. Must be 'fixed' or 'percentage'." });
      // }

      // Validate discountValue and vat
      // if (typeof discountValue !== "number") {
      //   return res.status(400).json({ message: "discountValue must be numbers" });
      // }

      // Call the service to perform the bulk update
      const result = await listingService.bulkUpdateListingTaxDiscount(
        listingIds,
        discountType,
        discountValue,
        vat,
        retailPrice
      );

      // Return success response
      return res.status(200).json({
        message: "Listing VAT/tax and discount updated successfully",
        result,
      });
    } catch (error: any) {
      // Catch errors and return a 500 response with the error message
      return res.status(500).json({ message: "Internal Server Error", error: error.message });
    }
  },
  upsertListingParts: async (req: Request, res: Response) => {
    try {
      const listing = await listingService.upsertListingPartsService(req.params.id, req.body.selectedVariations);
      if (!listing) return res.status(404).json({ message: "Listing not found" });

      res.status(200).json({ message: "Listing variations updated successfully", listing });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  },
  // Get selected variations
  getSelectedListingParts: async (req: Request, res: Response) => {
    try {
      const listing: any = await listingService.getSelectedListingPartsService(req.params.id);
      if (!listing) return res.status(404).json({ message: "Listing not found" });

      res.status(200).json({ selectedVariations: listing.selectedVariations });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  },
};
