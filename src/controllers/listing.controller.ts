import { ebayService, listingService } from "@/services";
import { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import mongoose from "mongoose";
import { transformProductData } from "@/utils/transformProductData.util";

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

      // Save draft listing in MongoDB
      const draftListing = await listingService.createDraftListing(stepData);

      return res.status(StatusCodes.CREATED).json({
        success: true,
        message: "Draft listing created successfully",
        data: { ListingId: draftListing._id },
      });
    } catch (error: any) {
      console.error("Error creating draft listing:", error);
      return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: error.message || "Error creating draft listing",
      });
    }
  },

  updateDraftListing: async (req: Request, res: Response) => {
    try {
      const listingId = req.params.id;
      const { stepData } = req.body;

      // Validate listingId
      if (!mongoose.isValidObjectId(listingId)) {
        return res.status(StatusCodes.BAD_REQUEST).json({
          success: false,
          message: "Invalid or missing 'listingId'",
        });
      }

      // Validate stepData
      if (!stepData || typeof stepData !== "object") {
        return res.status(StatusCodes.BAD_REQUEST).json({
          success: false,
          message: "Invalid or missing 'stepData' in request payload",
        });
      }

      // Update the draft listing in MongoDB
      const updatedProduct = await listingService.updateDraftListing(listingId, stepData);

      // Check if the listing is marked for publishing
      if (stepData.publishToEbay) {
        // Sync listing with eBay if it's marked for publishing
        const ebayItemId = await ebayService.syncProductWithEbay(updatedProduct);

        // Update the listing with the eBay Item ID
        await listingService.updateDraftListing(updatedProduct._id, {
          ebayItemId,
        });

        // Return success with the updated listing
        return res.status(StatusCodes.OK).json({
          success: true,
          message: "Draft listing updated and synced with eBay successfully",
          data: updatedProduct,
          ebayItemId, // Include eBay Item ID in the response
        });
      }

      // If not marked for publishing, just return the updated listing
      return res.status(StatusCodes.OK).json({
        success: true,
        message: "Draft listing updated successfully",
        data: updatedProduct,
      });
    } catch (error: any) {
      console.error("Error updating draft listing:", error);

      // Check if the error is related to eBay synchronization
      if (error.message.includes("eBay")) {
        return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
          success: false,
          message: `Error syncing listing with eBay: ${error.message}`,
        });
      }

      // Generic internal error
      return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: error.message || "Error updating draft listing",
      });
    }
  },

  getAllProduct: async (req: Request, res: Response) => {
    try {
      const products = await listingService.getAllProducts();
      return res.status(StatusCodes.OK).json({
        success: true,
        products,
      });
    } catch (error: any) {
      console.error("Error fetching products:", error);
      return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: error.message || "Error fetching products",
      });
    }
  },

  getProductById: async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const listing = await listingService.getProductById(id);

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

  transformAndSendProduct: async (req: Request, res: Response) => {
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
      const transformedProduct = transformProductData(listing);

      // Send transformed listing as response
      return res.status(StatusCodes.OK).json({
        success: true,
        message: "Listing transformed successfully",
        data: transformedProduct,
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
  getAllTemplateProducts: async (req: Request, res: Response) => {
    try {
      const templates = await listingService.getProductsByCondition({
        isTemplate: true,
      });

      if (!templates.length) {
        return res.status(StatusCodes.NOT_FOUND).json({
          success: false,
          message: "No templates found",
        });
      }

      let templateList = templates.map((template, index) => {
        const listingId = template._id;
        const kind = template.kind || "UNKNOWN";

        let fields: string[] = [];
        const prodInfo: any = template.platformDetails.website?.prodTechInfo || {};

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
            break;
        }

        const fieldString = fields.filter(Boolean).join("-") || "UNKNOWN";

        const srno = (index + 1).toString().padStart(2, "0");

        const templateName = `${kind}-${fieldString}-${srno}`.toUpperCase();

        return { templateName, listingId };
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

  //Get All Draft Listing Names
  getAllDraftProductNames: async (req: Request, res: Response) => {
    try {
      const drafts = await listingService.getProductsByCondition({
        status: "draft",
      });

      if (!drafts.length) {
        return res.status(StatusCodes.NOT_FOUND).json({
          success: false,
          message: "No draft products found",
        });
      }

      let draftList = drafts.map((draft, index) => {
        const listingId = draft._id;
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
            break;
        }

        const fieldString = fields.filter(Boolean).join("-") || "UNKNOWN";

        const srno = (index + 1).toString().padStart(2, "0");

        const draftName = `DRAFT-${kind}-${fieldString}-${srno}`.toUpperCase();

        return { draftName, listingId };
      });

      // 🔹 Sort by the number at the end of draftName in descending order
      draftList.sort((a, b) => {
        const numA = parseInt(a.draftName.match(/(\d+)$/)?.[0] || "0", 10);
        const numB = parseInt(b.draftName.match(/(\d+)$/)?.[0] || "0", 10);
        return numB - numA; // Descending order
      });

      return res.status(StatusCodes.OK).json({
        success: true,
        message: "Draft products names fetched successfully",
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
  transformAndSendDraftProduct: async (req: Request, res: Response) => {
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
      const transformedProductDraft = transformProductData(listing);

      // Send transformed Draft listing as response
      return res.status(StatusCodes.OK).json({
        success: true,
        message: "draft transformed and Fetched successfully",
        data: transformedProductDraft,
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
  transformAndSendTemplateProduct: async (req: Request, res: Response) => {
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

      // Transform listing data using utility
      const transformedProductTemplate = transformProductData(listing);

      // Send transformed listing as response
      return res.status(StatusCodes.OK).json({
        success: true,
        message: "template transformed and Fetched successfully",
        data: transformedProductTemplate,
      });
    } catch (error: any) {
      console.error("Error transforming listing Template:", error);
      return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: error.message || "Error transforming listing Template",
      });
    }
  },
  updateProductById: async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { platform, data } = req.body;

      if (!platform || !data) {
        return res.status(StatusCodes.BAD_REQUEST).json({
          success: false,
          message: "Platform and data are required to update the listing",
        });
      }

      const updatedProduct = await listingService.updateProduct(id, platform, data);

      if (!updatedProduct) {
        return res.status(StatusCodes.NOT_FOUND).json({
          success: false,
          message: "Listing not found",
        });
      }

      return res.status(StatusCodes.OK).json({
        success: true,
        message: "Listing updated successfully",
        data: updatedProduct,
      });
    } catch (error: any) {
      console.error("Error updating listing:", error);
      return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: error.message || "Error updating listing",
      });
    }
  },

  deleteProduct: async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const result = await listingService.deleteProduct(id);
      res.status(StatusCodes.OK).json({
        success: true,
        message: "Listing deleted successfully",
        deletedProduct: result,
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

      const updatedProduct = await listingService.toggleBlock(id, isBlocked);

      if (!updatedProduct) {
        return res.status(StatusCodes.NOT_FOUND).json({
          success: false,
          message: "Listing not found",
        });
      }

      return res.status(StatusCodes.OK).json({
        success: true,
        message: `Listing ${isBlocked ? "blocked" : "unblocked"} successfully`,
        data: updatedProduct,
      });
    } catch (error: any) {
      console.error("Error toggling block status:", error);
      return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: error.message || "Error toggling block status",
      });
    }
  },
  getProductStats: async (req: Request, res: Response) => {
    try {
      const stats = await listingService.getProductStats();
      return res.status(StatusCodes.OK).json(stats);
    } catch (error) {
      return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ message: "Error fetching products statistics" });
    }
  },
  searchAndFilterProducts: async (req: Request, res: Response) => {
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

      // Call the service to search and filter the products
      const products = await listingService.searchAndFilterProducts(filters);

      // Return the results
      res.status(200).json({
        success: true,
        message: "Search and filter completed successfully",
        data: products,
      });
    } catch (error) {
      console.error("Error in search and filter:", error);
      res.status(500).json({
        success: false,
        message: "Error in search and filter products",
      });
    }
  },
  bulkUpdateProductTaxDiscount: async (req: Request, res: Response) => {
    try {
      const { listingIds, discountValue, vat } = req.body;

      if (!Array.isArray(listingIds) || listingIds.length === 0) {
        return res.status(400).json({ message: "listingIds array is required" });
      }

      if (discountValue === undefined || vat === undefined) {
        return res.status(400).json({ message: "Both discount and VAT/tax are required" });
      }

      // Validate each listingId format
      for (const listingId of listingIds) {
        if (!mongoose.Types.ObjectId.isValid(listingId)) {
          return res.status(400).json({ message: `Invalid listingId: ${listingId}` });
        }
      }

      // Perform bulk update
      const result = await listingService.bulkUpdateProductTaxDiscount(listingIds, discountValue, vat);

      return res.status(200).json({
        message: "Listing VAT/tax and discount updated successfully",
        result,
      });
    } catch (error: any) {
      res.status(500).json({ message: "Internal Server Error", error: error.message });
    }
  },
  upsertProductParts: async (req: Request, res: Response) => {
    try {
      const listing = await listingService.upsertProductPartsService(req.params.id, req.body.selectedVariations);
      if (!listing) return res.status(404).json({ message: "Listing not found" });

      res.status(200).json({ message: "Listing variations updated successfully", listing });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  },
  // Get selected variations
  getSelectedProductParts: async (req: Request, res: Response) => {
    try {
      const listing: any = await listingService.getSelectedProductPartsService(req.params.id);
      if (!listing) return res.status(404).json({ message: "Listing not found" });

      res.status(200).json({ selectedVariations: listing.selectedVariations });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  },
};
