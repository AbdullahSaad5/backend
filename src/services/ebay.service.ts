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
import {
  IBodyRequest,
  ICombinedRequest,
  IParamsRequest,
} from "@/contracts/request.contract";
// import { Ebay } from "@/models"; // Import the  ebay model
const baseURL = "https://api.ebay.com";
const ebayApiUrl = "https://api.ebay.com/sell/inventory/v1/inventory_item";
export const ebayService = {
  getApplicationAuthToken: async (req: Request, res: Response) => {
    try {
      const credentials = await getNormalAccessToken();
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

  async syncProductWithEbay(product: any): Promise<string> {
    const token = await getStoredEbayAccessToken();
    const ebayApiUrl = "https://api.ebay.com/sell/inventory/v1/inventory_item";

    // Extract eBay-specific details
    const ebayData = product.platformDetails?.ebay;
    if (!ebayData) throw new Error("Missing eBay product details");

    // Determine category ID based on product type
    const categoryMap: Record<string, number> = {
      "PC Laptops & Netbooks": 177,
      "PC Desktops & All-In-Ones": 179,
      Monitors: 80053,
      Projectors: 25321,
      "Wireless Access Points": 175709,
    };
    const categoryName =
      ebayData.productInfo?.productCategory.name || "PC Desktops & All-In-Ones";
    const categoryId = categoryMap[categoryName] || 179; // Default to Desktops

    // Aspect mapping based on category
    const aspects = this.getCategoryAspects(
      categoryName,
      ebayData.prodTechInfo
    );

    const requestBody = {
      product: {
        title: ebayData.productInfo?.title,
        aspects: aspects, // Dynamically assigned aspects
        description: ebayData.productInfo?.productDescription || "",
        upc: ebayData.prodTechInfo?.ean ? [ebayData.prodTechInfo.ean] : [],
        imageUrls: ebayData.prodMedia?.images.map((img: any) => img.url) || [],
      },
      categoryId: categoryId, // Hardcoded category ID
      condition: ebayData.prodPricing?.condition || "New",
      packageWeightAndSize: {
        dimensions: {
          height: ebayData.prodTechInfo?.height || "10in",
          length: ebayData.prodTechInfo?.length || "10in",
          width: ebayData.prodTechInfo?.width || "10in",
        },
        weight: ebayData.prodTechInfo?.weight || "5lb",
      },
      availability: {
        shipToLocationAvailability: {
          quantity: ebayData.prodPricing?.quantity || 1,
        },
      },
      fulfillmentTime: ebayData.prodDelivery?.fulfillmentTime || "2 days",
      shippingOptions: [
        {
          shippingCost: { value: "0.00", currency: "USD" },
          shippingServiceCode: "USPSPriorityMail",
          shipToLocations: [{ countryCode: "US" }],
          packageType: "USPSPriorityMailFlatRateBox",
        },
      ],
      listingPolicies: ebayData.prodPricing?.paymentPolicy || {},
    };

    // Check if we need to create or update the listing
    const isUpdate = product.ebayItemId ? true : false;
    const method = isUpdate ? "PUT" : "POST";
    const ebayUrl = isUpdate
      ? `${ebayApiUrl}/${product.ebayItemId}`
      : ebayApiUrl;

    const response = await axios({
      method,
      url: ebayUrl,
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      data: requestBody,
    });

    return response.data.sku;
  },

  /**
   * Returns category-specific aspects based on the product's category.
   */
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
