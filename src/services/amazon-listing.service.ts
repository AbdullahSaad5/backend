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

  getProductCategories: async (req: Request, res: Response) => {
    try {
      const token = await getStoredAmazonAccessToken();
      if (!token) {
        throw new Error("Missing or invalid Amazon access token");
      }

      const response = await getProductTypeDefinitions("LUGGAGE");
      return res.status(StatusCodes.OK).json({ status: StatusCodes.OK, message: ReasonPhrases.OK, data: response });
    } catch (error) {
      console.error("Error getting categories:", error);
      return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        status: StatusCodes.INTERNAL_SERVER_ERROR,
        message: ReasonPhrases.INTERNAL_SERVER_ERROR,
        error: "Failed to get Amazon categories",
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
      if (!token) {
        throw new Error("Missing or invalid Amazon access token");
      }

      // Get categories for the specified marketplace
      const marketplaceId = process.env.AMAZON_MARKETPLACE_ID || "A1F83G8C2ARO7P"; // Default to UK marketplace

      const response = await fetch(
        `https://sellingpartnerapi-eu.amazon.com/definitions/2020-09-01/productTypes?marketplaceIds=${marketplaceId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "x-amz-access-token": token,
            "Content-Type": "application/json",
          },
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to fetch categories: ${response.statusText}`);
      }

      const categories = await response.json();

      // Transform the response to match your application's needs
      const transformedCategories = categories.map((category: any) => ({
        id: category.categoryId,
        name: category.categoryName,
        parentId: category.parentId,
        path: category.categoryPath,
        leaf: category.isLeaf,
        attributes: category.attributes || [],
      }));

      return res.status(StatusCodes.OK).json({
        status: StatusCodes.OK,
        message: ReasonPhrases.OK,
        data: transformedCategories,
      });
    } catch (error: any) {
      console.error("Error getting Amazon categories:", error);
      return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        status: StatusCodes.INTERNAL_SERVER_ERROR,
        message: ReasonPhrases.INTERNAL_SERVER_ERROR,
        error: "Failed to get Amazon categories",
        details: error.message,
      });
    }
  },
};
