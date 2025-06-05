import { amazonListingService, ebayListingService, listingService } from "@/services";
import { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import mongoose from "mongoose";
import { transformListingData } from "@/utils/transformListingData.util";
import { Inventory, Listing } from "@/models";

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

      // if (!mongoose.isValidObjectId(stepData.inventoryId)) {
      //   return res.status(StatusCodes.BAD_REQUEST).json({
      //     success: false,
      //     message: "Invalid or missing 'inventoryId' in request payload",
      //   });
      // }

      // Ensure inventoryId exists in database
      // const inventoryExists = await Inventory.exists({ _id: stepData.inventoryId });
      // if (!inventoryExists) {
      //   return res.status(StatusCodes.BAD_REQUEST).json({
      //     success: false,
      //     message: "Inventory ID does not exist",
      //   });
      // }

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

      if (!mongoose.isValidObjectId(listingId)) {
        return res.status(StatusCodes.BAD_REQUEST).json({
          success: false,
          message: "Invalid listing ID",
        });
      }

      if (!stepData || typeof stepData !== "object") {
        return res.status(StatusCodes.BAD_REQUEST).json({
          success: false,
          message: "Invalid or missing 'stepData' in request payload",
        });
      }

      // Step 1: Update the local draft first
      const updatedListing = await listingService.updateDraftListing(listingId, stepData);

      let ebayResponse: any;
      let amazonResponse: any;
      if (updatedListing.status === "published" && updatedListing.publishToAmazon === true) {
        // Listing is marked as 'published' → Create new item on
        amazonResponse = await amazonListingService.addItemOnAmazon(updatedListing);
      }
      // Step 2: Check if the listing already exists on eBay (based on ebayItemId)
      if (updatedListing.ebayItemId) {
        // Listing already exists on eBay → Update it
        ebayResponse = await ebayListingService.reviseItemOnEbay(updatedListing);
      } else if (updatedListing.status === "published" && updatedListing.publishToEbay === true) {
        // Listing is marked as 'published' → Create new item on eBay
        ebayResponse = await ebayListingService.addItemOnEbay(updatedListing);
      }

      if (ebayResponse) {
        if (typeof ebayResponse === "string") {
          ebayResponse = JSON.parse(ebayResponse);
        }

        //  if (amazonResponse) {
        // if (typeof ebayResponse === "string") {
        //   ebayResponse = JSON.parse(ebayResponse);
        // }
        const ackValue =
          ebayResponse?.response?.ReviseItemResponse?.Ack || ebayResponse?.response?.AddFixedPriceItemResponse?.Ack;

        const isAckSuccess = ackValue === "Success";
        const isDirectSuccess = ebayResponse?.status === 200 && ebayResponse?.itemId;

        if (!isAckSuccess && !isDirectSuccess) {
          return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
            success: false,
            message: "Failed to sync with eBay",
            ebayResponse,
            ebayErrors:
              ebayResponse?.response?.AddFixedPriceItemResponse?.Errors ||
              ebayResponse?.response?.ReviseItemResponse?.Errors,
          });
        }

        // Step 3: If it's a new item creation, update ebayItemId and sandboxUrl
        if (ebayResponse && !updatedListing.ebayItemId && ebayResponse.itemId) {
          await listingService.updateDraftListing(updatedListing._id, {
            ebayItemId: ebayResponse.itemId,
            ebaySandboxUrl: ebayResponse.sandboxUrl,
            ebayResponse, // optional: store raw response
          });
        }
      }
      if (amazonResponse) {
        if (typeof amazonResponse === "string") {
          amazonResponse = JSON.parse(amazonResponse);
        }
      }

      if (ebayResponse) {
        return res.status(StatusCodes.OK).json({
          success: true,
          message: ebayResponse
            ? "Draft product updated and synced with eBay successfully"
            : "Draft product updated locally without syncing to eBay",
          data: {
            ...updatedListing.toObject(),
            ebayItemId: ebayResponse?.itemId ?? updatedListing.ebayItemId,
            ebaySandboxUrl: ebayResponse?.sandboxUrl ?? updatedListing.ebaySandboxUrl,
          },
          ebayResponse,
        });
      }
      if (amazonResponse) {
        return res.status(StatusCodes.OK).json({
          success: true,
          message: amazonResponse
            ? "Draft product updated and synced with amazon successfully"
            : "Draft product updated locally without syncing to amazon",
          // data: {
          //   ...updatedListing.toObject(),
          //   // ebayItemId: ebayResponse?.itemId ?? updatedListing.ebayItemId,
          //   // ebaySandboxUrl: ebayResponse?.sandboxUrl ?? updatedListing.ebaySandboxUrl,
          // },
          amazonResponse,
        });
      }
    } catch (error: any) {
      console.error("Error updating draft Listing:", error);

      if (error.message.includes("eBay")) {
        return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
          success: false,
          message: `Error syncing Listing with eBay: ${error.message}`,
        });
      }

      return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: error.message || "Error updating draft listing",
      });
    }
  },

  // Controller to check Amazon listing status by SKU
  checkAmazonListingStatus: async (req: Request, res: Response): Promise<void> => {
    try {
      const { sku } = req.params;
      const { sellerId } = req.query;

      // Validate required parameters
      if (!sku) {
        res.status(400).json({
          success: false,
          message: "SKU parameter is required",
        });
        return;
      }

      // Get stored Amazon access token
      const token = await getStoredAmazonAccessToken();
      if (!token) {
        res.status(401).json({
          success: false,
          message: "Missing or invalid Amazon access token",
        });
        return;
      }

      const sellerIdToUse = (sellerId as string) || "A21DY98JS1BBQC"; // Default to sandbox seller ID
      const marketplaceId = "ATVPDKIKX0DER"; // US marketplace
      const isProduction = process.env.AMAZON_ENV === "production";
      const baseUrl = isProduction
        ? "https://sellingpartnerapi-eu.amazon.com"
        : "https://sandbox.sellingpartnerapi-eu.amazon.com";

      console.log(`🔍 Checking listing status for SKU: ${sku}`);

      // Get listing details
      const response = await fetch(
        `${baseUrl}/listings/2021-08-01/items/${sellerIdToUse}/${sku}?marketplaceIds=${marketplaceId}&includedData=summaries,attributes,issues,offers,fulfillmentAvailability,procurement`,
        {
          method: "GET",
          headers: {
            "x-amz-access-token": token,
            "Content-Type": "application/json",
            ...(isProduction ? {} : { "x-amzn-api-sandbox-only": "true" }),
          },
        }
      );

      const result = await response.json();

      if (response.ok) {
        console.log(`✅ Successfully retrieved listing status for SKU: ${sku}`);
        res.status(200).json({
          success: true,
          message: "Listing status retrieved successfully",
          data: {
            sku: sku,
            sellerId: sellerIdToUse,
            marketplaceId: marketplaceId,
            listingData: result,
          },
        });
      } else {
        console.error(`❌ Failed to retrieve listing status for SKU: ${sku}`, result);
        res.status(response.status).json({
          success: false,
          message: "Failed to retrieve listing status",
          error: {
            status: response.status,
            statusText: response.statusText,
            details: result,
          },
        });
      }
    } catch (error: any) {
      console.error("Error in checkAmazonListingStatus:", error.message);
      res.status(500).json({
        success: false,
        message: "Internal server error while checking listing status",
        error: error.message,
      });
    }
  },

  // Controller to check Amazon submission status by submission ID
  checkAmazonSubmissionStatus: async (req: Request, res: Response): Promise<void> => {
    try {
      const { submissionId } = req.params;

      // Validate required parameters
      if (!submissionId) {
        res.status(400).json({
          success: false,
          message: "Submission ID parameter is required",
        });
        return;
      }

      // Get stored Amazon access token
      const token = await getStoredAmazonAccessToken();
      if (!token) {
        res.status(401).json({
          success: false,
          message: "Missing or invalid Amazon access token",
        });
        return;
      }

      const isProduction = process.env.AMAZON_ENV === "production";
      const baseUrl = isProduction
        ? "https://sellingpartnerapi-eu.amazon.com"
        : "https://sandbox.sellingpartnerapi-eu.amazon.com";

      console.log(`🔍 Checking submission status for ID: ${submissionId}`);

      // Check submission status
      const response = await fetch(`${baseUrl}/listings/2021-08-01/submissions/${submissionId}`, {
        method: "GET",
        headers: {
          "x-amz-access-token": token,
          "Content-Type": "application/json",
          ...(isProduction ? {} : { "x-amzn-api-sandbox-only": "true" }),
        },
      });

      const result = await response.json();

      if (response.ok) {
        console.log(`✅ Successfully retrieved submission status for ID: ${submissionId}`);
        res.status(200).json({
          success: true,
          message: "Submission status retrieved successfully",
          data: {
            submissionId: submissionId,
            submissionStatus: result,
          },
        });
      } else {
        console.error(`❌ Failed to retrieve submission status for ID: ${submissionId}`, result);
        res.status(response.status).json({
          success: false,
          message: "Failed to retrieve submission status",
          error: {
            status: response.status,
            statusText: response.statusText,
            details: result,
          },
        });
      }
    } catch (error: any) {
      console.error("Error in checkAmazonSubmissionStatus:", error.message);
      res.status(500).json({
        success: false,
        message: "Internal server error while checking submission status",
        error: error.message,
      });
    }
  },

  // Controller to get all listings for a seller
  getAmazonSellerListings: async (req: Request, res: Response): Promise<void> => {
    try {
      const { sellerId } = req.query;
      const { page = 1, limit = 20 } = req.query;

      // Get stored Amazon access token
      const token = await getStoredAmazonAccessToken();
      if (!token) {
        res.status(401).json({
          success: false,
          message: "Missing or invalid Amazon access token",
        });
        return;
      }

      const sellerIdToUse = (sellerId as string) || "A21DY98JS1BBQC"; // Default to sandbox seller ID
      const marketplaceId = "ATVPDKIKX0DER"; // US marketplace
      const isProduction = process.env.AMAZON_ENV === "production";
      const baseUrl = isProduction
        ? "https://sellingpartnerapi-eu.amazon.com"
        : "https://sandbox.sellingpartnerapi-eu.amazon.com";

      console.log(`🔍 Getting all listings for seller: ${sellerIdToUse}`);

      // Get all listings
      const response = await fetch(
        `${baseUrl}/listings/2021-08-01/items/${sellerIdToUse}?marketplaceIds=${marketplaceId}&includedData=summaries&pageSize=${limit}&pageToken=${page}`,
        {
          method: "GET",
          headers: {
            "x-amz-access-token": token,
            "Content-Type": "application/json",
            ...(isProduction ? {} : { "x-amzn-api-sandbox-only": "true" }),
          },
        }
      );

      const result = await response.json();

      if (response.ok) {
        console.log(`✅ Successfully retrieved listings for seller: ${sellerIdToUse}`);
        res.status(200).json({
          success: true,
          message: "Seller listings retrieved successfully",
          data: {
            sellerId: sellerIdToUse,
            marketplaceId: marketplaceId,
            pagination: {
              page: parseInt(page as string),
              limit: parseInt(limit as string),
            },
            listings: result,
          },
        });
      } else {
        console.error(`❌ Failed to retrieve listings for seller: ${sellerIdToUse}`, result);
        res.status(response.status).json({
          success: false,
          message: "Failed to retrieve seller listings",
          error: {
            status: response.status,
            statusText: response.statusText,
            details: result,
          },
        });
      }
    } catch (error: any) {
      console.error("Error in getAmazonSellerListings:", error.message);
      res.status(500).json({
        success: false,
        message: "Internal server error while getting seller listings",
        error: error.message,
      });
    }
  },

  // Controller to delete/deactivate a listing
  deleteAmazonListing: async (req: Request, res: Response): Promise<void> => {
    try {
      const { sku } = req.params;
      const { sellerId } = req.query;

      // Validate required parameters
      if (!sku) {
        res.status(400).json({
          success: false,
          message: "SKU parameter is required",
        });
        return;
      }

      // Get stored Amazon access token
      const token = await getStoredAmazonAccessToken();
      if (!token) {
        res.status(401).json({
          success: false,
          message: "Missing or invalid Amazon access token",
        });
        return;
      }

      const sellerIdToUse = (sellerId as string) || "A21DY98JS1BBQC"; // Default to sandbox seller ID
      const marketplaceId = "ATVPDKIKX0DER"; // US marketplace
      const isProduction = process.env.AMAZON_ENV === "production";
      const baseUrl = isProduction
        ? "https://sellingpartnerapi-eu.amazon.com"
        : "https://sandbox.sellingpartnerapi-eu.amazon.com";

      console.log(`🗑️ Deleting listing for SKU: ${sku}`);

      // Delete listing
      const response = await fetch(
        `${baseUrl}/listings/2021-08-01/items/${sellerIdToUse}/${sku}?marketplaceIds=${marketplaceId}`,
        {
          method: "DELETE",
          headers: {
            "x-amz-access-token": token,
            "Content-Type": "application/json",
            ...(isProduction ? {} : { "x-amzn-api-sandbox-only": "true" }),
          },
        }
      );

      const result = await response.json();

      if (response.ok) {
        console.log(`✅ Successfully deleted listing for SKU: ${sku}`);
        res.status(200).json({
          success: true,
          message: "Listing deleted successfully",
          data: {
            sku: sku,
            sellerId: sellerIdToUse,
            marketplaceId: marketplaceId,
            deletionResult: result,
          },
        });
      } else {
        console.error(`❌ Failed to delete listing for SKU: ${sku}`, result);
        res.status(response.status).json({
          success: false,
          message: "Failed to delete listing",
          error: {
            status: response.status,
            statusText: response.statusText,
            details: result,
          },
        });
      }
    } catch (error: any) {
      console.error("Error in deleteAmazonListing:", error.message);
      res.status(500).json({
        success: false,
        message: "Internal server error while deleting listing",
        error: error.message,
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

  getCategoryFeatures: async (req: Request, res: Response) => {
    try {
      const listings = await listingService.getCategoryFeatures();
      return res.status(StatusCodes.OK).json({
        success: true,
        getSellerList: listings,
      });
    } catch (error: any) {
      console.error("Error fetching Category Features", error);
      return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: error.message || "Error fetching Categoory Features",
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

  getCategorySubTree: async (req: Request, res: Response) => {
    try {
      const { id } = req.params;

      // Fetch listing from DB
      const categorySubTree = await listingService.getFullListingById(id);

      if (!categorySubTree) {
        return res.status(StatusCodes.NOT_FOUND).json({
          success: false,
          message: "categrySubTree not found",
        });
      }

      // Transform listing data using utility
      const getCategorySubTree = listingService.getCategorySubTree(id);

      // Send transformed Draft listing as response
      return res.status(StatusCodes.OK).json({
        success: true,
        message: "category sub tree Fetched successfully",
        data: getCategorySubTree,
      });
    } catch (error: any) {
      console.error("Error getting sub tree", error);
      return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: error.message || "Error getting sub tree",
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
        listingWithStock,
        isTemplate,
        publishToEbay,
        publishToAmazon,
        publishToWebsite,
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
        listingWithStock: listingWithStock === "true" ? true : listingWithStock === "false" ? false : undefined, // Convert only valid booleans
        publishToAmazon: publishToAmazon === "true" ? true : publishToAmazon === "false" ? false : undefined, // Convert only valid booleans
        publishToEbay: publishToEbay === "true" ? true : publishToEbay === "false" ? false : undefined, // Convert only valid booleans
        publishToWebsite: publishToWebsite === "true" ? true : publishToWebsite === "false" ? false : undefined, // Convert only valid booleans
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

  bulkUpdateListingTaxDiscount: async (req: Request, res: Response) => {
    try {
      const { listingIds, discountType, discountValue, vat, retailPrice } = req.body;

      // Validate listingIds
      if (!Array.isArray(listingIds) || listingIds.length === 0) {
        return res.status(400).json({ message: "listingIds array is required" });
      }

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
  // get all attribute combinations from ebay aspects  for creating variationsin listing which are without stock getting using listingId
  getAllAttributesById: async (req: Request, res: Response) => {
    try {
      const { id } = req.params;

      // Fetch listing and populate productInfo.productCategory
      const listingItem: any = await Listing.findById(id).populate("productInfo.productCategory").lean();

      if (!listingItem) {
        return res.status(404).json({ message: "Inventory item not found" });
      }

      // Try to get either ebayCategoryId or ebayCategoryId
      const productCategory = listingItem?.productInfo?.productCategory;
      const ebayCategoryId = productCategory?.ebayCategoryId || productCategory?.ebayCategoryId;

      if (!ebayCategoryId) {
        return res.status(400).json({ message: "No eBay category ID found in product category" });
      }

      // Get eBay aspects using the provided function
      const ebayAspects = await ebayListingService.fetchEbayCategoryAspects(ebayCategoryId);

      // Extract and filter aspects enabled for variations
      const variationAspects = (ebayAspects?.aspects || []).filter(
        (aspect: any) => aspect?.aspectConstraint?.aspectEnabledForVariations === true
      );

      // Format for response: name + full aspectValues array
      const formattedVariationAspects = variationAspects.map((aspect: any) => ({
        name: aspect.localizedAspectName,
        values: aspect.aspectValues || [],
      }));

      return res.status(200).json({
        message: "eBay aspects with enabled variations fetched successfully",
        attributes: formattedVariationAspects,
      });
    } catch (error) {
      console.error("❌ Error fetching data:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  },
};
