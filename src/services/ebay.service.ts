// import { IEbay } from "@/contracts/ebay.contract";
import { StatusCodes, ReasonPhrases } from "http-status-codes";
import { Request, Response } from "express";
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

  createProduct: async (updatedProduct: any) => {
    try {
      console.log("updatedProduct in EBAY SERVICE::", updatedProduct);

      const accessToken = await getStoredEbayAccessToken();

      const body = updatedProduct;

      const requestBody = {
        product: {
          title: body.title,
          aspects: {
            Feature: body.features,
            CPU: [body.cpu],
          },
          description: body.description,
          upc: [body.upc],
          imageUrls: body.imageUrls,
        },
        condition: body.condition,
        packageWeightAndSize: {
          dimensions: body.dimensions,
          weight: body.weight,
        },
        availability: {
          shipToLocationAvailability: {
            quantity: body.shipToLocationQuantity,
          },
        },
        fulfillmentTime: body.fulfillmentTime,
        shippingOptions: [
          {
            shippingCost: {
              value: "0.00",
              currency: "USD",
            },
            shippingServiceCode: "USPSPriorityMail",
            shipToLocations: [
              {
                countryCode: "US",
              },
            ],
            packageType: "USPSPriorityMailFlatRateBox",
          },
        ],
        listingPolicies: body.listingPolicies,
      };

      // Example API call to eBay Inventory API
      const response = await fetch(
        `${baseURL}/sell/inventory/v1/inventory_item/${body.sku}`,
        {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            Accept: "application/json",
            "Content-Type": "application/json",
            "Content-Language": "en-US",
            "Accept-Language": "en-US",
          },
          body: JSON.stringify(requestBody),
        }
      );

      if (!response.ok) {
        return res.status(response.status).json({
          status: response.status,
          statusText: response.statusText,
          message: "Failed to create item",
          body: await response.json(),
        });
      }

      return res.json({
        status: response.status,
        statusText: response.statusText,
        message: "Item created successfully",
      });
    } catch (error) {
      console.log(error);
      return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        status: StatusCodes.INTERNAL_SERVER_ERROR,
        message: ReasonPhrases.INTERNAL_SERVER_ERROR,
        error: "API call failed",
        details: error,
      });
    }
  },
  updateProduct: async (
    req: IBodyRequest<EbayControllerCreateProductRequest>,
    res: Response
  ) => {
    try {
      const accessToken = await getStoredEbayAccessToken();

      const body = req.body;

      const requestBody = {
        product: {
          title: body.title,
          aspects: {
            Feature: body.features,
            CPU: [body.cpu],
          },
          description: body.description,
          upc: [body.upc],
          imageUrls: body.imageUrls,
        },
        condition: body.condition,
        packageWeightAndSize: {
          dimensions: body.dimensions,
          weight: body.weight,
        },
        availability: {
          shipToLocationAvailability: {
            quantity: body.shipToLocationQuantity,
          },
        },
        fulfillmentTime: body.fulfillmentTime,
        shippingOptions: [
          {
            shippingCost: {
              value: "0.00",
              currency: "USD",
            },
            shippingServiceCode: "USPSPriorityMail",
            shipToLocations: [
              {
                countryCode: "US",
              },
            ],
            packageType: "USPSPriorityMailFlatRateBox",
          },
        ],
        listingPolicies: body.listingPolicies,
      };

      // Example API call to eBay Inventory API
      const response = await fetch(
        `${baseURL}/sell/inventory/v1/inventory_item/${body.sku}`,
        {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            Accept: "application/json",
            "Content-Type": "application/json",
            "Content-Language": "en-US",
            "Accept-Language": "en-US",
          },
          body: JSON.stringify(requestBody),
        }
      );

      if (!response.ok) {
        return res.status(response.status).json({
          status: response.status,
          statusText: response.statusText,
          message: "Failed to update item",
          body: await response.json(),
        });
      }

      return res.json({
        status: response.status,
        statusText: response.statusText,
        message: "Item updated successfully",
      });
    } catch (error) {
      console.log(error);
      return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        status: StatusCodes.INTERNAL_SERVER_ERROR,
        message: ReasonPhrases.INTERNAL_SERVER_ERROR,
        error: "API call failed",
        details: error,
      });
    }
  },

  async syncProductWithEbay(product: any): Promise<string> {
    const token = await getStoredEbayAccessToken();

    const requestBody = {
      product: {
        title: product.title,
        aspects: {
          Feature: product.features || [],
          CPU: [product.cpu],
        },
        description: product.description,
        upc: [product.upc],
        imageUrls: product.imageUrls,
      },
      condition: product.condition,
      packageWeightAndSize: {
        dimensions: product.dimensions,
        weight: product.weight,
      },
      availability: {
        shipToLocationAvailability: {
          quantity: product.stock,
        },
      },
      fulfillmentTime: product.fulfillmentTime,
      shippingOptions: [
        {
          shippingCost: { value: "0.00", currency: "USD" },
          shippingServiceCode: "USPSPriorityMail",
          shipToLocations: [{ countryCode: "US" }],
          packageType: "USPSPriorityMailFlatRateBox",
        },
      ],
      listingPolicies: product.listingPolicies,
    };

    // Decide if we are creating or updating a product
    const method = product.ebayItemId ? "PUT" : "POST";
    const ebayUrl = product.ebayItemId
      ? `${ebayApiUrl}/${product.sku}`
      : `${ebayApiUrl}`;

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
};

function axios(arg0: {
  method: string;
  url: string;
  headers: { Authorization: string; "Content-Type": string };
  data: {
    product: {
      title: any;
      aspects: { Feature: any; CPU: any[] };
      description: any;
      upc: any[];
      imageUrls: any;
    };
    condition: any;
    packageWeightAndSize: { dimensions: any; weight: any };
    availability: { shipToLocationAvailability: { quantity: any } };
    fulfillmentTime: any;
    shippingOptions: {
      shippingCost: { value: string; currency: string };
      shippingServiceCode: string;
      shipToLocations: { countryCode: string }[];
      packageType: string;
    }[];
    listingPolicies: any;
  };
}) {
  throw new Error("Function not implemented.");
}
