import { StatusCodes, ReasonPhrases } from "http-status-codes";
import { Request, Response } from "express";
import {
  getStoredAmazonAccessToken,
  refreshAmazonAccessToken,
  initializeAmazonCredentials,
} from "@/utils/amazon-helpers.util";
import path from "path";
import { promises as fs } from "fs";
import { Listing } from "@/models";

import { AmazonSchemaParser } from "@/utils/amazonSchemaParser.util";

const type = process.env.AMAZON_ENV === "production" ? "PRODUCTION" : "SANDBOX";

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

      const sellerId = "A21DY98JS1BBQC"; // Your seller ID
      const marketplaceId = "A1F83G8C2ARO7P"; // UK marketplace

      // Get listing details
      const response = await fetch(
        `https://sandbox.sellingpartnerapi-eu.amazon.com/listings/2021-08-01/items/${sellerId}/${sku}?marketplaceIds=${marketplaceId}&includedData=summaries,attributes,issues,offers,fulfillmentAvailability,procurement`,
        {
          method: "GET",
          headers: {
            "x-amz-access-token": token,
            "Content-Type": "application/json",
            "x-amzn-api-sandbox-only": "true", // Remove for production
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

      const sellerId = "A21DY98JS1BBQC";

      // Check submission status
      const response = await fetch(
        `https://sandbox.sellingpartnerapi-eu.amazon.com/listings/2021-08-01/submissions/${submissionId}`,
        {
          method: "GET",
          headers: {
            "x-amz-access-token": token,
            "Content-Type": "application/json",
            "x-amzn-api-sandbox-only": "true", // Remove for production
          },
        }
      );

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

      const sellerId = process.env.AMAZON_SELLER_ID || "A21DY98JS1BBQC"; // Replace with your seller ID

      const marketplaceId = process.env.AMAZON_MARKETPLACE_ID || "A1F83G8C2ARO7P"; // UK marketplace

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
      const apiUrl = `${process.env.AMAZON_API_ENDPOINT}/listings/2021-08-01/items/${sellerId}/${encodedSku}?${queryParams.toString()}`;

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
      // console.log("Populated Listing:", populatedListing);
      if (!populatedListing) {
        throw new Error("Listing not found");
      }

      const sellerId = process.env.AMAZON_SELLER_ID || "A21DY98JS1BBQC";
      const sku = populatedListing.amazonSku;
      const marketplaceId = process.env.AMAZON_MARKETPLACE_ID || "A1F83G8C2ARO7P"; // UK marketplace

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
      const apiUrl = `https://sandbox.sellingpartnerapi-eu.amazon.com/listings/2021-08-01/items/${sellerId}/${encodedSku}?${queryParams.toString()}&marketplaceIds=${marketplaceId}`;
      console.log("API URL:", apiUrl);
      const response = await fetch(apiUrl, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
          "x-amz-access-token": token,
          Accept: "application/json",
        },
      });

      // Log response details for debugging
      console.log("Response Status:", response.status);
      console.log("Response Body:", await response.text()); // Log response body

      const result = await response.json().catch((err) => {
        // If JSON parsing fails, log the raw response body
        console.error("Error parsing JSON from Amazon API response", err);
        return {};
      });

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

      const {
        productInfo: { sku, item_name, brand, product_description },
        prodTechInfo: {
          condition_type,
          color,
          model_name,
          model_number,
          generic_keyword,
          memory_storage_capacity,
          item_weight,
          item_dimensions,
          bullet_point,
          max_order_quantity,
          fulfillment_availability,
        },
        // prodPricing: { retailPrice },
        // prodDelivery: { deliveryTime },
        // prodSeo: { seoTitle, seoDescription },
        // prodMedia: { images, videos },
      } = populatedListing;
      const amzData = populatedListing;
      const marketplaceId = "A1F83G8C2ARO7P"; // Replace with your marketplace ID
      const sellerId = "A21DY98JS1BBQC"; // Replace with your seller ID
      const categoryId =
        amzData.productInfo.productCategory.amazonCategoryId ||
        amzData.productInfo.productCategory.categoryId ||
        "NOTEBOOK_COMPUTER"; // Fallback if no category is found
      console.log("categoryId is", categoryId);
      const productData = {
        productType: categoryId,
        requirements: "LISTING",
        attributes: {
          condition_type: condition_type,
          item_name: item_name || [],
          brand: brand || [],
          manufacturer: [
            {
              value: brand?.[0]?.value || "Manufacturer Not Available",
              marketplace_id: marketplaceId,
            },
          ],
          model_name: model_name || [],
          model_number: model_number || [],
          product_description: product_description || [],
          color: color || [],
          memory_storage_capacity: memory_storage_capacity || [],
          item_weight: item_weight || [],
          item_dimensions: item_dimensions || [],
          bullet_point: bullet_point || [],
          max_order_quantity: max_order_quantity || [],
          generic_keyword: generic_keyword || [],
          fulfillment_availability: fulfillment_availability || [],
        },
      };

      console.log("🔗 Preparing to create Amazon listing with data:", JSON.stringify(productData, null, 2));

      const response = await fetch(
        `https://sandbox.sellingpartnerapi-eu.amazon.com/listings/2021-08-01/items/${sellerId}/${sku}?marketplaceIds=${marketplaceId}`,
        {
          method: "PUT",
          headers: {
            "x-amz-access-token": token,
            "Content-Type": "application/json",
            "x-amzn-api-sandbox-only": "true",
          },
          body: JSON.stringify(productData),
        }
      );

      const rawResponse = await response.text(); // Read the raw response from Amazon
      console.log("🔍 Raw response from Amazon:", rawResponse);
      const jsonObj = JSON.parse(rawResponse); // Parse the raw response

      const status = jsonObj?.status;
      const submissionId = jsonObj?.submissionId;
      const issues = jsonObj?.issues;

      if (response.ok) {
        // If status is ACCEPTED, return the submissionId
        if (status === "ACCEPTED" && submissionId) {
          return {
            status: 200,
            statusText: "OK",
            sku,
            submissionId, // Return submissionId
            response: rawResponse, // Return the raw response
          };
        }
      } else {
        // If there are issues, return them in the response
        return {
          status: 400,
          statusText: "Failed to create listing",
          errorResponse: issues || jsonObj,
          response: rawResponse, // Return the raw response
        };
      }
    } catch (error: any) {
      console.error("Error adding listing on Amazon:", error.message);

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
      const sellerId = process.env.AMAZON_SELLER_ID || "A21DY98JS1BBQC"; // You'll need this from your environment
      const sku = amazonData.sku; // Make sure your listing has an SKU field
      const marketplaceId = process.env.AMAZON_MARKETPLACE_ID || "A1F83G8C2ARO7P"; // UK marketplace

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
      const apiUrl = `${process.env.AMAZON_API_ENDPOINT}/listings/2021-08-01/items/${sellerId}/${sku}?${queryParams.toString()}`;

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
      let marketplaceId = process.env.AMAZON_MARKETPLACE_ID; // Default UK here

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

      // console.log("✅ Raw Amazon product types:", responseData); // Optional debug log

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
