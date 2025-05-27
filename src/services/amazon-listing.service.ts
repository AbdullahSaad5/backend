import { StatusCodes, ReasonPhrases } from "http-status-codes";
import { Request, Response } from "express";
import {
  getStoredAmazonAccessToken,
  refreshAmazonAccessToken,
  initializeAmazonCredentials,
  getProductTypeDefinitions,
} from "@/utils/amazon-helpers.util";
import { Listing } from "@/models";

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

      const populatedListing: any = await Listing.findById(listing._id)
        .populate("prodPricing.selectedVariations.variationId")
        .populate("productInfo.productCategory")
        .lean();

      if (!populatedListing) {
        throw new Error("Listing not found or failed to populate");
      }

      const amazonData = populatedListing;
      const productType = amazonData.productInfo.productCategory.amazonProductType || "LUGGAGE";

      // Get product type definitions
      const productDefinitions = await getProductTypeDefinitions(productType);

      // Prepare product data
      const productData: any = {
        productType,
        requirements: "LISTING",
        attributes: {
          title: amazonData.productInfo?.title,
          bullet_point: amazonData.productInfo?.description?.split(".").slice(0, 5),
          description: amazonData.productInfo?.description,
          brand: amazonData.prodTechInfo?.brand,
          manufacturer: amazonData.prodTechInfo?.manufacturer,
          item_type: productType,
          condition_type: "New",
          standard_price: {
            amount: amazonData.prodPricing?.retailPrice,
            currency: "GBP",
          },
          quantity: amazonData.prodPricing?.listingQuantity,
          // Add more attributes based on product type
        },
      };

      // Handle variations if present
      if (amazonData.listingHasVariations) {
        productData.attributes.variations = amazonData.prodPricing?.selectedVariations?.map((variation: any) => ({
          sku: variation.variationId?.sku,
          price: variation.retailPrice,
          quantity: variation.listingQuantity,
          attributes: variation.variationId?.attributes,
        }));
      }

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
      let marketplaceId = (req.query.marketplaceId as string) || process.env.AMAZON_MARKETPLACE_ID || "A1F83G8C2ARO7P"; // Default UK here
      marketplaceId = marketplaceId.trim(); // Important: remove trailing whitespace/newlines

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
