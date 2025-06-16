import { StatusCodes, ReasonPhrases } from "http-status-codes";
import { Request, Response } from "express";
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
    const {
      productInfo: { sku, item_name, brand, product_description },
      prodTechInfo: {
        condition_type,
        // color,
        // model_name,
        // model_number,
        // generic_keyword,
        // memory_storage_capacity,
        // item_weight,
        // item_dimensions,
        // bullet_point,
        // max_order_quantity,
        // fulfillment_availability,
      },
    } = populatedListing;

    const otherProdTechInfo = { ...populatedListing.prodTechInfo };
    delete otherProdTechInfo.condition_type;
    // delete otherProdTechInfo.color;
    // delete otherProdTechInfo.model_name;
    // delete otherProdTechInfo.model_number;
    // delete otherProdTechInfo.generic_keyword;
    // delete otherProdTechInfo.memory_storage_capacity;
    // delete otherProdTechInfo.item_weight;
    // delete otherProdTechInfo.item_dimensions;
    // delete otherProdTechInfo.bullet_point;
    // delete otherProdTechInfo.max_order_quantity;
    // delete otherProdTechInfo.fulfillment_availability;
    const categoryId =
      populatedListing.productInfo.productCategory.amazonCategoryId ||
      populatedListing.productInfo.productCategory.categoryId ||
      "NOTEBOOK_COMPUTER";

    const productData = {
      productType: categoryId,
      requirements: "LISTING",
      attributes: {
        condition_type: condition_type,
        item_name: item_name || [],
        brand: brand || [],
        // manufacturer: [
        //   {
        //     value: brand?.[0]?.value || "Manufacturer Not Available",
        //     marketplace_id: marketplaceId,
        //   },
        // ],
        // model_name: model_name || [],
        // model_number: model_number || [],s
        product_description: product_description || [],
        // color: color || [],
        // memory_storage_capacity: memory_storage_capacity || [],
        // item_weight: item_weight || [],
        // item_dimensions: item_dimensions || [],
        // bullet_point: bullet_point || [],
        // max_order_quantity: max_order_quantity || [],
        // generic_keyword: generic_keyword || [],
        // fulfillment_availability: fulfillment_availability || [],
        // Spread other prodTechInfo attributes dynamically
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

    try {
      // Step 1: Create parent listing
      const parentResult = await amazonListingService.createParentListing(populatedListing, token);
      results.push(parentResult);
      console.log("Parent listing creation result:", parentResult);

      if (parentResult.status !== 200) {
        return {
          status: 400,
          message: "Failed to create parent listing",
          results: results,
          parentCreated: false,
          successfulChildSkus: [],
          failedChildSkus: [],
          totalVariations: populatedListing.prodPricing.selectedVariations.length,
        };
      }

      parentCreated = true;

      // Step 2: Create child listings for each variation
      for (const [index, variation] of populatedListing.prodPricing.selectedVariations.entries()) {
        try {
          // Validate variation before creating
          const validationResult = amazonListingService.validateVariation(variation);
          if (!validationResult.isValid) {
            const childSku = amazonListingService.generateChildSku(populatedListing.productInfo.sku, variation);
            failedChildSkus.push({
              childSku,
              variationIndex: index,
              variationId: variation._id,
              error: validationResult.errors,
              status: "validation_failed",
            });
            continue;
          }

          const childResult = await amazonListingService.createChildListing(populatedListing, variation, token);
          results.push(childResult);

          const childSku = amazonListingService.generateChildSku(populatedListing.productInfo.sku, variation);

          if (childResult.status === 200) {
            successfulChildSkus.push({
              childSku,
              variationIndex: index,
              variationId: variation._id,
              status: "created",
              retailPrice: variation.retailPrice,
              listingQuantity: variation.listingQuantity,
            });
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
          const childSku = amazonListingService.generateChildSku(populatedListing.productInfo.sku, variation);
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

      // Step 3: Update database with tracking information
      await amazonListingService.updateVariationTracking(
        populatedListing.productInfo.sku,
        successfulChildSkus,
        failedChildSkus,
        parentCreated
      );

      // Determine overall status
      const totalVariations = populatedListing.prodPricing.selectedVariations.length;
      const successCount = successfulChildSkus.length;
      const failureCount = failedChildSkus.length;

      let overallStatus = 200;
      let message = "Variation listing created successfully";

      if (successCount === 0 && failureCount > 0) {
        overallStatus = 400;
        message = "All child variations failed to create";
      } else if (failureCount > 0) {
        overallStatus = 206; // Partial success
        message = `Partial success: ${successCount}/${totalVariations} variations created`;
      }

      return {
        status: overallStatus,
        message: message,
        results: results,
        parentCreated: true,
        successfulChildSkus: successfulChildSkus,
        failedChildSkus: failedChildSkus,
        totalVariations: totalVariations,
        summary: {
          successful: successCount,
          failed: failureCount,
          total: totalVariations,
        },
      };
    } catch (error: any) {
      console.error("Error in createVariationListing:", error);
      return {
        status: 500,
        message: "Internal error during variation listing creation",
        error: error.message,
        results: results,
        parentCreated: parentCreated,
        successfulChildSkus: successfulChildSkus,
        failedChildSkus: failedChildSkus,
        totalVariations: populatedListing.prodPricing.selectedVariations.length,
      };
    }
  },

  // Validate variation data before creating child listing
  validateVariation: (variation: any): { isValid: boolean; errors: string[] } => {
    const errors = [];

    // Check if variation has required structure
    if (!variation.attributes || !variation.attributes.actual_attributes) {
      errors.push("Missing actual_attributes in variation");
    }

    // Check if at least one attribute exists
    if (variation.attributes && variation.attributes.actual_attributes) {
      const attributeKeys = Object.keys(variation.attributes.actual_attributes);
      if (attributeKeys.length === 0) {
        errors.push("No attributes found in actual_attributes");
      }

      // Validate each attribute has proper structure
      attributeKeys.forEach((key) => {
        const attr = variation.attributes.actual_attributes[key];
        if (!Array.isArray(attr) || attr.length === 0) {
          errors.push(`Invalid attribute structure for ${key}`);
        }
      });
    }

    // Check pricing information
    if (!variation.retailPrice || isNaN(parseFloat(variation.retailPrice))) {
      errors.push("Invalid or missing retailPrice");
    }

    if (!variation.listingQuantity || isNaN(parseInt(variation.listingQuantity))) {
      errors.push("Invalid or missing listingQuantity");
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  },

  // Update database with variation tracking information
  updateVariationTracking: async (
    parentSku: string,
    successfulChildSkus: any[],
    failedChildSkus: any[],
    parentCreated: boolean
  ) => {
    try {
      // Extract just the SKU strings for the database
      const successfulSkuStrings = successfulChildSkus.map((item) => item.childSku);
      const failedSkuStrings = failedChildSkus.map((item) => item.childSku);

      // Update the listing document with tracking information
      const updateData = {
        "prodPricing.currentAmazonVariationsSKU": successfulSkuStrings,
        "prodPricing.amazonVariationStatus": {
          parentCreated: parentCreated,
          lastUpdated: new Date(),
          successful: successfulChildSkus,
          failed: failedChildSkus,
          totalAttempted: successfulChildSkus.length + failedChildSkus.length,
        },
      };

      // Assuming you have a database update function
      await Listing.updateOne({ "productInfo.sku": parentSku }, updateData);
      console.log("Variation tracking updated:", updateData);
    } catch (error) {
      console.error("Error updating variation tracking:", error);
    }
  },

  // Edit/Update existing child variation
  updateChildVariation: async (
    parentSku: string,
    variationId: string,
    updatedVariation: any,
    token: string
  ): Promise<any> => {
    try {
      // Generate the child SKU for the variation
      const childSku = amazonListingService.generateChildSku(parentSku, updatedVariation);

      // Validate the updated variation
      const validationResult = amazonListingService.validateVariation(updatedVariation);
      if (!validationResult.isValid) {
        return {
          status: 400,
          message: "Validation failed for updated variation",
          errors: validationResult.errors,
        };
      }

      // Check if this child variation exists in Amazon
      const existsResult = await amazonListingService.checkChildVariationExists(childSku, token);

      if (existsResult.exists) {
        // Update existing child variation
        const updateResult = await amazonListingService.updateExistingChildListing(parentSku, updatedVariation, token);

        if (updateResult.status === 200) {
          // Update tracking in database
          await amazonListingService.updateSingleVariationTracking(parentSku, childSku, updatedVariation, "updated");
        }

        return updateResult;
      } else {
        // Create new child variation if it doesn't exist
        const createResult = await amazonListingService.createChildListing(
          { productInfo: { sku: parentSku } },
          updatedVariation,
          token
        );

        if (createResult.status === 200) {
          // Add to tracking in database
          await amazonListingService.updateSingleVariationTracking(parentSku, childSku, updatedVariation, "created");
        }

        return createResult;
      }
    } catch (error: any) {
      console.error("Error updating child variation:", error);
      return {
        status: 500,
        message: "Internal error during variation update",
        error: error.message,
      };
    }
  },

  // Check if child variation exists on Amazon
  checkChildVariationExists: async (childSku: string, token: string): Promise<{ exists: boolean }> => {
    try {
      // This would be an actual API call to Amazon to check if the SKU exists
      // For now, returning a placeholder
      // const response = await amazonAPI.getProduct(childSku, token);
      // return { exists: response.status === 200 };

      console.log(`Checking if child SKU ${childSku} exists on Amazon`);
      return { exists: true }; // Placeholder
    } catch (error) {
      console.error("Error checking child variation existence:", error);
      return { exists: false };
    }
  },

  // Update existing child listing on Amazon
  updateExistingChildListing: async (parentSku: string, variation: any, token: string): Promise<any> => {
    const childSku = amazonListingService.generateChildSku(parentSku, variation);

    const updateData = {
      productType: "NOTEBOOK_COMPUTER", // This should come from your category mapping
      requirements: "LISTING",
      attributes: {
        // Child-specific attributes
        parent_sku: [{ value: parentSku }],
        child_parent_sku_relationship: [{ value: "child" }],

        // Updated variation values
        ...amazonListingService.buildChildVariationAttributes(variation),

        // Updated price and inventory
        price: [
          {
            value: variation.retailPrice || "10",
            currency: "GBP",
          },
        ],
        quantity: [{ value: variation.listingQuantity || "0" }],
      },
    };

    console.log("🔄 Updating child listing:", JSON.stringify(updateData, null, 2));
    return await amazonListingService.sendToAmazon(childSku, updateData, token);
  },

  // Update tracking for single variation
  updateSingleVariationTracking: async (
    parentSku: string,
    childSku: string,
    variation: any,
    action: "created" | "updated" | "deleted"
  ) => {
    try {
      const trackingUpdate = {
        childSku,
        variationId: variation._id,
        action,
        timestamp: new Date(),
        retailPrice: variation.retailPrice,
        listingQuantity: variation.listingQuantity,
      };

      // Update database - add/update/remove from currentAmazonVariationsSKU array
      if (action === "created" || action === "updated") {
        // Add to array if not exists, or update existing entry
        await Listing.updateOne(
          { "productInfo.sku": parentSku },
          {
            $addToSet: { "prodPricing.currentAmazonVariationsSKU": childSku },
            $push: { "prodPricing.variationHistory": trackingUpdate },
          }
        );
      } else if (action === "deleted") {
        // Remove from array
        await Listing.updateOne(
          { "productInfo.sku": parentSku },
          {
            $pull: { "prodPricing.currentAmazonVariationsSKU": childSku },
            $push: { "prodPricing.variationHistory": trackingUpdate },
          }
        );
      }

      console.log("Single variation tracking updated:", trackingUpdate);
    } catch (error) {
      console.error("Error updating single variation tracking:", error);
    }
  },

  // Delete child variation
  deleteChildVariation: async (parentSku: string, childSku: string, token: string): Promise<any> => {
    try {
      // Delete from Amazon
      const deleteResult = await amazonListingService.deleteFromAmazon(childSku, token);

      if (deleteResult.status === 200) {
        // Update tracking - remove from database
        await amazonListingService.updateSingleVariationTracking(parentSku, childSku, { _id: "deleted" }, "deleted");
      }

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

  // Retry failed variations
  retryFailedVariations: async (parentSku: string, token: string): Promise<any> => {
    try {
      const currentStatus = await amazonListingService.getVariationStatus(parentSku);

      if (!currentStatus || !currentStatus.failed || currentStatus.failed.length === 0) {
        return {
          status: 200,
          message: "No failed variations to retry",
        };
      }

      const retryResults = [];
      const newSuccessful = [];
      const stillFailed = [];

      for (const failedItem of currentStatus.failed) {
        try {
          // Get the original variation data
          // const variation = await getVariationById(failedItem.variationId);
          // const retryResult = await amazonListingService.createChildListing(parentSku, variation, token);

          // For now, placeholder
          const retryResult = { status: 200, message: "Retry successful" };
          retryResults.push(retryResult);

          if (retryResult.status === 200) {
            newSuccessful.push(failedItem);
          } else {
            stillFailed.push(failedItem);
          }
        } catch (error: any) {
          stillFailed.push({
            ...failedItem,
            retryError: error.message,
          });
        }
      }

      // Update tracking with retry results
      await amazonListingService.updateRetryTracking(parentSku, newSuccessful, stillFailed);

      return {
        status: 200,
        message: "Retry completed",
        retryResults,
        newSuccessful: newSuccessful.length,
        stillFailed: stillFailed.length,
      };
    } catch (error: any) {
      console.error("Error retrying failed variations:", error);
      return {
        status: 500,
        message: "Error during retry process",
        error: error.message,
      };
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

  sendToAmazon: async (sku: string, data: any, token: string): Promise<any> => {
    // Simulate API call
    console.log(`Sending to Amazon - SKU: ${sku}`);
    return { status: 200, message: "Success", sku };
  },

  deleteFromAmazon: async (sku: string, token: string): Promise<any> => {
    // Simulate API call
    console.log(`Deleting from Amazon - SKU: ${sku}`);
    return { status: 200, message: "Deleted successfully", sku };
  },

  extractVariationData: (variations: any[]): any => {
    const variationMap: { [key: string]: Set<any> } = {};

    variations.forEach((variation) => {
      if (variation.attributes && variation.attributes.actual_attributes) {
        const actualAttributes = variation.attributes.actual_attributes;

        Object.keys(actualAttributes).forEach((attributeKey) => {
          const attributeArray = actualAttributes[attributeKey];

          if (Array.isArray(attributeArray) && attributeArray.length > 0) {
            if (!variationMap[attributeKey]) {
              variationMap[attributeKey] = new Set();
            }

            attributeArray.forEach((attr) => {
              let valueToAdd = null;

              if (attr.value !== undefined) {
                if (attr.unit) {
                  valueToAdd = `${attr.value} ${attr.unit}`;
                } else {
                  valueToAdd = attr.value;
                }
              } else if (attr.size && Array.isArray(attr.size) && attr.size.length > 0) {
                const sizeObj = attr.size[0];
                if (sizeObj.value && sizeObj.unit) {
                  valueToAdd = `${sizeObj.value} ${sizeObj.unit}`;
                }
              }

              if (valueToAdd !== null) {
                variationMap[attributeKey].add(valueToAdd);
              }
            });
          }
        });
      }
    });

    const result: { [key: string]: any[] } = {};
    Object.keys(variationMap).forEach((key) => {
      result[key] = Array.from(variationMap[key]);
    });

    return result;
  },

  determineVariationTheme: (variationData: any): string => {
    const varyingAttributes = Object.keys(variationData).filter((key) => variationData[key].length > 1);

    if (varyingAttributes.includes("memory_storage_capacity") && varyingAttributes.includes("hard_drive_size")) {
      return "MemoryHardDrive";
    } else if (varyingAttributes.includes("memory_storage_capacity")) {
      return "Memory";
    } else if (varyingAttributes.includes("hard_drive_size")) {
      return "HardDrive";
    } else if (varyingAttributes.includes("display")) {
      return "Size";
    } else if (varyingAttributes.includes("processor_description")) {
      return "ProcessorType";
    } else {
      return "SizeColor";
    }
  },

  buildVariationAttributes: (variationData: any): any => {
    const attributes: any = {};

    Object.keys(variationData).forEach((attributeKey) => {
      const values = variationData[attributeKey];

      if (values.length > 0) {
        attributes[attributeKey] = values.map((value: any) => ({
          value: value,
        }));
      }
    });

    return attributes;
  },

  buildChildVariationAttributes: (variation: any): any => {
    const attributes: any = {};

    if (variation.attributes && variation.attributes.actual_attributes) {
      const actualAttributes = variation.attributes.actual_attributes;

      Object.keys(actualAttributes).forEach((attributeKey) => {
        const attributeArray = actualAttributes[attributeKey];

        if (Array.isArray(attributeArray) && attributeArray.length > 0) {
          const attr = attributeArray[0];
          let valueToAdd = null;

          if (attr.value !== undefined) {
            if (attr.unit) {
              valueToAdd = `${attr.value} ${attr.unit}`;
            } else {
              valueToAdd = attr.value;
            }
          } else if (attr.size && Array.isArray(attr.size) && attr.size.length > 0) {
            const sizeObj = attr.size[0];
            if (sizeObj.value && sizeObj.unit) {
              valueToAdd = `${sizeObj.value} ${sizeObj.unit}`;
            }
          }

          if (valueToAdd !== null) {
            attributes[attributeKey] = [{ value: valueToAdd }];
          }
        }
      });
    }

    return attributes;
  },

  generateChildSku: (parentSku: string, variation: any): string => {
    const suffixParts: string[] = [];

    if (variation.attributes && variation.attributes.actual_attributes) {
      const actualAttributes = variation.attributes.actual_attributes;

      Object.keys(actualAttributes).forEach((attributeKey) => {
        const attributeArray = actualAttributes[attributeKey];

        if (Array.isArray(attributeArray) && attributeArray.length > 0) {
          const attr = attributeArray[0];
          let valueToAdd = null;

          if (attr.value !== undefined) {
            if (attr.unit) {
              valueToAdd = `${attr.value}${attr.unit}`;
            } else {
              valueToAdd = String(attr.value);
            }
          } else if (attr.size && Array.isArray(attr.size) && attr.size.length > 0) {
            const sizeObj = attr.size[0];
            if (sizeObj.value && sizeObj.unit) {
              valueToAdd = `${sizeObj.value}${sizeObj.unit}`;
            }
          }

          if (valueToAdd !== null) {
            const cleanValue = valueToAdd.replace(/\s+/g, "").replace(/[^a-zA-Z0-9]/g, "");
            suffixParts.push(cleanValue);
          }
        }
      });
    }

    const suffix = suffixParts.join("-");
    return suffix ? `${parentSku}-${suffix}` : `${parentSku}-var`;
  },

  getCommonAttributes: (prodTechInfo: any): any => {
    const common = { ...prodTechInfo };

    delete common.condition_type;

    const variationAttributes = [
      "memory_storage_capacity",
      "hard_drive_size",
      "processor_type",
      "graphics_card_ram_size",
      "display",
      "processor_description",
    ];

    variationAttributes.forEach((attr) => {
      delete common[attr];
    });

    return common;
  },

  createParentListing: async (populatedListing: any, token: string): Promise<any> => {
    const {
      productInfo: { sku, item_name, brand, product_description },
      prodTechInfo: { condition_type },
    } = populatedListing;

    const categoryId =
      populatedListing.productInfo.productCategory.amazonCategoryId ||
      populatedListing.productInfo.productCategory.categoryId ||
      "NOTEBOOK_COMPUTER";

    const variationData = amazonListingService.extractVariationData(populatedListing.prodPricing.selectedVariations);

    const parentData = {
      productType: categoryId,
      requirements: "LISTING",
      attributes: {
        condition_type: condition_type,
        item_name: item_name || [],
        brand: brand || [],
        product_description: product_description || [],

        child_parent_sku_relationship: [{ value: "parent" }],
        variation_theme: [{ value: amazonListingService.determineVariationTheme(variationData) }],

        ...amazonListingService.buildVariationAttributes(variationData),

        ...amazonListingService.getCommonAttributes(populatedListing.prodTechInfo),
      },
    };

    console.log("🔗 Creating parent listing:", JSON.stringify(parentData, null, 2));

    return await amazonListingService.sendToAmazon(sku, parentData, token);
  },

  createChildListing: async (populatedListing: any, variation: any, token: string): Promise<any> => {
    const {
      productInfo: { sku, item_name, brand, product_description },
      prodTechInfo: { condition_type },
    } = populatedListing;

    const categoryId =
      populatedListing.productInfo.productCategory.amazonCategoryId ||
      populatedListing.productInfo.productCategory.categoryId ||
      "NOTEBOOK_COMPUTER";

    const childSku = amazonListingService.generateChildSku(sku, variation);

    const childData = {
      productType: categoryId,
      requirements: "LISTING",
      attributes: {
        condition_type: condition_type,
        item_name: item_name || [],
        brand: brand || [],
        product_description: product_description || [],

        parent_sku: [{ value: sku }],
        child_parent_sku_relationship: [{ value: "child" }],

        ...amazonListingService.buildChildVariationAttributes(variation),

        price: [
          {
            value: variation.retailPrice || "10",
            currency: "GBP",
          },
        ],
        quantity: [{ value: variation.listingQuantity || "0" }],

        ...amazonListingService.getCommonAttributes(populatedListing.prodTechInfo),
      },
    };

    console.log("🔗 Creating child listing:", JSON.stringify(childData, null, 2));

    return await amazonListingService.sendToAmazon(childSku, childData, token);
  },
  // Send data to Amazon API
  // sendToAmazon: async (sku: string, productData: any, token: string): Promise<any> => {
  //   console.log("payload before sending to Amazon", productData);
  //   try {
  //     const response = await fetch(
  //       `${redirectUri}/listings/2021-08-01/items/${sellerId}/${sku}?marketplaceIds=${marketplaceId}`,
  //       {
  //         method: "PUT",
  //         headers: {
  //           "x-amz-access-token": token,
  //           "Content-Type": "application/json",
  //           // "x-amzn-api-sandbox-only": type === "SANDBOX" ? "true" : "false" // Use sandbox mode if type is SANDBOX
  //           "x-amzn-api-sandbox-only": "true",
  //         },
  //         body: JSON.stringify(productData),
  //       }
  //     );

  //     console.log(
  //       "url is",
  //       `${redirectUri}/listings/2021-08-01/items/${sellerId}/${sku || "ABC-123_DUMMY"}?marketplaceIds=${marketplaceId}`
  //     );

  //     const rawResponse = await response.text();
  //     // console.log("🔍 Raw response from Amazon:", rawResponse);

  //     let jsonObj: any = {};
  //     try {
  //       jsonObj = JSON.parse(rawResponse);
  //     } catch (error) {
  //       console.error("Error parsing the response as JSON:", error);
  //     }

  //     const status = jsonObj?.status;
  //     const submissionId = jsonObj?.submissionId;
  //     const issues = jsonObj?.issues;

  //     if (status === "ACCEPTED" && submissionId) {
  //       return {
  //         status: 200,
  //         statusText: "OK",
  //         sku,
  //         submissionId,
  //         response: jsonObj,
  //       };
  //     } else {
  //       return {
  //         status: 400,
  //         statusText: "Failed to create listing",
  //         errorResponse: issues || jsonObj,
  //         response: jsonObj,
  //       };
  //     }
  //   } catch (error: any) {
  //     console.error("Error sending to Amazon:", error.message);
  //     return {
  //       status: 500,
  //       message: error.message || "Error syncing with Amazon API",
  //     };
  //   }
  // },
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

  // Helper function to map Amazon error codes to human-readable messages
  getAmazonErrorMessage(errors: any[]): string {
    if (!errors || errors.length === 0) {
      return "Unknown error from Amazon";
    }

    const error = errors[0];
    switch (error.code) {
      case "InvalidInput":
        return `Invalid input: ${error.message}`;
      case "InvalidSKU":
        return `Invalid SKU: ${error.message}`;
      case "InvalidPrice":
        return `Invalid price: ${error.message}`;
      case "InvalidQuantity":
        return `Invalid quantity: ${error.message}`;
      case "InvalidProductType":
        return `Invalid product type: ${error.message}`;
      case "InvalidAttribute":
        return `Invalid attribute: ${error.message}`;
      case "MissingRequiredAttribute":
        return `Missing required attribute: ${error.message}`;
      case "DuplicateSKU":
        return `Duplicate SKU: ${error.message}`;
      case "ServiceUnavailable":
        return `Service unavailable: ${error.message}`;
      default:
        return `Amazon error occurred: ${error.message || "Unknown error"}`;
    }
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
};
