import { StatusCodes, ReasonPhrases } from "http-status-codes";
import { Request, Response } from "express";
import {
  getStoredAmazonAccessToken,
  refreshAmazonAccessToken,
  initializeAmazonCredentials,
  getProductTypeDefinitions,
} from "@/utils/amazon-helpers.util";
import path from "path";
import { promises as fs } from "fs";
import { Listing } from "@/models";
import { parseSchemaProperties } from "@/utils/parseAmazonSchema";
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

      const spApiUrl = `https://sellingpartnerapi-eu.amazon.com/definitions/2020-09-01/productTypes/${productType}?marketplaceIds=A1F83G8C2ARO7P`;

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

  addItemOnAmazon: async (listing: any): Promise<string> => {
    try {
      const token = await getStoredAmazonAccessToken();
      if (!token) {
        throw new Error("Missing or invalid Amazon access token");
      }

      // const populatedListing: any = await Listing.findById(listing._id)
      //   .populate("prodPricing.selectedVariations.variationId")
      //   .populate("productInfo.productCategory")
      //   .lean();

      // if (!populatedListing) {
      //   throw new Error("Listing not found or failed to populate");
      // }

      // const amazonData = populatedListing;
      // const productType = amazonData.productInfo.productCategory.amazonProductType || "LUGGAGE";

      // Get product type definitions
      // const productDefinitions = await getProductTypeDefinitions(productType);

      const productData: any = {
        productType: "NOTEBOOK_COMPUTER",
        requirements: "LISTING",
        attributes: {
          condition_type: [
            {
              value: "new_new",
              marketplace_id: "A1F83G8C2ARO7P",
            },
          ],
          item_name: [
            {
              value: "Dell XPS 13 Laptop - Intel Core i7-1165G7, 16GB RAM, 512GB SSD, 13.3 FHD Display",
              language_tag: "en_GB",
              marketplace_id: "A1F83G8C2ARO7P",
            },
          ],
          brand: [
            {
              value: "Dell",
              marketplace_id: "A1F83G8C2ARO7P",
            },
          ],
          manufacturer: [
            {
              value: "Dell Inc.",
              marketplace_id: "A1F83G8C2ARO7P",
            },
          ],
          model_name: [
            {
              value: "XPS 13 9310",
              marketplace_id: "A1F83G8C2ARO7P",
            },
          ],
          model_number: [
            {
              value: "XPS13-9310-i7-16-512",
              marketplace_id: "A1F83G8C2ARO7P",
            },
          ],
          processor_brand: [
            {
              value: "Intel",
              marketplace_id: "A1F83G8C2ARO7P",
            },
          ],
          processor_type: [
            {
              value: "Core i7",
              marketplace_id: "A1F83G8C2ARO7P",
            },
          ],
          processor_speed: [
            {
              value: "2.8",
              unit: "GHz",
              marketplace_id: "A1F83G8C2ARO7P",
            },
          ],
          system_memory_size: [
            {
              value: "16",
              unit: "GB",
              marketplace_id: "A1F83G8C2ARO7P",
            },
          ],
          system_memory_type: [
            {
              value: "DDR4",
              marketplace_id: "A1F83G8C2ARO7P",
            },
          ],
          hard_drive_size: [
            {
              value: "512",
              unit: "GB",
              marketplace_id: "A1F83G8C2ARO7P",
            },
          ],
          hard_drive_interface: [
            {
              value: "SSD",
              marketplace_id: "A1F83G8C2ARO7P",
            },
          ],
          display_size: [
            {
              value: "13.3",
              unit: "inches",
              marketplace_id: "A1F83G8C2ARO7P",
            },
          ],
          display_resolution: [
            {
              value: "1920x1080",
              marketplace_id: "A1F83G8C2ARO7P",
            },
          ],
          operating_system: [
            {
              value: "Windows 11 Home",
              marketplace_id: "A1F83G8C2ARO7P",
            },
          ],
          graphics_coprocessor: [
            {
              value: "Intel Iris Xe Graphics",
              marketplace_id: "A1F83G8C2ARO7P",
            },
          ],
          connectivity_type: [
            {
              value: "Wi-Fi, Bluetooth",
              marketplace_id: "A1F83G8C2ARO7P",
            },
          ],
          item_weight: [
            {
              value: "2.64",
              unit: "pounds",
              marketplace_id: "A1F83G8C2ARO7P",
            },
          ],
          item_dimensions: [
            {
              length: {
                value: "11.64",
                unit: "inches",
              },
              width: {
                value: "7.82",
                unit: "inches",
              },
              height: {
                value: "0.58",
                unit: "inches",
              },
              marketplace_id: "A1F83G8C2ARO7P",
            },
          ],
          color: [
            {
              value: "Platinum Silver",
              marketplace_id: "A1F83G8C2ARO7P",
            },
          ],
          bullet_point: [
            {
              value: "Intel 11th Generation Core i7-1165G7 processor with Intel Iris Xe Graphics",
              marketplace_id: "A1F83G8C2ARO7P",
            },
            {
              value: "16GB LPDDR4x RAM and 512GB PCIe NVMe SSD storage",
              marketplace_id: "A1F83G8C2ARO7P",
            },
            {
              value: "13.3-inch FHD (1920x1080) InfinityEdge non-touch display",
              marketplace_id: "A1F83G8C2ARO7P",
            },
            {
              value: "Wi-Fi 6 AX1650 and Bluetooth 5.1 connectivity",
              marketplace_id: "A1F83G8C2ARO7P",
            },
            {
              value: "Windows 11 Home pre-installed with premium build quality",
              marketplace_id: "A1F83G8C2ARO7P",
            },
          ],
          generic_keyword: [
            {
              value: "laptop computer notebook ultrabook portable",
              marketplace_id: "A1F83G8C2ARO7P",
            },
          ],
          max_order_quantity: [
            {
              value: 10,
              marketplace_id: "A1F83G8C2ARO7P",
            },
          ],
          fulfillment_availability: [
            {
              fulfillment_channel_code: "DEFAULT",
              quantity: 50,
              marketplace_id: "A1F83G8C2ARO7P",
            },
          ],
        },
      };

      // Handle variations if present
      // if (amazonData.listingHasVariations) {
      //   productData.attributes.variations = amazonData.prodPricing?.selectedVariations?.map((variation: any) => ({
      //     sku: variation.variationId?.sku,
      //     price: variation.retailPrice,
      //     quantity: variation.listingQuantity,
      //     attributes: variation.variationId?.attributes,
      //   }));
      // }

      // Make API call to create listing
      const response = await fetch(`${process.env.AMAZON_API_ENDPOINT}/catalog/2022-04-01/items`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "x-amz-access-token": token,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(productData),
      });

      const result = await response.json();

      if (response.ok) {
        return JSON.stringify({
          status: 200,
          statusText: "OK",
          itemId: result.itemId,
          response: result,
        });
      } else {
        return JSON.stringify({
          status: response.status,
          statusText: "Failed to create listing",
          errorResponse: result,
        });
      }
    } catch (error: any) {
      console.error("Error adding listing on Amazon:", error.message);
      return JSON.stringify({
        status: 500,
        message: error.message || "Error syncing with Amazon API",
      });
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
      const productType = amazonData.productInfo.productCategory.amazonProductType || "LUGGAGE";

      // Prepare update data
      const updateData: any = {
        productType,
        requirements: "LISTING",
        attributes: {
          title: amazonData.productInfo?.title,
          bullet_point: amazonData.productInfo?.description?.split(".").slice(0, 5),
          description: amazonData.productInfo?.description,
          standard_price: {
            amount: amazonData.prodPricing?.retailPrice,
            currency: "GBP",
          },
          quantity: amazonData.prodPricing?.listingQuantity,
        },
      };

      // Handle variations if present
      if (amazonData.listingHasVariations) {
        updateData.attributes.variations = amazonData.prodPricing?.selectedVariations?.map((variation: any) => ({
          sku: variation.variationId?.sku,
          price: variation.retailPrice,
          quantity: variation.listingQuantity,
          attributes: variation.variationId?.attributes,
        }));
      }

      // Make API call to update listing
      const response = await fetch(
        `${process.env.AMAZON_API_ENDPOINT}/catalog/2022-04-01/items/${amazonData.amazonItemId}`,
        {
          method: "PATCH",
          headers: {
            Authorization: `Bearer ${token}`,
            "x-amz-access-token": token,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(updateData),
        }
      );

      const result = await response.json();

      if (response.ok) {
        return JSON.stringify({
          status: 200,
          statusText: "OK",
          itemId: amazonData.amazonItemId,
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
