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

  // Function to create variation listing
  createVariationListing: async (populatedListing: any, token: string): Promise<any> => {
    const results = [];

    // Step 1: Create parent listing
    const parentResult = await amazonListingService.createParentListing(populatedListing, token);
    results.push(parentResult);
    console.log("parent listing creation  result", parentResult);

    if (parentResult.status !== 200) {
      return {
        status: 400,
        message: "Failed to create parent listing",
        results: results,
      };
    }

    // Step 2: Create child listings for each variation
    for (const variation of populatedListing.prodPricing.selectedVariations) {
      const childResult = await amazonListingService.createChildListing(populatedListing, variation, token);
      results.push(childResult);
    }

    return {
      status: 200,
      message: "Variation listing created successfully",
      results: results,
    };
  },

  // Create parent listing
  createParentListing: async (populatedListing: any, token: string): Promise<any> => {
    const {
      productInfo: { sku, item_name, brand, product_description },
      prodTechInfo: { condition_type },
    } = populatedListing;

    const categoryId =
      populatedListing.productInfo.productCategory.amazonCategoryId ||
      populatedListing.productInfo.productCategory.categoryId ||
      "NOTEBOOK_COMPUTER";

    // Extract unique variation values
    const variationData = amazonListingService.extractVariationData(populatedListing.prodPricing.selectedVariations);

    const parentData = {
      productType: categoryId,
      requirements: "LISTING",
      attributes: {
        condition_type: condition_type,
        item_name: item_name || [],
        brand: brand || [],
        product_description: product_description || [],

        // Parent-specific attributes
        child_parent_sku_relationship: [{ value: "parent" }],
        variation_theme: [{ value: amazonListingService.determineVariationTheme(variationData) }],

        // All possible variation values
        ...amazonListingService.buildVariationAttributes(variationData),

        // Other common attributes
        ...amazonListingService.getCommonAttributes(populatedListing.prodTechInfo),
      },
    };

    console.log("🔗 Creating parent listing:", JSON.stringify(parentData, null, 2));

    return await amazonListingService.sendToAmazon(sku, parentData, token);
  },

  // Create child listing for specific variation
  createChildListing: async (populatedListing: any, variation: any, token: string): Promise<any> => {
    const {
      productInfo: { sku, item_name, brand, product_description },
      prodTechInfo: { condition_type },
    } = populatedListing;

    const categoryId =
      populatedListing.productInfo.productCategory.amazonCategoryId ||
      populatedListing.productInfo.productCategory.categoryId ||
      "NOTEBOOK_COMPUTER";

    // Generate child SKU
    const childSku = amazonListingService.generateChildSku(sku, variation);

    const childData = {
      productType: categoryId,
      requirements: "LISTING",
      attributes: {
        condition_type: condition_type,
        item_name: item_name || [],
        brand: brand || [],
        product_description: product_description || [],

        // Child-specific attributes
        parent_sku: [{ value: sku }],
        child_parent_sku_relationship: [{ value: "child" }],

        // Specific variation values
        ...amazonListingService.buildChildVariationAttributes(variation),

        // Price and inventory
        price: [
          {
            value: variation.retailPrice || "10",
            currency: "GBP",
          },
        ],
        quantity: [{ value: variation.listingQuantity || "0" }],

        // Other common attributes
        ...amazonListingService.getCommonAttributes(populatedListing.prodTechInfo),
      },
    };

    console.log("🔗 Creating child listing:", JSON.stringify(childData, null, 2));

    return await amazonListingService.sendToAmazon(childSku, childData, token);
  },

  // Helper function to extract variation data
  extractVariationData: (variations: any[]): any => {
    const variationMap = {
      RAM: new Set(),
      ROM: new Set(),
      CPU: new Set(),
      GPU: new Set(),
    };

    variations.forEach((variation) => {
      const variationDetails = variation.variationId;
      if (variationDetails.RAM) variationMap.RAM.add(variationDetails.RAM);
      if (variationDetails.ROM) variationMap.ROM.add(variationDetails.ROM);
      if (variationDetails.CPU) variationMap.CPU.add(variationDetails.CPU);
      if (variationDetails.GPU) variationMap.GPU.add(variationDetails.GPU);
    });

    // Convert Sets to Arrays
    return {
      RAM: Array.from(variationMap.RAM),
      ROM: Array.from(variationMap.ROM),
      CPU: Array.from(variationMap.CPU),
      GPU: Array.from(variationMap.GPU),
    };
  },

  // Determine Amazon variation theme based on what varies
  determineVariationTheme: (variationData: any): string => {
    const varyingAttributes = Object.keys(variationData).filter((key) => variationData[key].length > 1);

    // Map your variation types to Amazon's themes
    if (varyingAttributes.includes("RAM") && varyingAttributes.includes("ROM")) {
      return "MemoryHardDrive";
    } else if (varyingAttributes.includes("RAM")) {
      return "Memory";
    } else if (varyingAttributes.includes("ROM")) {
      return "HardDrive";
    } else {
      return "SizeColor"; // Fallback theme
    }
  },

  // Build variation attributes for parent listing
  buildVariationAttributes: (variationData: any): any => {
    const attributes: any = {};

    if (variationData.RAM.length > 0) {
      attributes.memory_storage_capacity = variationData.RAM.map((ram: string) => ({
        value: ram,
      }));
    }

    if (variationData.ROM.length > 0) {
      attributes.hard_drive_size = variationData.ROM.map((rom: string) => ({
        value: rom,
      }));
    }

    // For CPU and GPU, you might need custom attributes or use generic ones
    if (variationData.CPU.length > 0) {
      attributes.processor_type = variationData.CPU.map((cpu: string) => ({
        value: cpu,
      }));
    }

    if (variationData.GPU.length > 0) {
      attributes.graphics_card_ram_size = variationData.GPU.map((gpu: string) => ({
        value: gpu,
      }));
    }

    return attributes;
  },

  // Build variation attributes for child listing
  buildChildVariationAttributes: (variation: any): any => {
    const attributes: any = {};
    const variationDetails = variation.variationId;

    if (variationDetails.RAM) {
      attributes.memory_storage_capacity = [{ value: variationDetails.RAM }];
    }

    if (variationDetails.ROM) {
      attributes.hard_drive_size = [{ value: variationDetails.ROM }];
    }

    if (variationDetails.CPU) {
      attributes.processor_type = [{ value: variationDetails.CPU }];
    }

    if (variationDetails.GPU) {
      attributes.graphics_card_ram_size = [{ value: variationDetails.GPU }];
    }

    return attributes;
  },

  // Generate child SKU
  generateChildSku: (parentSku: string, variation: any): string => {
    const variationDetails = variation.variationId.populate();
    const suffix = [variationDetails.RAM, variationDetails.ROM, variationDetails.CPU, variationDetails.GPU]
      .filter(Boolean)
      .join("-")
      .replace(/\s+/g, "");

    return `${parentSku}-${suffix}`;
  },

  // Get common attributes (excluding variation-specific ones)
  getCommonAttributes: (prodTechInfo: any): any => {
    const common = { ...prodTechInfo };

    // Remove attributes that are handled separately
    delete common.condition_type;
    delete common.memory_storage_capacity;
    delete common.hard_drive_size;
    delete common.processor_type;
    delete common.graphics_card_ram_size;

    return common;
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
        `${redirectUri}/listings/2021-08-01/items/${sellerId}/${sku || "ABC-123_DUMMY"}?marketplaceIds=${marketplaceId}`
      );

      const rawResponse = await response.text();
      // console.log("🔍 Raw response from Amazon:", rawResponse);

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
