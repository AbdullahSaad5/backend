import { amazonListingService, ebayListingService, listingService } from "@/services";
import { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import mongoose from "mongoose";
import { transformListingData } from "@/utils/transformListingData.util";
import { Listing } from "@/models";
import { getAmazonCredentials } from "@/utils/amazon-helpers.util";
const { marketplaceId, sellerId } = getAmazonCredentials();
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

      // Step 2: Handle Amazon listing if published and enabled
      if (updatedListing.status === "published" && updatedListing.publishToAmazon === true) {
        console.log("Processing Amazon listing...");

        try {
          amazonResponse = await amazonListingService.addItemOnAmazon(updatedListing);

          // Handle successful Amazon response
          if (amazonResponse.status === 200) {
            const updateData: any = {};

            // For variation listings
            if (updatedListing.listingHasVariations) {
              // Parent was created successfully
              if (amazonResponse.parentCreated && !updatedListing.amazonSku) {
                updateData.amazonSku = updatedListing.productInfo.sku;
              }

              // Update submission info if available
              if (amazonResponse.submissionId) {
                updateData.amazonSubmissionId = amazonResponse.submissionId;
              }

              updateData.amazonResponse = amazonResponse;

              // Update the listing with Amazon info
              await listingService.updateDraftListing(updatedListing._id, updateData);

              return res.status(StatusCodes.OK).json({
                success: true,
                message: amazonResponse.message || "Amazon variation listing processed successfully",
                amazonResponse: {
                  status: amazonResponse.status,
                  message: amazonResponse.message,
                  summary: amazonResponse.summary,
                  parentCreated: amazonResponse.parentCreated,
                  isUpdateFlow: amazonResponse.isUpdateFlow,
                  totalVariations: amazonResponse.totalVariations,
                  successfulChildSkus: amazonResponse.successfulChildSkus?.length || 0,
                  failedChildSkus: amazonResponse.failedChildSkus?.length || 0,
                },
              });
            } else {
              // Simple listing
              if (amazonResponse.submissionId) {
                updateData.amazonSubmissionId = amazonResponse.submissionId;
                updateData.amazonSku = amazonResponse.sku;
                updateData.amazonResponse = amazonResponse.response;
              }

              await listingService.updateDraftListing(updatedListing._id, updateData);

              return res.status(StatusCodes.OK).json({
                success: true,
                message: "Amazon listing created successfully",
              });
            }
          }
          // Handle partial success (206)
          else if (amazonResponse.status === 206) {
            const updateData: any = {};

            if (amazonResponse.parentCreated && !updatedListing.amazonSku) {
              updateData.amazonSku = updatedListing.productInfo.sku;
            }

            if (amazonResponse.submissionId) {
              updateData.amazonSubmissionId = amazonResponse.submissionId;
            }

            updateData.amazonResponse = amazonResponse;
            await listingService.updateDraftListing(updatedListing._id, updateData);

            return res.status(StatusCodes.PARTIAL_CONTENT).json({
              success: true,
              message: amazonResponse.message || "Partial success with Amazon listing",
              amazonResponse: {
                status: amazonResponse.status,
                message: amazonResponse.message,
                summary: amazonResponse.summary,
                parentCreated: amazonResponse.parentCreated,
                isUpdateFlow: amazonResponse.isUpdateFlow,
                failedChildSkus: amazonResponse.failedChildSkus,
                totalVariations: amazonResponse.totalVariations,
              },
            });
          }
          // Handle errors
          else {
            return res.status(StatusCodes.BAD_REQUEST).json({
              success: false,
              message: amazonResponse.message || "Failed to sync with Amazon",
              amazonError: {
                status: amazonResponse.status,
                message: amazonResponse.message,
                error: amazonResponse.error,
                parentCreated: amazonResponse.parentCreated,
                isUpdateFlow: amazonResponse.isUpdateFlow || false,
                failedChildSkus: amazonResponse.failedChildSkus,
                results: amazonResponse.results,
              },
            });
          }
        } catch (amazonError: any) {
          console.error("Amazon API Error:", amazonError);
          return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
            success: false,
            message: "Amazon API error occurred",
            error: amazonError.message,
          });
        }
      }

      // Step 3: Handle eBay listing if needed
      if (updatedListing.ebayItemId) {
        // Update existing eBay listing
        ebayResponse = await ebayListingService.reviseItemOnEbay(updatedListing);
      } else if (updatedListing.status === "published" && updatedListing.publishToEbay === true) {
        // Create new eBay listing
        ebayResponse = await ebayListingService.addItemOnEbay(updatedListing);
      }

      // Handle eBay response
      if (ebayResponse) {
        if (typeof ebayResponse === "string") {
          ebayResponse = JSON.parse(ebayResponse);
        }

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

        // Update eBay item ID if it's a new listing
        if (ebayResponse && !updatedListing.ebayItemId && ebayResponse.itemId) {
          await listingService.updateDraftListing(updatedListing._id, {
            ebayItemId: ebayResponse.itemId,
            ebaySandboxUrl: ebayResponse.sandboxUrl,
            ebayResponse,
          });
        }
      }
      if (amazonResponse) {
        // Handle saving submissionId if response was successful
        if (amazonResponse.status === 200 && amazonResponse.submissionId) {
          await listingService.updateDraftListing(updatedListing._id, {
            amazonSubmissionId: amazonResponse.submissionId, // Save submissionId
            amazonSku: amazonResponse.sku, // Save SKU
            amazonResponse: amazonResponse.response, // Save full response
          });

          return res.status(StatusCodes.OK).json({
            success: true,
            message: amazonResponse
              ? "Draft product updated and synced with Amazon successfully"
              : "Draft product updated locally without syncing to Amazon",
            // amazonResponse,
          });
        } else {
          return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
            success: false,
            message: "Failed to sync with Amazon",
            // amazonResponse,
            amazonErrors: amazonResponse?.errorResponse || "Unknown error",
          });
        }
      }
      return res.status(StatusCodes.OK).json({
        success: true,
        message: "Draft product updated successfully",
        data: updatedListing,
      });
    } catch (error: any) {
      console.error("Error updating draft Listing:", error);

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
      // const { sellerId } = req.query;
      // Validate required parameters
      if (!sku) {
        res.status(400).json({
          success: false,
          message: "SKU parameter is required",
        });
        return;
      }

      // Call the checkListingStatus service function
      const listingStatus = await amazonListingService.checkListingStatus(sku);

      const listingStatusParsed = JSON.parse(listingStatus); // Parse the JSON string response

      if (listingStatusParsed.status === 200) {
        console.log(`✅ Successfully retrieved listing status for SKU: ${sku}`);
        res.status(200).json({
          success: true,
          message: "Listing status retrieved successfully",
          data: {
            sellerId: sellerId, // Use the provided sellerId or fallback to default
            marketplaceId: marketplaceId, // Default marketplaceId for UK
            listingData: listingStatusParsed.listingData,
          },
        });
      } else {
        console.error(`❌ Failed to retrieve listing status for SKU: ${sku}`, listingStatusParsed);
        res.status(listingStatusParsed.status).json({
          success: false,
          message: "Failed to retrieve listing status",
          error: {
            status: listingStatusParsed.status,
            statusText: listingStatusParsed.statusText,
            details: listingStatusParsed.errorResponse,
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

      // Call the getSubmissionStatus service function
      const submissionStatus = await amazonListingService.getSubmissionStatus(submissionId);

      const submissionStatusParsed = JSON.parse(submissionStatus); // Parse the JSON string response

      if (submissionStatusParsed.status === 200) {
        console.log(`✅ Successfully retrieved submission status for ID: ${submissionId}`);
        res.status(200).json({
          success: true,
          message: "Submission status retrieved successfully",
          data: {
            submissionId: submissionId,
            submissionStatus: submissionStatusParsed.submissionStatus,
          },
        });
      } else {
        console.error(`❌ Failed to retrieve submission status for ID: ${submissionId}`, submissionStatusParsed);
        res.status(submissionStatusParsed.status).json({
          success: false,
          message: "Failed to retrieve submission status",
          error: {
            status: submissionStatusParsed.status,
            statusText: submissionStatusParsed.statusText,
            details: submissionStatusParsed.errorResponse,
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
  getItemFromAmazon: async (req: Request, res: Response): Promise<void> => {
    try {
      const { listingId } = req.params; // Get listingId from the request parameters
      const { includedData } = req.query; // Optional query parameter for included data

      // Validate required parameters
      if (!listingId) {
        res.status(400).json({
          success: false,
          message: "Listing ID parameter is required",
        });
        return;
      }

      // Call the service to get item details from Amazon
      const itemDetails: any = await amazonListingService.getItemFromAmazon(listingId, includedData as string[]);

      // Check if itemDetails has a status field and return accordingly
      if (!itemDetails) {
        res.status(500).json({
          success: false,
          message: "Failed to retrieve item details from Amazon",
        });
        return;
      }

      // Send the response from the service
      const parsedItemDetails = JSON.parse(itemDetails); // Parse the JSON response if necessary
      res.status(parsedItemDetails.status || 500).json(parsedItemDetails);
    } catch (error: any) {
      console.error("Error in getItemFromAmazon route:", error.message);
      res.status(500).json({
        success: false,
        message: "Internal server error while retrieving item from Amazon",
        error: error.message,
      });
    }
  },
  getAllItemsFromAmazon: async (req: Request, res: Response): Promise<void> => {
    try {
      // const { listingId } = req.params; // Get listingId from the request parameters
      // const { includedData } = req.query; // Optional query parameter for included data

      // Call the service to get item details from Amazon
      const itemDetails: any = await amazonListingService.getAllItemsFromAmazon();

      // Check if itemDetails has a status field and return accordingly
      if (!itemDetails) {
        res.status(500).json({
          success: false,
          message: "Failed to retrieve all items details from Amazon",
        });
        return;
      }

      // Send the response from the service
      const parsedItemDetails = JSON.parse(itemDetails); // Parse the JSON response if necessary
      res.status(parsedItemDetails.status || 500).json(parsedItemDetails);
    } catch (error: any) {
      console.error("Error in getAllItemsFromAmazon route:", error.message);
      res.status(500).json({
        success: false,
        message: "Internal server error while retrieving item from Amazon",
        error: error.message,
      });
    }
  },
  // Controller to delete/deactivate a listing
  deleteAmazonListing: async (req: Request, res: Response): Promise<void> => {
    try {
      const { sku } = req.params;

      // Validate required parameters
      if (!sku) {
        res.status(400).json({
          success: false,
          message: "SKU parameter is required",
        });
        return;
      }

      // Call the deleteItemFromAmazon service function
      const deletionStatus = await amazonListingService.deleteItemFromAmazon(sku);

      const deletionStatusParsed = JSON.parse(deletionStatus); // Parse the JSON string response

      if (deletionStatusParsed.status === 200) {
        console.log(`✅ Successfully deleted listing for SKU: ${sku}`);
        res.status(200).json({
          success: true,
          message: "Listing deleted successfully",
          data: {
            sku: sku,
            deletionResult: deletionStatusParsed.response,
          },
        });
      } else {
        console.error(`❌ Failed to delete listing for SKU: ${sku}`, deletionStatusParsed);
        res.status(deletionStatusParsed.status).json({
          success: false,
          message: "Failed to delete listing",
          error: {
            status: deletionStatusParsed.status,
            statusText: deletionStatusParsed.statusText,
            details: deletionStatusParsed.errorResponse,
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
