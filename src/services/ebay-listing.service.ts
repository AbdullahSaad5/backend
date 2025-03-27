// import { IEbay } from "@/contracts/ebay.contract";
import { StatusCodes, ReasonPhrases } from "http-status-codes";
import { Request, Response } from "express";
import axios from "axios";
import {
  EbayControllerCreateFulfillmentPolicyRequest,
  EbayControllerCreateLocationRequest,
  EbayControllerCreateOfferRequest,
  EbayControllerCreatePaymentPolicyRequest,
  EbayControllerCreatePolicyRequest,
  EbayControllerCreateProductRequest,
  EbayControllerCreateReturnPolicyRequest,
  EbayControllerUpdateOfferRequest,
} from "@/contracts/ebay.contract";
import {
  exchangeCodeForAccessToken,
  getEbayAuthURL,
  getNormalAccessToken,
  getStoredEbayAccessToken,
  refreshEbayAccessToken,
} from "@/utils/ebay-helpers.util";
import { IBodyRequest, ICombinedRequest, IParamsRequest } from "@/contracts/request.contract";
// import { Ebay } from "@/models"; // Import the  ebay model
const getEbayErrorMessage = function (errors: any[]): string {
  if (!errors || errors.length === 0) {
    return "Unknown error from eBay";
  }

  const error = errors[0]; // Assuming we are dealing with a single error for simplicity
  switch (error.code) {
    case "25001":
      return `System error occurred: ${error.message}`;
    case "25002":
      return `User error occurred: ${error.message}`;
    case "25003":
      return `Invalid price: ${error.message}`;
    case "25004":
      return `Invalid quantity: ${error.message}`;
    case "25005":
      return `Invalid category ID: ${error.message}`;
    case "25006":
      return `Invalid listing option: ${error.message}`;
    case "25007":
      return `Invalid Fulfillment policy: ${error.message}`;
    case "25008":
      return `Invalid Payment policy: ${error.message}`;
    case "25009":
      return `Invalid Return policy: ${error.message}`;
    case "25014":
      return `Invalid pictures: ${error.message}`;
    case "25019":
      return `Cannot revise listing: ${error.message}`;
    case "25710":
      return `Resource not found: ${error.message}`;
    default:
      return `eBay error occurred: ${error.message || "Unknown error"}`;
  }
};
export const ebayListingService = {
  getApplicationAuthToken: async (req: Request, res: Response) => {
    try {
      const credentials = await getNormalAccessToken();
      return res.status(StatusCodes.OK).json({
        status: StatusCodes.OK,
        message: ReasonPhrases.OK,
        credentials,
      });
    } catch (error) {
      // console.log(error);
      return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        status: StatusCodes.INTERNAL_SERVER_ERROR,
        message: ReasonPhrases.INTERNAL_SERVER_ERROR,
        error: "Failed to get application token",
        details: error,
      });
    }
  },

  getUserAuthorizationUrl: async (req: Request, res: Response) => {
    try {
      const authUrl = getEbayAuthURL();
      return res.status(StatusCodes.OK).json({
        status: StatusCodes.OK,
        message: ReasonPhrases.OK,
        authUrl,
      });
    } catch (error) {
      console.log(error);
      return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        status: StatusCodes.INTERNAL_SERVER_ERROR,
        message: ReasonPhrases.INTERNAL_SERVER_ERROR,
        error: "Failed to get user authorization URL",
        details: error,
      });
    }
  },

  handleAuthorizationCallback: async (req: Request, res: Response) => {
    try {
      const { code } = req.query;
      const accessToken = await exchangeCodeForAccessToken(code as string);
      return res.status(StatusCodes.OK).json({
        status: StatusCodes.OK,
        message: ReasonPhrases.OK,
        accessToken,
      });
    } catch (error) {
      console.log(error);
      return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        status: StatusCodes.INTERNAL_SERVER_ERROR,
        message: ReasonPhrases.INTERNAL_SERVER_ERROR,
        error: "Failed to exchange code for access token",
        details: error,
      });
    }
  },

  handleFallbackCallback: async (req: Request, res: Response) => {
    try {
      return res.status(StatusCodes.UNAUTHORIZED).json({
        status: StatusCodes.UNAUTHORIZED,
        message: ReasonPhrases.UNAUTHORIZED,
        error: "User denied access to eBay account",
      });
    } catch (error) {
      console.log(error);
      return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        status: StatusCodes.INTERNAL_SERVER_ERROR,
        message: ReasonPhrases.INTERNAL_SERVER_ERROR,
        error: "Failed to handle fallback callback",
        details: error,
      });
    }
  },

  handleRefreshToken: async (req: Request, res: Response) => {
    try {
      const credentials = await refreshEbayAccessToken();
      return res.status(StatusCodes.OK).json({
        status: StatusCodes.OK,
        message: ReasonPhrases.OK,
        credentials,
      });
    } catch (error) {
      console.log(error);
      return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        status: StatusCodes.INTERNAL_SERVER_ERROR,
        message: ReasonPhrases.INTERNAL_SERVER_ERROR,
        error: "Failed to get application token",
        details: error,
      });
    }
  },

  async syncListingWithEbay(listing: any): Promise<string> {
    try {
      const token = await getStoredEbayAccessToken();
      // console.log("token in sync", token)
      if (!token) {
        throw new Error("Missing or invalid eBay access token");
      }

      const ebayData = listing;
      if (!ebayData) {
        throw new Error("Missing eBay listing details");
      }

      // Use listing._id as the SKU (or replace with the correct ID field)
      const sku = listing._id?.toString();

      const ebayUrl = `https://api.ebay.com/sell/inventory/v1/inventory_item/${sku}`;
      console.log("ebayUrl", ebayUrl);

      const requestBody = {
        product: {
          title: ebayData.productInfo?.title ?? "A TEST product",
          aspects: {
            Feature: ebayData.prodTechInfo?.features ? [ebayData.prodTechInfo.features] : ["bluetooth"],
            ...(ebayData.prodTechInfo?.cpu && ebayData.prodTechInfo.cpu.trim()
              ? { CPU: [ebayData.prodTechInfo.cpu] }
              : {}),
          },
          description: ebayData.productInfo?.description
            ? ebayData.productInfo.description.replace(/[\[\]]/g, "")
            : "No description available.",
          upc: ebayData.prodTechInfo?.upc ? [ebayData.prodTechInfo.upc] : ["888462079522"],
          imageUrls: ebayData.prodMedia?.images?.map((img: any) => img.url) ?? [],
        },
        condition: "NEW",
        packageWeightAndSize: {
          dimensions: {
            height: parseFloat(ebayData.prodTechInfo?.height) || 5,
            length: parseFloat(ebayData.prodTechInfo?.length) || 10,
            width: parseFloat(ebayData.prodTechInfo?.width) || 15,
            unit: "INCH",
          },
          weight: {
            value: parseFloat(ebayData.prodTechInfo?.weight) || 2,
            unit: "POUND",
          },
        },
        availability: {
          shipToLocationAvailability: {
            quantity: parseInt(ebayData.prodPricing?.quantity) || 10,
          },
        },
        fulfillmentTime: { value: 1, unit: "BUSINESS_DAY" },
        shippingOptions: [
          {
            shippingCost: { value: "0.00", currency: "USD" },
            shippingServiceCode: "USPSPriorityMail",
            shipToLocations: [{ countryCode: "US" }],
            packageType: "USPSPriorityMailFlatRateBox",
          },
        ],
        listingPolicies: {
          fulfillmentPolicyId: "247178000010",
          paymentPolicyId: "247178015010",
          returnPolicyId: "247178019010",
        },
      };

      console.log("Final eBay Request Body:", JSON.stringify(requestBody, null, 2));

      const response = await fetch(ebayUrl, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/json",
          "Content-Type": "application/json",
          "Content-Language": "en-US",
          "Accept-Language": "en-US",
        },
        body: JSON.stringify(requestBody),
      });

      const responseText = await response.text();

      if (!responseText) {
        // If empty response is received, return success status
        return JSON.stringify({
          status: 201,
          statusText: "Created",
          message: "Item created successfully on eBay",
        });
      }

      let responseData;
      try {
        responseData = JSON.parse(responseText);
      } catch (error) {
        // Handle invalid JSON error
        throw new Error(`Invalid JSON response from eBay: ${responseText}`);
      }

      console.log("eBay API Response:", responseData);

      if (!response.ok) {
        // Handle eBay-specific error codes from the response
        const errorMessage = getEbayErrorMessage(responseData.errors);
        throw new Error(errorMessage);
      }

      return JSON.stringify({
        status: response.status,
        statusText: response.statusText,
        message: "Item created successfully on eBay",
      });
    } catch (error: any) {
      console.error("Error syncing product with eBay:", error.message);

      // If the error is related to eBay API, return a detailed error message
      return JSON.stringify({
        status: 500,
        message: error.message || "Error syncing with eBay API",
      });
    }
  },

  // Helper function to map eBay error codes to human-readable messages
  getEbayErrorMessage(errors: any[]): string {
    if (!errors || errors.length === 0) {
      return "Unknown error from eBay";
    }

    const error = errors[0]; // Assuming we are dealing with a single error for simplicity
    switch (error.code) {
      case "25001":
        return `System error occurred: ${error.message}`;
      case "25002":
        return `User error occurred: ${error.message}`;
      case "25003":
        return `Invalid price: ${error.message}`;
      case "25004":
        return `Invalid quantity: ${error.message}`;
      case "25005":
        return `Invalid category ID: ${error.message}`;
      case "25006":
        return `Invalid listing option: ${error.message}`;
      case "25007":
        return `Invalid Fulfillment policy: ${error.message}`;
      case "25008":
        return `Invalid Payment policy: ${error.message}`;
      case "25009":
        return `Invalid Return policy: ${error.message}`;
      case "25014":
        return `Invalid pictures: ${error.message}`;
      case "25019":
        return `Cannot revise listing: ${error.message}`;
      case "25710":
        return `Resource not found: ${error.message}`;
      default:
        return `eBay error occurred: ${error.message || "Unknown error"}`;
    }
  },

  getCategoryAspects(categoryName: string, prodTechInfo: any) {
    switch (categoryName) {
      case "PC Laptops & Netbooks":
        return {
          Brand: [prodTechInfo?.brand || "Unbranded"],
          Processor: [prodTechInfo?.processor || "Unknown"],
          RAM: [prodTechInfo?.ramSize || "Unknown"],
          Storage: [prodTechInfo?.storageType || "Unknown"],
        };
      case "PC Desktops & All-In-Ones":
        return {
          Brand: [prodTechInfo?.brand || "Unbranded"],
          FormFactor: [prodTechInfo?.formFactor || "Unknown"],
          GPU: [prodTechInfo?.gpu || "Unknown"],
          RAM: [prodTechInfo?.ramSize || "Unknown"],
          Storage: [prodTechInfo?.storageType || "Unknown"],
        };
      case "Monitors":
        return {
          Brand: [prodTechInfo?.brand || "Unbranded"],
          ScreenSize: [prodTechInfo?.screenSize || "Unknown"],
          Resolution: [prodTechInfo?.resolution || "Unknown"],
        };
      case "Projectors":
        return {
          Brand: [prodTechInfo?.brand || "Unbranded"],
          Lumens: [prodTechInfo?.lumens || "Unknown"],
          Resolution: [prodTechInfo?.resolution || "Unknown"],
        };
      case "Wireless Access Points":
        return {
          Brand: [prodTechInfo?.brand || "Unbranded"],
          Frequency: [prodTechInfo?.frequency || "Unknown"],
          Connectivity: [prodTechInfo?.connectivity || "Unknown"],
        };
      default:
        return {
          Brand: [prodTechInfo?.brand || "Unbranded"],
        };
    }
  },
};
