import { StatusCodes, ReasonPhrases } from "http-status-codes";
import { Request, Response } from "express";
import { gtinService } from "./gtin.service";
import {
  getStoredAmazonAccessToken,
  refreshAmazonAccessToken,
  initializeAmazonCredentials,
  getAmazonCredentials,
} from "@/utils/amazon-helpers.util";
import path from "path";
import { promises as fs } from "fs";
import { Listing } from "@/models";

import { AmazonSchemaParser } from "@/utils/amazonSchemaParser.util";

const type = process.env.AMAZON_ENV === "production" ? "PRODUCTION" : "SANDBOX";
const { marketplaceId, sellerId, redirectUri } = getAmazonCredentials();
export const amazonListingService = {
  getApplicationAuthToken: async (req: Request, res: Response) => {
    try {
      const token = await getStoredAmazonAccessToken();
      return res.status(StatusCodes.OK).json({ status: StatusCodes.OK, message: ReasonPhrases.OK, token });
    } catch (error) {
      console.error("Error getting Amazon token:", error);
      return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        status: StatusCodes.INTERNAL_SERVER_ERROR,
        message: ReasonPhrases.INTERNAL_SERVER_ERROR,
        error: "Failed to get application token",
        details: error,
      });
    }
  },

  getAmazonSchema: async (req: Request, res: Response) => {
    try {
      const productType = req.params.productType;
      if (!productType) {
        return res.status(400).json({ error: "Missing productType parameter" });
      }

      const spApiUrl = `https://sellingpartnerapi-eu.amazon.com/definitions/2020-09-01/productTypes/${productType}?marketplaceIds=ATVPDKIKX0DER`;

      const accessToken = await getStoredAmazonAccessToken();

      // Fetch SP API product type schema metadata
      const spApiResponse = await fetch(spApiUrl, {
        method: "GET",
        headers: {
          "x-amz-access-token": accessToken ?? "",
          "Content-Type": "application/json",
        },
      });

      if (!spApiResponse.ok) {
        return res.status(spApiResponse.status).json({ error: "Failed to fetch product type schema" });
      }

      const spApiData = await spApiResponse.json();

      const schemaUrl = spApiData.schema?.link?.resource;
      if (!schemaUrl) {
        return res.status(400).json({ error: "Schema link resource not found" });
      }

      // Fetch actual schema JSON from schemaUrl (usually public S3 URL with token)
      const schemaResponse = await fetch(schemaUrl);
      if (!schemaResponse.ok) {
        return res.status(schemaResponse.status).json({ error: "Failed to fetch actual schema" });
      }

      const actualSchema = await schemaResponse.json();

      // Parse schema properties with your utility function
      // const properties = actualSchema.properties || {};
      // const requiredFields = actualSchema.required || [];

      // const parsedFields = parseSchemaProperties(properties, requiredFields);

      const parser = new AmazonSchemaParser(actualSchema);
      const transformedSchema = parser.parse();

      // Return parsed fields
      // return res.json({ parsedFields });
      return res.json({ transformedSchema });
    } catch (error: any) {
      return res.status(500).json({ error: "Internal server error", details: error.message });
    }
  },
  getAmazonSchemaDummy: async (req: Request, res: Response) => {
    try {
      const productType = req.params.productType;
      if (!productType) {
        return res.status(400).json({ error: "Missing productType parameter" });
      }

      // Read schema JSON from local test.json file instead of API calls
      // const filePath = path.join(__dirname, "test.json");
      // const filePath = path.join(__dirname, "test.json");
      const filePath = path.join(__dirname, "test.json");
      const jsonData = await fs.readFile(filePath, "utf-8");
      const actualSchema = JSON.parse(jsonData);
      // console.log("actual Schema", actualSchema);
      // Pass the local JSON schema to your parser
      const parser = new AmazonSchemaParser(actualSchema);
      const transformedSchema = parser.parse();

      return res.json({ transformedSchema });
    } catch (error: any) {
      return res.status(500).json({ error: "Internal server error", details: error.message });
    }
  },
  getAmazonSchemaOriginal: async (req: Request, res: Response) => {
    try {
      const productType = req.params.productType;
      if (!productType) {
        return res.status(400).json({ error: "Missing productType parameter" });
      }

      // Read schema JSON from local test.json file instead of API calls
      const filePath = path.join(__dirname, "test.json");
      const jsonData = await fs.readFile(filePath, "utf-8");
      const actualSchema = JSON.parse(jsonData);

      return res.json({ actualSchema });
    } catch (error: any) {
      return res.status(500).json({ error: "Internal server error", details: error.message });
    }
  },
  handleAuthorizationCallback: async (req: Request, res: Response) => {
    try {
      const { code } = req.query;
      const accessToken = await initializeAmazonCredentials(code as string, type);
      return res.status(StatusCodes.OK).json({ status: StatusCodes.OK, message: ReasonPhrases.OK, accessToken });
    } catch (error) {
      console.error("Error in authorization callback:", error);
      return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        status: StatusCodes.INTERNAL_SERVER_ERROR,
        message: ReasonPhrases.INTERNAL_SERVER_ERROR,
        error: "Failed to exchange code for access token",
        details: error,
      });
    }
  },

  handleRefreshToken: async (req: Request, res: Response) => {
    try {
      const credentials = await refreshAmazonAccessToken(type);
      return res.status(StatusCodes.OK).json({ status: StatusCodes.OK, message: ReasonPhrases.OK, credentials });
    } catch (error) {
      console.error("Error refreshing token:", error);
      return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        status: StatusCodes.INTERNAL_SERVER_ERROR,
        message: ReasonPhrases.INTERNAL_SERVER_ERROR,
        error: "Failed to refresh Amazon access token",
        details: error,
      });
    }
  },
  // Function to check the status of your submitted listing
  checkListingStatus: async (sku: string): Promise<string> => {
    try {
      const token = await getStoredAmazonAccessToken();
      if (!token) {
        throw new Error("Missing or invalid Amazon access token");
      }

      // Get listing details
      const response = await fetch(
        `${redirectUri}/listings/2021-08-01/items/${sellerId}/${sku}?marketplaceIds=${marketplaceId}&includedData=summaries,attributes,issues,offers,fulfillmentAvailability,procurement`,
        {
          method: "GET",
          headers: {
            "x-amz-access-token": token,
            "Content-Type": "application/json",
            "x-amzn-api-sandbox-only": type === "SANDBOX" ? "true" : "false",
          },
        }
      );

      const result = await response.json();

      if (response.ok) {
        return JSON.stringify(
          {
            status: 200,
            statusText: "OK",
            listingData: result,
          },
          null,
          2
        );
      } else {
        return JSON.stringify(
          {
            status: response.status,
            statusText: response.statusText,
            errorResponse: result,
          },
          null,
          2
        );
      }
    } catch (error: any) {
      console.error("Error checking listing status:", error.message);
      return JSON.stringify({
        status: 500,
        message: error.message || "Error checking listing status",
      });
    }
  },

  // Function to get submission status
  getSubmissionStatus: async (submissionId: string): Promise<string> => {
    try {
      const token = await getStoredAmazonAccessToken();
      if (!token) {
        throw new Error("Missing or invalid Amazon access token");
      }

      // Check submission status
      const response = await fetch(`${redirectUri}/listings/2021-08-01/submissions/${submissionId}`, {
        method: "GET",
        headers: {
          "x-amz-access-token": token,
          "Content-Type": "application/json",
          "x-amzn-api-sandbox-only": type === "SANDBOX" ? "true" : "false",
        },
      });

      const result = await response.json();

      if (response.ok) {
        return JSON.stringify(
          {
            status: 200,
            statusText: "OK",
            submissionStatus: result,
          },
          null,
          2
        );
      } else {
        return JSON.stringify(
          {
            status: response.status,
            statusText: response.statusText,
            errorResponse: result,
          },
          null,
          2
        );
      }
    } catch (error: any) {
      console.error("Error checking submission status:", error.message);
      return JSON.stringify({
        status: 500,
        message: error.message || "Error checking submission status",
      });
    }
  },
  // DELETE Listing Item Function
  deleteItemFromAmazon: async (sku: string): Promise<string> => {
    try {
      const token = await getStoredAmazonAccessToken();
      if (!token) {
        throw new Error("Missing or invalid Amazon access token");
      }

      if (!sellerId || !sku) {
        throw new Error("Missing required sellerId or SKU");
      }

      // URL encode the SKU to handle special characters
      const encodedSku = encodeURIComponent(sku);

      // Build query parameters
      const queryParams = new URLSearchParams({
        marketplaceIds: marketplaceId,
      });

      // Add optional issueLocale if available
      if (process.env.AMAZON_ISSUE_LOCALE) {
        queryParams.append("issueLocale", process.env.AMAZON_ISSUE_LOCALE);
      }

      // Make DELETE API call
      const apiUrl = `${redirectUri}/listings/2021-08-01/items/${sellerId}/${encodedSku}?${queryParams.toString()}`;

      const response = await fetch(apiUrl, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
          "x-amz-access-token": token,
          Accept: "application/json",
        },
      });

      const result = response.status === 204 ? { message: "Successfully deleted" } : await response.json();

      if (response.ok) {
        return JSON.stringify({
          status: response.status,
          statusText: "Successfully deleted listing",
          sellerId: sellerId,
          sku: sku,
          response: result,
        });
      } else {
        return JSON.stringify({
          status: response.status,
          statusText: "Failed to delete listing",
          errorResponse: result,
        });
      }
    } catch (error: any) {
      console.error("Error deleting listing from Amazon:", error.message);
      return JSON.stringify({
        status: 500,
        message: error.message || "Error deleting Amazon listing",
      });
    }
  },

  // GET Listing Item Function
  getItemFromAmazon: async (listingId: any, includedData?: string[]): Promise<string> => {
    try {
      const token = await getStoredAmazonAccessToken();
      if (!token) {
        throw new Error("Missing or invalid Amazon access token");
      }

      const populatedListing: any = await Listing.findById(listingId);
      if (!populatedListing) {
        throw new Error("Listing not found");
      }

      const sku = populatedListing.amazonSku;

      if (!sellerId || !sku) {
        throw new Error("Missing required sellerId or SKU");
      }

      // URL encode the SKU to handle special characters
      const encodedSku = encodeURIComponent(sku);

      // Build query parameters
      const queryParams = new URLSearchParams({
        marketplaceIds: marketplaceId,
      });

      // Add includedData parameter (defaults to "summaries" as per API docs)
      const dataToInclude = includedData && includedData.length > 0 ? includedData.join(",") : "summaries";
      queryParams.append("includedData", dataToInclude);

      // Add optional issueLocale if available
      if (process.env.AMAZON_ISSUE_LOCALE) {
        queryParams.append("issueLocale", process.env.AMAZON_ISSUE_LOCALE);
      }

      // Make GET API call
      const apiUrl = `${redirectUri}/listings/2021-08-01/items/${sellerId}/${encodedSku}?${queryParams.toString()}`;
      // console.log("API URL:", apiUrl);

      const response = await fetch(apiUrl, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
          "x-amz-access-token": token,
          Accept: "application/json",
        },
      });

      // Log the response status and body for debugging
      const responseBody = await response.text(); // Use text() to avoid body already consumed error
      // console.log("Response Status:", response.status);
      // console.log("Response Body:", responseBody);

      // Try parsing JSON from the response body
      let result;
      try {
        result = JSON.parse(responseBody);
      } catch (err) {
        console.error("Error parsing JSON from Amazon API response", err);
        result = { error: "Failed to parse Amazon API response" };
      }

      if (response.ok) {
        return JSON.stringify({
          status: response.status,
          statusText: "Successfully retrieved listing",
          sellerId: sellerId,
          sku: sku,
          response: result,
        });
      } else {
        return JSON.stringify({
          status: response.status,
          statusText: "Failed to retrieve listing",
          errorResponse: result,
        });
      }
    } catch (error: any) {
      console.error("Error retrieving listing from Amazon:", error.message);
      return JSON.stringify({
        status: 500,
        message: error.message || "Error retrieving Amazon listing",
      });
    }
  },
  getAllItemsFromAmazon: async (): Promise<string> => {
    try {
      const token = await getStoredAmazonAccessToken();
      if (!token) {
        throw new Error("Missing or invalid Amazon access token");
      }

      if (!sellerId) {
        throw new Error("Missing required sellerId");
      }

      // URL for retrieving all listings (can use pagination if necessary)
      const apiUrl = `${redirectUri}/listings/2021-08-01/items/${sellerId}?marketplaceIds=${marketplaceId}&limit=100`; // Limit can be changed as required

      // Make GET API call
      const response = await fetch(apiUrl, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
          "x-amz-access-token": token,
          Accept: "application/json",
        },
      });

      // Log the response status and body for debugging
      const responseBody = await response.text(); // Use text() to avoid body already consumed error

      // Try parsing JSON from the response body
      let result;
      try {
        result = JSON.parse(responseBody);
      } catch (err) {
        console.error("Error parsing JSON from Amazon API response", err);
        result = { error: "Failed to parse Amazon API response" };
      }

      if (response.ok) {
        // Successfully retrieved listings, now return the data
        return JSON.stringify({
          status: response.status,
          statusText: "Successfully retrieved all listings",
          sellerId: sellerId,
          response: result, // This will contain all the listings data
        });
      } else {
        // If response is not okay, return the error response
        return JSON.stringify({
          status: response.status,
          statusText: "Failed to retrieve listings",
          errorResponse: result,
        });
      }
    } catch (error: any) {
      console.error("Error retrieving all listings from Amazon:", error.message);
      return JSON.stringify({
        status: 500,
        message: error.message || "Error retrieving Amazon listings",
      });
    }
  },

  // Helper function to get listing with specific data sets
  getDetailedItemFromAmazon: async (listing: any): Promise<string> => {
    // Get comprehensive data including attributes, issues, offers, and fulfillment availability
    const includedData = ["summaries", "attributes", "issues", "offers", "fulfillmentAvailability", "relationships"];

    // return getItemFromAmazon(listing, includedData);
    return amazonListingService.getItemFromAmazon(listing, includedData);
  },

  // Helper function to get only basic listing summary
  getBasicItemFromAmazon: async (listing: any): Promise<string> => {
    // Get only basic summary data (default)
    return amazonListingService.getItemFromAmazon(listing, ["summaries"]);
  },

  // Helper function to check listing issues
  checkListingIssues: async (listing: any): Promise<string> => {
    // Get only issues data to check for problems
    return amazonListingService.getItemFromAmazon(listing, ["issues"]);
  },

  // Enhanced function to handle both simple and variation listings
  addItemOnAmazon: async (listing: any): Promise<any> => {
    try {
      const token = await getStoredAmazonAccessToken();
      if (!token) {
        throw new Error("Missing or invalid Amazon access token");
      }

      const populatedListing: any = await Listing.findById(listing._id)
        .populate("prodPricing.selectedVariations.variationId")
        .populate("productInfo.productCategory")
        .lean();

      if (!populatedListing) {
        throw new Error("Listing not found or failed to populate");
      }

      // Check if listing has variations
      const hasVariations = populatedListing.listingHasVariations;

      if (hasVariations) {
        return await amazonListingService.createVariationListing(populatedListing, token);
      } else {
        return await amazonListingService.createSimpleListing(populatedListing, token);
      }
    } catch (error: any) {
      console.error("Error adding listing on Amazon:", error.message);
      return {
        status: 500,
        message: error.message || "Error syncing with Amazon API",
      };
    }
  },

  // Function to create simple listing (your existing logic)
  createSimpleListing: async (populatedListing: any, token: string): Promise<any> => {
    console.log("in simple listing");

    const {
      productInfo: { sku, item_name, brand, product_description, condition_type },
      // prodTechInfo: { condition_type },
      prodDelivery: { item_display_weight, item_package_weight, item_package_dimensions, epr_product_packaging },
    } = populatedListing;

    let selectedGtin = null;

    const existingListingId = populatedListing.amazonSku; // Check if listing already exists
    if (!existingListingId) {
      // If there's no existing listing, fetch and assign a new GTIN
      const gtinDoc = await gtinService.getAndReserveGtin(sku);
      selectedGtin = gtinDoc.gtin;
      console.log(`Assigned GTIN ${selectedGtin} to listing ${sku}`);
    } else {
      // If listing already exists, don't fetch a new GTIN
      console.log(`Listing ${sku} already has a GTIN, skipping GTIN assignment.`);
    }

    const otherProdTechInfo = { ...populatedListing.prodTechInfo };
    delete otherProdTechInfo.condition_type;

    const categoryId =
      populatedListing.productInfo.productCategory.amazonCategoryId ||
      populatedListing.productInfo.productCategory.categoryId ||
      "NOTEBOOK_COMPUTER";

    const productData = {
      productType: categoryId,
      requirements: "LISTING",
      attributes: {
        condition_type: condition_type || [{ value: "new_new" }],
        item_name: item_name || [],
        brand: brand || [],
        ...(selectedGtin && {
          externally_assigned_product_identifier: [
            {
              type: "ean",
              value: selectedGtin, // Assign the selected GTIN only if it's new
              marketplace_id: "A1F83G8C2ARO7P",
            },
          ],
        }),
        ...amazonListingService.prepareImageLocators(populatedListing),
        product_description: product_description || [],
        item_display_weight: item_display_weight || [],
        item_package_weight: item_package_weight || [],
        item_package_dimensions: item_package_dimensions || [],
        epr_product_packaging: epr_product_packaging || [],
        ...otherProdTechInfo,
      },
    };

    return await amazonListingService.sendToAmazon(sku, productData, token);
  },
  // Enhanced variation management with comprehensive error handling and tracking

  createVariationListing: async (populatedListing: any, token: string): Promise<any> => {
    const results = [];
    const successfulChildSkus = [];
    const failedChildSkus = [];
    let parentCreated = false;
    let isUpdateFlow = false;

    try {
      const parentSku = populatedListing.productInfo.sku;
      const currentAmazonSkus = populatedListing.prodPricing?.currentAmazonVariationsSKU || [];

      // Check if this is an update flow (parent already exists)
      if (populatedListing.amazonSku) {
        isUpdateFlow = true;
        parentCreated = true;
        console.log("Update flow detected - Updating parent listing with SKU:", populatedListing.amazonSku);
      } else {
        console.log("New variation flow - Creating parent listing");
      }

      // Step 1: Create or update parent listing
      const parentResult = isUpdateFlow
        ? await amazonListingService.createParentListing(populatedListing, token)
        : await amazonListingService.createParentListing(populatedListing, token);
      results.push(parentResult);
      console.log(`${isUpdateFlow ? "Parent listing update" : "Parent listing creation"} result:`, parentResult);

      if (parentResult.status !== 200) {
        return {
          status: parentResult.status || 400,
          message: parentResult.message || `Failed to ${isUpdateFlow ? "update" : "create"} parent listing`,
          error: parentResult.error || `Parent listing ${isUpdateFlow ? "update" : "creation"} failed`,
          results: results,
          parentCreated: false,
          successfulChildSkus: [],
          failedChildSkus: [],
          totalVariations: populatedListing.prodPricing.selectedVariations.length,
          isUpdateFlow: isUpdateFlow,
        };
      }

      parentCreated = true;

      // Update listing with amazonSku after successful parent creation (for new flow only)
      if (!isUpdateFlow) {
        await amazonListingService.updateListingWithAmazonSku(populatedListing._id, parentSku);
      }

      // Step 2: Process child variations
      console.log("Processing child variations...");

      if (
        !populatedListing.prodPricing?.selectedVariations ||
        populatedListing.prodPricing.selectedVariations.length === 0
      ) {
        return {
          status: 400,
          message: "No variations found to process",
          results: results,
          parentCreated: parentCreated,
          successfulChildSkus: [],
          failedChildSkus: [],
          totalVariations: 0,
          isUpdateFlow: isUpdateFlow,
        };
      }

      for (const [index, variation] of populatedListing.prodPricing.selectedVariations.entries()) {
        try {
          // Generate child SKU for this variation
          const childSku = amazonListingService.generateChildSku(variation);
          console.log("child SKU", childSku);
          // Check if this child already exists in Amazon
          if (currentAmazonSkus.includes(childSku)) {
            console.log(`Child SKU ${childSku} already exists - skipping creation`);
            successfulChildSkus.push({
              childSku,
              variationIndex: index,
              variationId: variation._id,
              status: "already_exists",
              retailPrice: variation.retailPrice,
              listingQuantity: variation.listingQuantity,
              skippedReason: "Already created in previous request",
            });
            continue;
          }

          // Validate variation before creating
          const validationResult = amazonListingService.validateVariation(variation);
          if (!validationResult.isValid) {
            console.log("reesult");
            failedChildSkus.push({
              childSku,
              variationIndex: index,
              variationId: variation._id,
              error: validationResult.errors,
              status: "validation_failed",
            });
            continue;
          }

          // Create child listing
          console.log(
            `Creating child variation ${index + 1}/${populatedListing.prodPricing.selectedVariations.length} - SKU: ${childSku}`
          );
          const childResult = await amazonListingService.createChildListing(populatedListing, variation, token);
          results.push(childResult);

          if (childResult.status === 200) {
            successfulChildSkus.push({
              childSku,
              variationIndex: index,
              variationId: variation._id,
              status: "created",
              retailPrice: variation.retailPrice,
              listingQuantity: variation.listingQuantity,
            });

            // Add successful SKU to the tracking array
            await amazonListingService.addSkuToTracking(populatedListing._id, childSku);
          } else {
            failedChildSkus.push({
              childSku,
              variationIndex: index,
              variationId: variation._id,
              error: childResult.message || "Unknown error",
              status: "creation_failed",
              amazonResponse: childResult,
            });
          }
        } catch (error: any) {
          const childSku = amazonListingService.generateChildSku(variation);
          failedChildSkus.push({
            childSku,
            variationIndex: index,
            variationId: variation._id,
            error: error.message || "Unexpected error during child creation",
            status: "exception_error",
          });
          console.error(`Error creating child variation ${index}:`, error);
        }
      }

      // Step 3: Determine overall status and prepare response
      const totalVariations = populatedListing.prodPricing.selectedVariations.length;
      const successCount = successfulChildSkus.length;
      const failureCount = failedChildSkus.length;
      const alreadyExistsCount = successfulChildSkus.filter((s) => s.status === "already_exists").length;
      const newlyCreatedCount = successfulChildSkus.filter((s) => s.status === "created").length;

      let overallStatus = 200;
      let message = `Variation listing ${isUpdateFlow ? "updated" : "processed"} successfully`;

      if (successCount === 0 && failureCount > 0) {
        overallStatus = 400;
        message = "All child variations failed to create";
      } else if (failureCount > 0) {
        overallStatus = 206; // Partial success
        message = `Partial success: ${successCount}/${totalVariations} variations processed (${newlyCreatedCount} created, ${alreadyExistsCount} already existed)`;
      } else if (alreadyExistsCount > 0 && newlyCreatedCount === 0) {
        message = `All variations already existed: ${alreadyExistsCount}/${totalVariations} variations were previously created`;
      } else {
        message = `All variations processed successfully: ${newlyCreatedCount} created, ${alreadyExistsCount} already existed`;
      }

      return {
        status: overallStatus,
        message: message,
        results: results,
        parentCreated: parentCreated,
        successfulChildSkus: successfulChildSkus,
        failedChildSkus: failedChildSkus,
        totalVariations: totalVariations,
        isUpdateFlow: isUpdateFlow,
        summary: {
          successful: successCount,
          failed: failureCount,
          total: totalVariations,
          newlyCreated: newlyCreatedCount,
          alreadyExisted: alreadyExistsCount,
        },
      };
    } catch (error: any) {
      console.error("Error in createVariationListing:", error);
      return {
        status: 500,
        message: `Internal error during variation listing ${isUpdateFlow ? "update" : "creation"}`,
        error: error.message,
        results: results,
        parentCreated: parentCreated,
        successfulChildSkus: successfulChildSkus,
        failedChildSkus: failedChildSkus,
        totalVariations: populatedListing.prodPricing?.selectedVariations?.length || 0,
        isUpdateFlow: isUpdateFlow,
      };
    }
  },
  // Delete child variation
  deleteChildVariation: async (parentSku: string, childSku: string, token: string): Promise<any> => {
    try {
      // Delete from Amazon
      const deleteResult: any = await amazonListingService.deleteItemFromAmazon(childSku);

      // if (deleteResult.status === 200) {
      //   // Update tracking - remove from database
      //   await amazonListingService.updateSingleVariationTracking(parentSku, childSku, { _id: "deleted" }, "deleted");
      // }

      return deleteResult;
    } catch (error: any) {
      console.error("Error deleting child variation:", error);
      return {
        status: 500,
        message: "Internal error during variation deletion",
        error: error.message,
      };
    }
  },

  // Get current variation status
  getVariationStatus: async (parentSku: string): Promise<any> => {
    try {
      // Fetch from database
      const listing: any = await Listing.findOne({ "productInfo.sku": parentSku });
      // return listing.prodPricing.amazonVariationStatus;

      console.log(`Getting variation status for ${parentSku}`);
      return {
        parentCreated: true,
        currentAmazonVariationsSKU: [],
        lastUpdated: new Date(),
        successful: [],
        failed: [],
      };
    } catch (error) {
      console.error("Error getting variation status:", error);
      return null;
    }
  },
  // Update tracking after retry
  updateRetryTracking: async (parentSku: string, newSuccessful: any[], stillFailed: any[]) => {
    try {
      // Move newly successful items from failed to successful
      // Update currentAmazonVariationsSKU array
      const newSuccessfulSkus = newSuccessful.map((item) => item.childSku);

      // Database update logic here
      console.log("Retry tracking updated:", { newSuccessful: newSuccessfulSkus, stillFailed });
    } catch (error) {
      console.error("Error updating retry tracking:", error);
    }
  },

  extractVariationData: (variations: any[]): any[] => {
    return variations.map((variation) => {
      return variation?.variationId?.attributes?.actual_attributes || {};
    });
  },

  determineVariationTheme: (variationData: any): string => {
    // console.log("variationData in determineVariationTheme", JSON.stringify(variationData, null, 2));

    // Define attribute to Amazon theme mapping
    const attributeToThemeMap: { [key: string]: string } = {
      display: "DISPLAY_SIZE",
      // memory_storage_capacity: "MEMORY_STORAGE_CAPACITY",
      hard_disk: "HARD_DISK_SIZE",
      computer_memory: "COMPUTER_MEMORY_SIZE", // actually RAM Size
      processor_description: "PROCESSOR_DESCRIPTION",
      color: "COLOR_NAME",
      // ram_memory: "RAM_MEMORY_INSTALLED_SIZE",
      graphics_coprocessor: "GRAPHICS_COPROCESSOR",
      graphics_description: "GRAPHICS_DESCRIPTION",
      operating_system: "OPERATING_SYSTEM",
      size: "SIZE_NAME",
    };

    // Amazon's allowed variation themes
    const allowedThemes = [
      "COLOR/DISPLAY_SIZE",
      "COLOR/DISPLAY_SIZE/MEMORY_STORAGE_CAPACITY",
      "COLOR/DISPLAY_SIZE/MEMORY_STORAGE_CAPACITY/RAM_MEMORY_INSTALLED_SIZE",
      "COLOR/DISPLAY_SIZE/MEMORY_STORAGE_CAPACITY/RAM_MEMORY_INSTALLED_SIZE/GRAPHICS_COPROCESSOR",
      "COLOR/DISPLAY_SIZE/MEMORY_STORAGE_CAPACITY/RAM_MEMORY_INSTALLED_SIZE/GRAPHICS_COPROCESSOR/OPERATING_SYSTEM",
      "COMPUTER_MEMORY_SIZE",
      "COMPUTER_MEMORY_SIZE/HARD_DISK_SIZE",
      "DISPLAY_SIZE",
      "HARD_DISK_SIZE",
      "MEMORY_STORAGE_CAPACITY",
      "OPERATING_SYSTEM",
      "PROCESSOR_DESCRIPTION",
      "PROCESSOR_DESCRIPTION/COMPUTER_MEMORY_SIZE",
      "PROCESSOR_DESCRIPTION/COMPUTER_MEMORY_SIZE/HARD_DISK_SIZE",
      "PROCESSOR_DESCRIPTION/COMPUTER_MEMORY_SIZE/HARD_DISK_SIZE/GRAPHICS_DESCRIPTION",
      "PROCESSOR_DESCRIPTION/COMPUTER_MEMORY_SIZE/HARD_DISK_SIZE/OPERATING_SYSTEM",
      "PROCESSOR_DESCRIPTION/GRAPHICS_DESCRIPTION",
      "PROCESSOR_DESCRIPTION/HARD_DISK_SIZE",
      "PROCESSOR_DESCRIPTION/HARD_DISK_SIZE/GRAPHICS_DESCRIPTION",
      "PROCESSOR_DESCRIPTION/HARD_DISK_SIZE/STYLE_NAME",
      "PROCESSOR_DESCRIPTION/OPERATING_SYSTEM",
      "PROCESSOR_DESCRIPTION/SOFTWARE_INCLUDED/COLOR_NAME",
    ];

    // Extract top-level attributes (keys of the first object in variationData)
    const parentAttributes = variationData[0] ? Object.keys(variationData[0]) : [];
    // console.log("Parent Attributes extracted:", parentAttributes);

    // Map parent attributes to Amazon theme names
    const mappedAttributes = parentAttributes
      .map((attr) => attributeToThemeMap[attr] || attr) // Map to theme names or keep original attribute name
      .filter((attr) => attr); // Remove undefined mappings

    // console.log("Mapped Attributes:", mappedAttributes);

    // Throw error if no valid varying attributes are found
    if (mappedAttributes.length === 0) {
      throw new Error("No valid varying attributes found in variationData");
    }

    // Find the best matching theme
    let bestMatch: string | null = null;
    let maxMatchingAttributes = 0;

    // Loop through each allowed theme to check for a match
    for (const theme of allowedThemes) {
      const themeAttributes = theme.split("/");

      // Convert themeAttributes and mappedAttributes into sets for easier comparison
      const themeSet = new Set(themeAttributes);
      const mappedSet = new Set(mappedAttributes);

      // Check if all theme attributes exist in the mapped attributes (order does not matter)
      const isValidMatch = [...themeSet].every((attr) => mappedSet.has(attr));

      // console.log(`Checking theme: ${theme}`);
      // console.log("Matching Attributes (order-agnostic):", isValidMatch);

      // If it's a valid match and has the most matching attribustes, update bestMatch
      if (isValidMatch) {
        const matchingAttributes = themeAttributes.filter((attr) => mappedSet.has(attr)).length;
        console.log("Matching Attribute Count:", matchingAttributes);

        if (matchingAttributes > maxMatchingAttributes) {
          maxMatchingAttributes = matchingAttributes;
          bestMatch = theme;
        }
      }
    }

    // Throw error if no valid theme is found
    if (!bestMatch) {
      throw new Error(`No matching variation theme found for attributes: ${mappedAttributes.join(", ")}`);
    }

    return bestMatch;
  },
  buildVariationAttributes: (variationData: any[]): any => {
    // console.log("variation Data in build variation attributes function", variationData);
    const attributes: any = {};

    // Iterate over each variation object in the array
    variationData.forEach((variation) => {
      // Get all keys from the variation object
      Object.keys(variation).forEach((attributeKey) => {
        // Add the key to attributes with an empty array as a placeholder
        if (!attributes[attributeKey]) {
          attributes[attributeKey] = [];
        }
      });
    });

    return attributes;
  },
  buildChildVariationAttributes: (variation: any): any => {
    // console.log("Building Child variation attributes for:", variation);

    // Check if variation has attributes and log them
    // if (variation && variation.variationId.attributes) {
    //   console.log("Variation attributes:", variation.variationId.attributes);
    // } else {
    //   console.log("No variation attributes found");
    // }

    // Check if actual_attributes is present
    if (variation && variation.variationId.attributes && variation.variationId.attributes.actual_attributes) {
      // console.log("Actual attributes found:", variation.variationId.attributes.actual_attributes);

      // Return actual_attributes directly
      return variation.variationId.attributes.actual_attributes;
    } else {
      console.log("No actual_attributes found");
      return {}; // Return empty if actual_attributes is missing
    }
  },
  generateChildSku: (variation: any): string => {
    const suffixParts: string[] = [];

    // Define attributes that should be processed as sizes
    const sizeAttributes = ["computer_memory", "hard_disk"];

    // Check if variationId and attributes exist
    if (variation?.variationId?.attributes) {
      const attributes = variation.variationId.attributes;

      // Iterate over the attributes object to process each key
      Object.keys(attributes).forEach((attributeKey) => {
        // Skip actual_attributes
        if (attributeKey === "actual_attributes") {
          return;
        }

        const attributeValue = attributes[attributeKey];

        // Process only if attributeValue is a string and not empty
        if (typeof attributeValue === "string" && attributeValue !== "") {
          // Check if the attribute is a size-related attribute
          if (sizeAttributes.includes(attributeKey)) {
            // Process size pattern like "16 GB", "256 GB"
            const sizeMatch = attributeValue.match(/(\d+)\s*(\w+)/);

            if (sizeMatch) {
              const value = sizeMatch[1];
              const unit = sizeMatch[2];
              const valueToAdd = `${value}${unit}`;

              // Clean and add to suffix parts
              const cleanValue = valueToAdd.replace(/\s+/g, "").replace(/[^a-zA-Z0-9]/g, "");
              suffixParts.push(cleanValue);
            } else {
              // If no size pattern, clean and add the value directly
              const cleanValue = attributeValue.replace(/\s+/g, "").replace(/[^a-zA-Z0-9]/g, "");
              suffixParts.push(cleanValue);
            }
          } else {
            // For non-size attributes, clean and add the value directly
            const cleanValue = attributeValue.replace(/\s+/g, "").replace(/[^a-zA-Z0-9]/g, "");
            suffixParts.push(cleanValue);
          }
        } else {
          console.log(`Skipping invalid or empty value for attribute: ${attributeKey}`);
        }
      });
    } else {
      console.log("No attributes found in variation.variationId.");
    }

    // Join the suffix parts to form the final SKU suffix
    let suffix = suffixParts.join("-");

    // Automatically truncate if SKU exceeds 39 characters
    if (suffix.length > 39) {
      // Truncate to the first 39 characters
      suffix = suffix.slice(0, 39);
    }

    // Return the final SKU or fallback to "var" if no valid suffix is found
    return suffix || "var";
  },

  getCommonAttributes: (prodTechInfo: any, variation: any): any => {
    const common = { ...prodTechInfo };

    // Dynamically get the attributes using buildChildVariationAttributes
    const variationAttributes = Object.keys(amazonListingService.buildVariationAttributes(variation));

    // Log the keys of actual attributes
    console.log("Dynamic Variation Attributes: ", variationAttributes);

    // Delete these dynamic attributes from the common object
    variationAttributes.forEach((attr) => {
      delete common[attr];
    });

    return common;
  },

  getChildCommonAttributes: (prodTechInfo: any, variation: any): any => {
    const common = { ...prodTechInfo };

    // Dynamically get the attributes using buildChildVariationAttributes
    const variationAttributes = Object.keys(amazonListingService.buildChildVariationAttributes(variation));

    // Log the keys of actual attributes
    console.log("Dynamic Variation Attributes: ", variationAttributes);

    // Delete these dynamic attributes from the common object
    variationAttributes.forEach((attr) => {
      delete common[attr];
    });

    return common;
  },
  createParentListing: async (populatedListing: any, token: string): Promise<any> => {
    const {
      productInfo: { sku, item_name, brand, product_description, condition_type },
      prodDelivery: { item_display_weight, item_package_weight, item_package_dimensions, epr_product_packaging },
    } = populatedListing;
    const categoryId =
      populatedListing.productInfo.productCategory.amazonCategoryId ||
      populatedListing.productInfo.productCategory.categoryId ||
      "NOTEBOOK_COMPUTER";

    // let selectedGtin = null;

    // const existingListingId = populatedListing.amazonSku; // Check if listing already exists
    // if (!existingListingId) {
    //   // If there's no existing listing, fetch and assign a new GTIN
    //   const gtinDoc = await gtinService.getAndReserveGtin(sku);
    //   selectedGtin = gtinDoc.gtin;
    //   console.log(`Assigned GTIN ${selectedGtin} to listing ${sku}`);
    // } else {
    //   // If listing already exists, don't fetch a new GTIN
    //   console.log(`Listing ${sku} already has a GTIN, skipping GTIN assignment.`);
    // }

    const variationData = amazonListingService.extractVariationData(populatedListing.prodPricing.selectedVariations);
    console.log("here var data", variationData);
    const selectedVariationTheme = amazonListingService.determineVariationTheme(variationData);

    const parentData = {
      productType: categoryId,
      requirements: "LISTING",
      attributes: {
        condition_type: condition_type || [{ value: "new_new" }],
        item_name: item_name || [],
        brand: brand || [],
        product_description: product_description || [],
        parentage_level: [
          {
            value: "parent",
          },
        ],
        child_parent_sku_relationship: [
          {
            child_relationship_type: "variation",
          },
        ],
        variation_theme: [{ name: selectedVariationTheme }],
        // ...(selectedGtin && {
        //   externally_assigned_product_identifier: [
        //     {
        //       type: "ean",
        //       value: selectedGtin, // Assign the selected GTIN only if it's new
        //       marketplace_id: "A1F83G8C2ARO7P",
        //     },
        //   ],
        // }),
        ...amazonListingService.prepareImageLocators(populatedListing),
        item_display_weight: item_display_weight || [],
        item_package_weight: item_package_weight || [],
        item_package_dimensions: item_package_dimensions || [],
        epr_product_packaging: epr_product_packaging || [],
        ...amazonListingService.getCommonAttributes(populatedListing.prodTechInfo, variationData),
      },
    };

    console.log("🔗 Creating or updating parent listing:", JSON.stringify(parentData, null, 2));

    // Send the listing to Amazon
    const response = await amazonListingService.sendToAmazon(sku, parentData, token);

    // Mark the GTIN as used after successful listing creation if it's a new GTIN
    // if (selectedGtin) {
    //   await gtinService.useGtin(selectedGtin, response.listingId || sku); // Use listingId or fallback to sku
    // }

    return response;
  },

  createChildListing: async (populatedListing: any, variation: any, token: string): Promise<any> => {
    console.log("in creeate child listing function's variation", variation);
    try {
      const {
        productInfo: { sku, item_name, brand, product_description, condition_type },
        // prodTechInfo: { condition_type },
        prodDelivery: { item_display_weight, item_package_weight, item_package_dimensions, epr_product_packaging },
      } = populatedListing;
      // Fetch an unused GTIN

      let selectedGtin = null;

      const existingListingId = populatedListing.prodPricing?.currentAmazonVariationsSKU?.find(
        (item: any) => item === amazonListingService.generateChildSku(variation)
      ); // Check if listing already exists
      console.log("existingListingId", existingListingId);
      if (!existingListingId) {
        // If there's no existing listing, fetch and assign a new GTIN
        const gtinDoc = await gtinService.getAndReserveGtin(sku);
        selectedGtin = gtinDoc.gtin;
        console.log(`Assigned GTIN ${selectedGtin} to listing ${sku}`);
      } else {
        // If listing already exists, don't fetch a new GTIN
        console.log(`Listing ${sku} already has a GTIN, skipping GTIN assignment.`);
      }

      const categoryId =
        populatedListing.productInfo.productCategory.amazonCategoryId ||
        populatedListing.productInfo.productCategory.categoryId ||
        "NOTEBOOK_COMPUTER";
console.log("variation.retailPrice", variation.retailPrice);
      const childSku = amazonListingService.generateChildSku(variation);

      // Get variation theme (you'll need to implement this based on your existing logic)
      const variationData = amazonListingService.extractVariationData([variation]);
      // console.log("here child var data", JSON.stringify(variationData));
      const selectedVariationTheme = amazonListingService.determineVariationTheme(variationData);

      const childData = {
        productType: categoryId,
        requirements: "LISTING",
        attributes: {
          condition_type: condition_type || [{ value: "new_new" }],
          item_name: item_name || [],
          brand: brand || [],
          product_description: product_description || [],
          child_parent_sku_relationship: [
            {
              child_relationship_type: "variation",
              marketplace_id: "A1F83G8C2ARO7P",
              parent_sku: sku,
            },
          ],
          variation_theme: [{ name: selectedVariationTheme }],
          parentage_level: [
            {
              value: "child",
              marketplace_id: "A1F83G8C2ARO7P",
            },
          ],
          ...(selectedGtin && {
            externally_assigned_product_identifier: [
              {
                type: "ean",
                value: selectedGtin, // Assign the selected GTIN only if it's new
                marketplace_id: "A1F83G8C2ARO7P",
              },
            ],
          }),
          ...amazonListingService.buildChildVariationAttributes(variation),
          purchasable_offer: [
            {
              audience: "ALL",
              marketplace_id: "A1F83G8C2ARO7P",
              currency: "GBP",
              our_price: [
                {
                  schedule: [
                    {
                      value_with_tax: variation.retailPrice || 10,
                    },
                  ],
                },
              ],
            },
          ],

          fulfillment_availability: [
            {
              fulfillment_channel_code: "DEFAULT",
              lead_time_to_ship_max_days: 20,
              // quantity: variation.listingQuantity,
              is_inventory_available: false,
              marketplace_id: "A1F83G8C2ARO7P",
            },
          ],
          item_display_weight: item_display_weight || [],
          item_package_weight: item_package_weight || [],
          item_package_dimensions: item_package_dimensions || [],
          epr_product_packaging: epr_product_packaging || [],
          ...amazonListingService.prepareChildImageLocators(variation),
          ...amazonListingService.getChildCommonAttributes(populatedListing.prodTechInfo, variation),
        },
      };

      console.log("🔗 Creating child listing:", JSON.stringify(childData, null, 2));

      const result = await amazonListingService.sendToAmazon(childSku, childData, token);

      // Add additional context to the result
      return {
        ...result,
        childSku: childSku,
        variationId: variation._id,
        requestData: childData,
      };
    } catch (error: any) {
      console.error("Error in create Child Listing:", error);
      return {
        status: 500,
        message: error.message || "Internal error creating child listing",
        error: error.message,
        childSku: amazonListingService.generateChildSku(variation),
        variationId: variation._id,
      };
    }
  },

  // Send data to Amazon API
  sendToAmazon: async (sku: string, productData: any, token: string): Promise<any> => {
    console.log("payload before sending to Amazon", productData);
    try {
      const response = await fetch(
        `${redirectUri}/listings/2021-08-01/items/${sellerId}/${sku}?marketplaceIds=${marketplaceId}`,
        {
          method: "PUT",
          headers: {
            "x-amz-access-token": token,
            "Content-Type": "application/json",
            // "x-amzn-api-sandbox-only": type === "SANDBOX" ? "true" : "false" // Use sandbox mode if type is SANDBOX
            "x-amzn-api-sandbox-only": "true",
          },
          body: JSON.stringify(productData),
        }
      );

      console.log(
        "url is",
        `${redirectUri}/listings/2021-08-01/items/${sellerId}/${sku || "ABC-123-DUMMY"}?marketplaceIds=${marketplaceId}`
      );

      const rawResponse = await response.text();
      console.log("🔍 Raw response from Amazon:", rawResponse);

      let jsonObj: any = {};
      try {
        jsonObj = JSON.parse(rawResponse);
      } catch (error) {
        console.error("Error parsing the response as JSON:", error);
      }

      const status = jsonObj?.status;
      const submissionId = jsonObj?.submissionId;
      const issues = jsonObj?.issues;

      if (status === "ACCEPTED" && submissionId) {
        return {
          status: 200,
          statusText: "OK",
          sku,
          submissionId,
          response: jsonObj,
        };
      } else {
        return {
          status: 400,
          statusText: "Failed to create listing",
          errorResponse: issues || jsonObj,
          response: jsonObj,
        };
      }
    } catch (error: any) {
      console.error("Error sending to Amazon:", error.message);
      return {
        status: 500,
        message: error.message || "Error syncing with Amazon API",
      };
    }
  },

  reviseItemOnAmazon: async (listing: any): Promise<string> => {
    try {
      const token = await getStoredAmazonAccessToken();
      if (!token) {
        throw new Error("Missing or invalid Amazon access token");
      }

      const populatedListing: any = await Listing.findById(listing._id)
        .populate("prodPricing.selectedVariations.variationId")
        .populate("productInfo.productCategory")
        .lean();

      if (!populatedListing) {
        throw new Error("Listing not found or failed to populate");
      }

      const amazonData = populatedListing;
      const productType = amazonData.productInfo.productCategory.amazonProductType;
      const sku = amazonData.sku; // Make sure your listing has an SKU field

      if (!sellerId || !sku) {
        throw new Error("Missing required sellerId or SKU");
      }

      // Prepare JSON Patch operations according to API docs
      const patches: any[] = [];

      // Update title if present
      if (amazonData.productInfo?.title) {
        patches.push({
          op: "replace",
          path: "/attributes/item_name",
          value: [
            {
              value: amazonData.productInfo.title,
              marketplace_id: marketplaceId,
            },
          ],
        });
      }

      // Update bullet points if present
      if (amazonData.productInfo?.description) {
        const bulletPoints = amazonData.productInfo.description
          .split(".")
          .slice(0, 5)
          .filter((point: any) => point.trim().length > 0)
          .map((point: any) => point.trim());

        if (bulletPoints.length > 0) {
          patches.push({
            op: "replace",
            path: "/attributes/bullet_point",
            value: bulletPoints.map((point: any) => ({
              value: point,
              marketplace_id: marketplaceId,
            })),
          });
        }
      }

      // Update description if present
      if (amazonData.productInfo?.description) {
        patches.push({
          op: "replace",
          path: "/attributes/description",
          value: [
            {
              value: amazonData.productInfo.description,
              marketplace_id: marketplaceId,
            },
          ],
        });
      }

      // Update price if present
      if (amazonData.prodPricing?.retailPrice) {
        patches.push({
          op: "replace",
          path: "/attributes/list_price",
          value: [
            {
              value: {
                Amount: amazonData.prodPricing.retailPrice,
                CurrencyCode: "GBP",
              },
              marketplace_id: marketplaceId,
            },
          ],
        });
      }

      // Update quantity if present
      if (amazonData.prodPricing?.listingQuantity !== undefined) {
        patches.push({
          op: "replace",
          path: "/attributes/fulfillment_availability",
          value: [
            {
              value: [
                {
                  fulfillment_channel_code: "DEFAULT",
                  quantity: amazonData.prodPricing.listingQuantity,
                },
              ],
              marketplace_id: marketplaceId,
            },
          ],
        });
      }

      // Handle variations if present
      if (amazonData.listingHasVariations && amazonData.prodPricing?.selectedVariations?.length > 0) {
        const variations = amazonData.prodPricing.selectedVariations.map((variation: any) => ({
          sku: variation.variationId?.sku,
          attributes: variation.variationId?.attributes,
          price: variation.retailPrice,
          quantity: variation.listingQuantity,
        }));

        patches.push({
          op: "replace",
          path: "/attributes/child_parent_sku_relationship",
          value: [
            {
              value: variations.map((v: any) => ({
                child_sku: v.sku,
                parent_sku: sku,
              })),
              marketplace_id: marketplaceId,
            },
          ],
        });
      }

      if (patches.length === 0) {
        throw new Error("No valid data to update");
      }

      // Prepare request body according to ListingsItemPatchRequest schema
      const requestBody = {
        productType: productType,
        patches: patches,
      };

      // Build query parameters
      const queryParams = new URLSearchParams({
        marketplaceIds: marketplaceId,
        includedData: "issues", // Default as per API docs
      });

      // Add optional parameters if needed
      if (process.env.AMAZON_ISSUE_LOCALE) {
        queryParams.append("issueLocale", process.env.AMAZON_ISSUE_LOCALE);
      }

      // Make API call using the correct endpoint structure
      const apiUrl = `${redirectUri}/listings/2021-08-01/items/${sellerId}/${sku}?${queryParams.toString()}`;

      const response = await fetch(apiUrl, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
          "x-amz-access-token": token,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify(requestBody),
      });

      const result = await response.json();

      if (response.ok) {
        return JSON.stringify({
          status: 200,
          statusText: "OK",
          sellerId: sellerId,
          sku: sku,
          response: result,
        });
      } else {
        return JSON.stringify({
          status: response.status,
          statusText: "Failed to update listing",
          errorResponse: result,
        });
      }
    } catch (error: any) {
      console.error("Error updating listing on Amazon:", error.message);
      return JSON.stringify({
        status: 500,
        message: error.message || "Error updating Amazon listing",
      });
    }
  },

  getOrders: async (req: Request, res: Response): Promise<any> => {
    try {
      const token = await getStoredAmazonAccessToken();
      if (!token) {
        throw new Error("Missing or invalid Amazon access token");
      }

      const currentDate = new Date();
      const startDate = new Date(currentDate.getTime() - 90 * 24 * 60 * 60 * 1000); // 90 days ago

      const response = await fetch(
        `${process.env.AMAZON_API_ENDPOINT}/orders/v0/orders?CreatedAfter=${startDate.toISOString()}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "x-amz-access-token": token,
          },
        }
      );

      const orders = await response.json();
      return res.status(StatusCodes.OK).json({
        status: StatusCodes.OK,
        message: ReasonPhrases.OK,
        data: orders,
      });
    } catch (error: any) {
      console.error("Error fetching orders:", error.message);
      return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        status: StatusCodes.INTERNAL_SERVER_ERROR,
        message: ReasonPhrases.INTERNAL_SERVER_ERROR,
        error: "Failed to fetch Amazon orders",
        details: error,
      });
    }
  },

  // Validate variation data before creating child listing
  validateVariation: (variation: any): { isValid: boolean; errors: string[] } => {
    const errors: string[] = [];

    if (!variation) {
      errors.push("Variation object is null or undefined");
      return { isValid: false, errors };
    }

    if (!variation?.variationId?._id) {
      errors.push("Variation ID is missing");
    }

    if (!variation.retailPrice || variation.retailPrice <= 0) {
      errors.push("Valid retail price is required");
    }

    if (variation.listingQuantity === undefined || variation.listingQuantity < 0) {
      errors.push("Valid listing quantity is required");
    }

    // Check if the 'attributes' exists
    if (!variation?.variationId?.attributes) {
      errors.push("Variation attributes are missing");
    } else {
      const attributes = variation?.variationId?.attributes;
      const attributeKeys = Object.keys(attributes);

      if (attributeKeys.length === 0) {
        errors.push("No variation attributes found");
      } else {
        // Validate each attribute has proper structure
        let hasValidAttribute = false;
        attributeKeys.forEach((key) => {
          const attributeValue = attributes[key];

          // Validate that the attribute value is not empty or undefined
          if (attributeValue !== undefined && attributeValue !== "") {
            hasValidAttribute = true;
          }
        });

        if (!hasValidAttribute) {
          errors.push("No valid attribute values found in variation");
        }
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  },
  getAmazonCategories: async (req: Request, res: Response) => {
    try {
      const token = await getStoredAmazonAccessToken();

      console.log("🔑 Using Amazon access token:", token ? "[TOKEN PRESENT]" : "[NO TOKEN]");

      if (!token) {
        throw new Error("Missing or invalid Amazon access token");
      }

      // Accept dynamic marketplaceId and environment via query parameters

      const env = process.env.AMAZON_TOKEN_ENV === "production" ? "production" : "sandbox";
      console.log(`Environment set to: ${env}`);

      const baseUrl =
        env === "production"
          ? "https://sellingpartnerapi-eu.amazon.com"
          : "https://sandbox.sellingpartnerapi-na.amazon.com";

      const endpoint = `${baseUrl}/definitions/2020-09-01/productTypes?marketplaceIds=${marketplaceId}`;
      console.log(`🔗 Calling endpoint: ${endpoint}`);

      const response = await fetch(endpoint, {
        headers: {
          Authorization: `Bearer ${token}`,
          "x-amz-access-token": token,
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("❌ Failed to fetch categories:", {
          status: response.status,
          statusText: response.statusText,
          errorBody: errorText,
        });
        throw new Error(`Failed to fetch categories: ${response.status} ${response.statusText}`);
      }

      const responseData = await response.json();

      console.log("✅ Raw Amazon product types:", responseData); // Optional debug log

      const transformedCategories = (responseData.productTypes || []).map((category: any) => ({
        id: category.name,
        name: category.displayName,
        marketplaceIds: category.marketplaceIds,
      }));

      return res.status(StatusCodes.OK).json({
        status: StatusCodes.OK,
        message: ReasonPhrases.OK,
        data: transformedCategories,
      });
    } catch (error: any) {
      console.error("❌ Error getting Amazon categories:", error);
      return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        status: StatusCodes.INTERNAL_SERVER_ERROR,
        message: ReasonPhrases.INTERNAL_SERVER_ERROR,
        error: "Failed to get Amazon categories",
        details: error.message,
      });
    }
  },

  prepareImageLocators: (populatedListing: any) => {
    // Destructure the images from prodMedia
    const { images } = populatedListing.prodMedia;

    // // Check if there are images in the array
    // if (!images || images.length === 0) {
    //   throw new Error("No images found in prodMedia of standAlone listing");
    // }

    // Initialize the payload object that will hold the locators
    let payload: any = {};

    // Ensure there is at least one image to use as the main product image
    if (images.length > 0) {
      // Main product image (first image in the array)
      payload.main_product_image_locator = [
        {
          marketplace_id: marketplaceId, // Placeholder for marketplace_id, adjust as needed
          media_location: images[0].url, // Use the first image's URL as the main image
        },
      ];
    }

    // Other product image locators (remaining images)
    images.slice(1).forEach((image: any, index: any) => {
      const locatorKey = `other_product_image_locator_${index + 1}`; // other_product_image_locator_1, 2, 3, etc.
      payload[locatorKey] = [
        {
          marketplace_id: marketplaceId, // Placeholder for marketplace_id, adjust as needed
          media_location: image.url, // Use the current image's URL
        },
      ];
    });

    // Return the populated payload
    return payload;
  },
  prepareChildImageLocators: (variation: any) => {
    console.log("Here is the variation data in child variation: ", variation);

    // Destructure images directly from the variation (not from variationId)
    const { images } = variation; // Updated to access images directly from the top level of the object

    // Check if there are images in the array
    // if (!images || images.length === 0) {
    //   throw new Error("No images found for Child Variation Listing");
    // }

    let payload: any = {};

    // Ensure there is at least one image to use as the main product image
    if (images.length > 0) {
      // Main product image (first image in the array)
      payload.main_product_image_locator = [
        {
          marketplace_id: marketplaceId, // Placeholder for marketplace_id, adjust as needed
          media_location: images[0].url, // Use the first image's URL as the main image
        },
      ];
    }

    // Other product image locators (remaining images)
    images.slice(1).forEach((image: any, index: any) => {
      const locatorKey = `other_product_image_locator_${index + 1}`; // other_product_image_locator_1, 2, 3, etc.
      payload[locatorKey] = [
        {
          marketplace_id: marketplaceId, // Placeholder for marketplace_id, adjust as needed
          media_location: image.url, // Use the current image's URL
        },
      ];
    });

    // Return the populated payload
    return payload;
  },

  // prepareOfferImageLocators: (populatedListing: any) => {
  //   // Destructure the images from prodMedia
  //   const { offerImages } = populatedListing.prodMedia;

  //   // Check if there are images in the array
  //   // if (!offerImages || offerImages.length === 0) {
  //   //   throw new Error("No offer images found in prodMedia");
  //   // }

  //   // Initialize the payload object that will hold the locators
  //   let payload: any = {};

  //   // Ensure there is at least one image to use as the main product image
  //   if (offerImages.length > 0) {
  //     // Main product image (first image in the array)
  //     payload.main_offer_image_locator = [
  //       {
  //         marketplace_id: marketplaceId, // Placeholder for marketplace_id, adjust as needed
  //         media_location: offerImages[0].url, // Use the first image's URL as the main image
  //       },
  //     ];
  //   }

  //   // Other product image locators (remaining images)
  //   offerImages.slice(1).forEach((image: any, index: any) => {
  //     const locatorKey = `other_offer_image_locator_${index + 1}`; // other_offer_image_locator_1, 2, 3, etc.
  //     payload[locatorKey] = [
  //       {
  //         marketplace_id: marketplaceId, // Placeholder for marketplace_id, adjust as needed
  //         media_location: image.url, // Use the current image's URL
  //       },
  //     ];
  //   });

  //   // Return the populated payload
  //   return payload;
  // },
  updateListingWithAmazonSku: async (listingId: string, amazonSku: string): Promise<void> => {
    try {
      await Listing.findByIdAndUpdate(listingId, {
        amazonSku: amazonSku,
      });
      console.log(`Updated listing ${listingId} with Amazon SKU: ${amazonSku}`);
    } catch (error) {
      console.error("Error updating listing with Amazon SKU:", error);
      throw error;
    }
  },

  // Helper function to add SKU to tracking array
  addSkuToTracking: async (listingId: string, childSku: string): Promise<void> => {
    try {
      // Fetch the current listing to check the array
      const listing: any = await Listing.findById(listingId);

      if (!listing) {
        throw new Error("Listing not found");
      }

      // Check if the SKU is already in the array
      const existingSkus = listing.prodPricing.currentAmazonVariationsSKU;

      // If the SKU is not in the array, push it to the end (next available index)
      if (!existingSkus.includes(childSku)) {
        // Manually update the prodPricing.currentAmazonVariationsSKU field
        listing.prodPricing.currentAmazonVariationsSKU.push(childSku);

        // Manually saving the updated listing
        await listing.save({ validateBeforeSave: false });

        console.log(`Added child SKU ${childSku} to tracking for listing ${listingId}`);
      } else {
        console.log(`Child SKU ${childSku} is already in the tracking list.`);
      }
    } catch (error) {
      console.error("Error adding SKU to tracking:", error);
      throw error;
    }
  },
};
