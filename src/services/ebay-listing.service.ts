import { ebay } from "@/routes/ebay.route";
// import { IEbay } from "@/contracts/ebay.contract";
import { StatusCodes, ReasonPhrases } from "http-status-codes";
import { Request, Response } from "express";
import ebayHtmlTemplate from "@/utils/ebayHtmlTemplate.util";
import { XMLParser } from "fast-xml-parser";
import {
  exchangeCodeForAccessToken,
  getEbayAuthURL,
  getNormalAccessToken,
  getStoredEbayAccessToken,
  refreshEbayAccessToken,
} from "@/utils/ebay-helpers.util";
import { Listing } from "@/models";

const type = process.env.TYPE === "production" || process.env.TYPE === "sandbox" ? process.env.TYPE : "production";
const useClient =
  process.env.USE_CLIENT === "true" || process.env.USE_CLIENT === "false" ? process.env.USE_CLIENT : "true";
export const ebayListingService = {
  getApplicationAuthToken: async (req: Request, res: Response) => {
    try {
      // const type = req.query.type as "production" | "sandbox";
      const credentials = await getNormalAccessToken(type);
      return res.status(StatusCodes.OK).json({ status: StatusCodes.OK, message: ReasonPhrases.OK, credentials });
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
      // const type = req.query.type as "production" | "sandbox";

      const authUrl = getEbayAuthURL(type);
      return res.status(StatusCodes.OK).json({ status: StatusCodes.OK, message: ReasonPhrases.OK, authUrl });
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

      const accessToken = await exchangeCodeForAccessToken(code as string, "production", "false");
      return res.status(StatusCodes.OK).json({ status: StatusCodes.OK, message: ReasonPhrases.OK, accessToken });
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

  handleAuthorizationCallbackClient: async (req: Request, res: Response) => {
    try {
      const { code } = req.query;
      const accessToken = await exchangeCodeForAccessToken(code as string, "production", "true");
      return res.status(StatusCodes.OK).json({ status: StatusCodes.OK, message: ReasonPhrases.OK, accessToken });
    } catch (error) {
      console.log(error);
      return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        status: StatusCodes.INTERNAL_SERVER_ERROR,
        message: ReasonPhrases.INTERNAL_SERVER_ERROR,
        error: "Failed to handle authorization callback client",
        details: error,
      });
    }
  },

  handleAuthorizationCallbackSandbox: async (req: Request, res: Response) => {
    try {
      const { code } = req.query;

      const accessToken = await exchangeCodeForAccessToken(code as string, "sandbox", "false");
      return res.status(StatusCodes.OK).json({ status: StatusCodes.OK, message: ReasonPhrases.OK, accessToken });
    } catch (error) {
      console.log(error);
      return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        status: StatusCodes.INTERNAL_SERVER_ERROR,
        message: ReasonPhrases.INTERNAL_SERVER_ERROR,
        error: "Failed to handle authorization callback sandbox",
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
      // const type = req.query.type as "production" | "sandbox";
      // const useClient = req.query.useClient as "true" | "false";

      const credentials = await refreshEbayAccessToken(type, useClient);
      return res.status(StatusCodes.OK).json({ status: StatusCodes.OK, message: ReasonPhrases.OK, credentials });
    } catch (error) {
      console.log(error);
      return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        status: StatusCodes.INTERNAL_SERVER_ERROR,
        message: ReasonPhrases.INTERNAL_SERVER_ERROR,
        error: "Failed to refresh eBay access token",
        details: error,
      });
    }
  },

  getEbayCategories: async (req: Request, res: Response) => {
    try {
      // const type = req.query.type as "production" | "sandbox";
      // const useClient = req.query.useClient as "true" | "false";
      const token = await getStoredEbayAccessToken();
      if (!token) {
        throw new Error("Missing or invalid eBay access token");
      }
      const CATEGORY_ID = 3;
      const url =
        type === "production"
          ? `https://api.ebay.com/commerce/taxonomy/v1/category_tree/${CATEGORY_ID}`
          : `https://api.sandbox.ebay.com/commerce/taxonomy/v1/category_tree/${CATEGORY_ID}`;
      const response = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
      const categories = await response.json();
      return res.status(StatusCodes.OK).json({ status: StatusCodes.OK, message: ReasonPhrases.OK, data: categories });
    } catch (error) {
      console.log(error);
      return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        status: StatusCodes.INTERNAL_SERVER_ERROR,
        message: ReasonPhrases.INTERNAL_SERVER_ERROR,
        error: "Failed to get eBay categories",
      });
    }
  },

  getEbaySubCategories: async (req: Request, res: Response) => {
    try {
      const { categoryId } = req.params;
      // const type = req.query.type as "production" | "sandbox";
      // const useClient = req.query.useClient as "true" | "false";
      const token = await getStoredEbayAccessToken();
      if (!token) {
        throw new Error("Missing or invalid eBay access token");
      }

      const CATEGORY_ID = 3;
      const url =
        type === "production"
          ? `https://api.ebay.com/commerce/taxonomy/v1/category_tree/${CATEGORY_ID}/get_category_subtree?category_id=${categoryId}`
          : `https://api.sandbox.ebay.com/commerce/taxonomy/v1/category_tree/${CATEGORY_ID}/get_category_subtree?category_id=${categoryId}`;
      const response = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
      const subCategories = await response.json();
      return res
        .status(StatusCodes.OK)
        .json({ status: StatusCodes.OK, message: ReasonPhrases.OK, data: subCategories });
    } catch (error) {
      console.log(error);
      return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        status: StatusCodes.INTERNAL_SERVER_ERROR,
        message: ReasonPhrases.INTERNAL_SERVER_ERROR,
        error: "Failed to get eBay subcategories",
      });
    }
  },

  getEbayCategorySuggestions: async (req: Request, res: Response) => {
    try {
      const { query } = req.query;
      // const type = req.query.type as "production" | "sandbox";
      // const useClient = req.query.useClient as "true" | "false";
      const token = await getStoredEbayAccessToken();
      if (!token) {
        throw new Error("Missing or invalid eBay access token");
      }

      const url =
        type === "production"
          ? `https://api.ebay.com/commerce/taxonomy/v1/category_tree/0/get_category_suggestions?q=${query}`
          : `https://api.sandbox.ebay.com/commerce/taxonomy/v1/category_tree/0/get_category_suggestions?q=${query}`;
      const response = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
      const categorySuggestions = await response.json();
      return res
        .status(StatusCodes.OK)
        .json({ status: StatusCodes.OK, message: ReasonPhrases.OK, data: categorySuggestions });
    } catch (error) {
      console.log(error);
      return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        status: StatusCodes.INTERNAL_SERVER_ERROR,
        message: ReasonPhrases.INTERNAL_SERVER_ERROR,
        error: "Failed to get eBay category suggestions",
      });
    }
  },

  getShopCategories: async (req: Request, res: Response) => {
    try {
      const { query } = req.query;

      const token = await getStoredEbayAccessToken();
      if (!token) {
        throw new Error("Missing or invalid eBay access token");
      }

      const url = `https://api.ebay.com/commerce/taxonomy/v1/category_tree/0/get_category_suggestions?q=${query}`;

      const response = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
      const categorySuggestions = await response.json();
      return res
        .status(StatusCodes.OK)
        .json({ status: StatusCodes.OK, message: ReasonPhrases.OK, data: categorySuggestions });
    } catch (error) {
      console.log(error);
      return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        status: StatusCodes.INTERNAL_SERVER_ERROR,
        message: ReasonPhrases.INTERNAL_SERVER_ERROR,
        error: "Failed to get eBay category suggestions",
      });
    }
  },

  getEbayCategoryAspects: async (req: Request, res: Response) => {
    try {
      const { categoryId } = req.params;

      const token = await getStoredEbayAccessToken();
      if (!token) {
        throw new Error("Missing or invalid eBay access token");
      }

      const CATEGORY_ID = 3;

      const url =
        type === "production"
          ? `https://api.ebay.com/commerce/taxonomy/v1/category_tree/${CATEGORY_ID}/get_item_aspects_for_category?category_id=${categoryId}`
          : `https://api.sandbox.ebay.com/commerce/taxonomy/v1/category_tree/${CATEGORY_ID}/get_item_aspects_for_category?category_id=${categoryId}`;

      const response = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
      const categoryAspects = await response.json();
      return res
        .status(StatusCodes.OK)
        .json({ status: StatusCodes.OK, message: ReasonPhrases.OK, data: categoryAspects });
    } catch (error) {
      console.log(error);
      return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        status: StatusCodes.INTERNAL_SERVER_ERROR,
        message: ReasonPhrases.INTERNAL_SERVER_ERROR,
        error: "Failed to get eBay category aspects",
      });
    }
  },

  fetchEbayCategoryAspects: async (categoryId: string) => {
    try {
      const token = await getStoredEbayAccessToken();
      if (!token) throw new Error("Missing or invalid eBay access token");

      const CATEGORY_TREE_ID = 3;
      const baseUrl = type === "production" ? "https://api.ebay.com" : "https://api.sandbox.ebay.com";

      const url = `${baseUrl}/commerce/taxonomy/v1/category_tree/${CATEGORY_TREE_ID}/get_item_aspects_for_category?category_id=${categoryId}`;

      const response = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) {
        throw new Error("Failed to fetch category aspects from eBay");
      }

      return await response.json();
    } catch (error) {
      console.error("Error in fetchEbayCategoryAspects:", error);
      throw error;
    }
  },
  addItemOnEbay: async (listing: any): Promise<string> => {
    // const useClient = req.query.useClient as "true" | "false";
    const token = await getStoredEbayAccessToken();
    try {
      // const token = await getStoredEbayAccessToken();
      if (!token) {
        throw new Error("Missing or invalid eBay access token");
      }
      const populatedListing: any = await Listing.findById(listing._id)
        .populate("prodPricing.selectedVariations.variationId")
        .populate("productInfo.productCategory")
        .lean();

      if (!populatedListing) {
        throw new Error("Listing not found or failed to populate");
      }
      const ebayData = populatedListing;
      // const variationXml = ebayData.listingHasVariations ? generateVariationsXml(ebayData) : "";

      const variationXml = ebayData.listingHasVariations
        ? ebayData.listingwithStock
          ? generateVariationsXml(ebayData)
          : generateVariationsForListingWithoutStockXml(ebayData)
        : "";
      console.log("variationXml", variationXml);
      const categoryId =
        ebayData.productInfo.productCategory.ebayProductCategoryId ||
        ebayData.productInfo.productCategory.ebayPartCategoryId;
      console.log("categoryId is", categoryId);

      const retailPrice =
        ebayData?.prodPricing?.retailPrice || ebayData?.prodPricing?.selectedVariations?.[0]?.retailPrice || 10.0;
      const listingQuantity =
        ebayData?.prodPricing?.listingQuantity ||
        ebayData?.prodPricing?.selectedVariations?.[0]?.listingQuantity ||
        "10";

      console.log("listingQuantity", listingQuantity);
      const listingDescriptionData = generateListingDescription(ebayData);
      // console.log("LishtingDescription", listingDescriptionData);

      if (!ebayData) {
        throw new Error("Missing eBay listing details");
      }
      // Handle multiple image URLs dynamically
      const pictureURLs =
        ebayData.prodMedia?.images
          ?.map((image: any) => `<PictureURL>${escapeXml(image.url)}</PictureURL>`)
          .join("\n") || "<PictureURL>https://mysamplepicture.com/15.jpg</PictureURL>";

      // Use listing._id as the SKU (or replace with the correct ID field)
      // const sku = listing._id?.toString();
      const ebayUrl =
        type === "production" ? "https://api.ebay.com/ws/api.dll" : "https://api.sandbox.ebay.com/ws/api.dll";

      const listingBody = `
      <?xml version="1.0" encoding="UTF-8"?>
      <AddFixedPriceItemRequest xmlns="urn:ebay:apis:eBLBaseComponents">
        <ErrorLanguage>en_US</ErrorLanguage>
        <WarningLevel>High</WarningLevel>
        <Item>
          <Title>${escapeXml(ebayData.productInfo?.title ?? "A TEST product")}</Title>
          ${!ebayData.listingHasVariations ? `<SKU>${ebayData.productInfo?.sku || 1234344343}</SKU>` : ""}

          <Description>${escapeXml(listingDescriptionData)}</Description>
          <PrimaryCategory>
              <CategoryID>${categoryId}</CategoryID>
          </PrimaryCategory>

        <StartPrice currencyID="GBP">${retailPrice}</StartPrice>
          <CategoryMappingAllowed>true</CategoryMappingAllowed>
          <Country>GB</Country>
          <Currency>GBP</Currency>
          <DispatchTimeMax>3</DispatchTimeMax>
          <ListingDuration>GTC</ListingDuration>
          <ListingType>FixedPriceItem</ListingType>
          <PictureDetails>
          ${pictureURLs}
          </PictureDetails>
          <PostalCode>SW1A 1AA</PostalCode>
          <Quantity>${listingQuantity}</Quantity>
            <!-- Dynamic ItemSpecifics -->
              <ItemSpecifics>
              ${generateItemSpecifics(ebayData)}
              </ItemSpecifics>


          <Location>London</Location>
          <ConditionID>1000</ConditionID>
          <ReturnPolicy>
            <ReturnsAcceptedOption>ReturnsAccepted</ReturnsAcceptedOption>

            <ReturnsWithinOption>Days_30</ReturnsWithinOption>
            <ShippingCostPaidByOption>Buyer</ShippingCostPaidByOption>
          </ReturnPolicy>
          <ShippingDetails>
               <ShippingType>Flat</ShippingType>
                   <ShippingServiceOptions>
                        <ShippingServicePriority>1</ShippingServicePriority>
                        <ShippingService>UK_RoyalMailFirstClassStandard</ShippingService>
                        <ShippingServiceCost>2.50</ShippingServiceCost>
                   </ShippingServiceOptions>
          </ShippingDetails>
          <Site>UK</Site>

 ${variationXml}


        </Item>
      </AddFixedPriceItemRequest>
    `;

      console.log("Request Body for Listing Creation:", listingBody, null, 2);

      // Step 1: Create Listing on eBay
      const response = await fetch(ebayUrl, {
        method: "POST",
        headers: {
          "X-EBAY-API-SITEID": "3", // UK site ID
          "X-EBAY-API-COMPATIBILITY-LEVEL": "967",
          "X-EBAY-API-CALL-NAME": "AddFixedPriceItem",
          "X-EBAY-API-IAF-TOKEN": token,
          // "X-EBAY-API-IAF-TOKEN": newToken,
        },
        body: listingBody,
      });
      const rawResponse = await response.text(); // Read once
      const parser = new XMLParser({ ignoreAttributes: false, trimValues: true });
      const jsonObj = parser.parse(rawResponse);

      const itemId = jsonObj?.AddFixedPriceItemResponse?.ItemID;

      if (itemId) {
        const rawTitle = ebayData.productInfo?.title || "item";
        const safeTitle = rawTitle.replace(/\//g, " ").split(" ").join("-");
        const sandboxUrl =
          type === "production"
            ? `https://www.ebay.com/itm/${safeTitle}/${itemId}`
            : `https://sandbox.ebay.com/itm/${safeTitle}/${itemId}`;

        return JSON.stringify({
          status: 200,
          statusText: "OK",
          itemId,
          sandboxUrl,
          response: rawResponse, // Use the stored response
        });
      } else {
        return JSON.stringify({
          status: 400,
          statusText: "Failed to create listing",
          errorResponse: jsonObj,
          response: rawResponse, // Use the stored response
        });
      }
    } catch (error: any) {
      console.error("Error adding listinng On eBay:", error.message);

      return JSON.stringify({ status: 500, message: error.message || "Error syncing with eBay API" });
    }
  },
  reviseItemOnEbay: async (listing: any): Promise<string> => {
    try {
      //   const type = req.query.type as "production" | "sandbox";
      // const useClient = req.query.useClient as "true" | "false";
      const token = await getStoredEbayAccessToken();
      // const token = await getStoredEbayAccessToken();
      if (!token) {
        throw new Error("Missing or invalid eBay access token");
      }
      const populatedListing: any = await Listing.findById(listing._id)
        .populate("prodPricing.selectedVariations.variationId")
        .populate("productInfo.productCategory")
        .lean();

      if (!populatedListing) {
        throw new Error("Listing not found or failed to populate");
      }
      const ebayData = populatedListing;
      // const variationXml = ebayData.listingHasVariations ? generateVariationsXml(ebayData) : "";
      const variationXml = ebayData.listingHasVariations
        ? ebayData.listingwithStock
          ? generateVariationsXml(ebayData)
          : generateVariationsForListingWithoutStockXml(ebayData)
        : "";
      console.log("variationXml", variationXml);

      const categoryId =
        ebayData.productInfo.productCategory.ebayProductCategoryId ||
        ebayData.productInfo.productCategory.ebayPartCategoryId;
      console.log("categoryId is", categoryId);

      const retailPrice =
        ebayData?.prodPricing?.retailPrice || ebayData?.prodPricing?.selectedVariations?.[0]?.retailPrice || 10.0;
      const listingQuantity =
        ebayData?.prodPricing?.listingQuantity ||
        ebayData?.prodPricing?.selectedVariations?.[0]?.listingQuantity ||
        "10";

      console.log("retailPrice", retailPrice);

      const listingDescriptionData = generateListingDescription(ebayData);
      // console.log("LishtingDescription", listingDescriptionData);

      if (!ebayData) {
        throw new Error("Missing eBay listing details");
      }
      // Handle multiple image URLs dynamically
      const pictureURLs =
        ebayData.prodMedia?.images
          ?.map((image: any) => `<PictureURL>${escapeXml(image.url)}</PictureURL>`)
          .join("\n") || "<PictureURL>https://mysamplepicture.com/15.jpg</PictureURL>";

      // Use listing._id as the SKU (or replace with the correct ID field)
      // const sku = listing._id?.toString();
      const ebayUrl =
        type === "production" ? "https://api.ebay.com/ws/api.dll" : "https://api.sandbox.ebay.com/ws/api.dll";

      const listingBody = `
      <?xml version="1.0" encoding="utf-8"?>
      <ReviseFixedPriceItemRequest xmlns="urn:ebay:apis:eBLBaseComponents">
        <ErrorLanguage>en_US</ErrorLanguage>
        <WarningLevel>High</WarningLevel>
        <Item>
        <ItemID>${ebayData.ebayItemId}</ItemID>
          <Title>${escapeXml(ebayData.productInfo?.title ?? "A TEST product")}</Title>
          ${!ebayData.listingHasVariations ? `<SKU>${ebayData.productInfo?.sku || 1234344343}</SKU>` : ""}


          <Description>${"atest desc for now"}</Description>
          <PrimaryCategory>
            <CategoryID>${categoryId}</CategoryID>
          </PrimaryCategory>
        <StartPrice currencyID="GBP">${retailPrice}</StartPrice>
          <CategoryMappingAllowed>true</CategoryMappingAllowed>
          <Country>GB</Country>
          <Currency>GBP</Currency>
          <DispatchTimeMax>3</DispatchTimeMax>
          <ListingDuration>GTC</ListingDuration>
          <ListingType>FixedPriceItem</ListingType>
          <PictureDetails>
          ${pictureURLs}
          </PictureDetails>
          <PostalCode>SW1A 1AA</PostalCode>
          <Quantity>${listingQuantity}</Quantity>
            <!-- Dynamic ItemSpecifics -->
             <ItemSpecifics>
              ${generateItemSpecifics(ebayData)}

             </ItemSpecifics>
          <Location>London</Location>
          <ConditionID>1000</ConditionID>
               ${variationXml}
          <Site>UK</Site>
        </Item>
      </ReviseFixedPriceItemRequest>
    `;

      console.log("Request Body for revise Listing:", listingBody, null, 2);

      // Step 1: Create Listing on eBay
      const response = await fetch(ebayUrl, {
        method: "POST",
        headers: {
          "X-EBAY-API-SITEID": "3", // UK site ID
          "X-EBAY-API-COMPATIBILITY-LEVEL": "967",
          "X-EBAY-API-CALL-NAME": "ReviseFixedPriceItem",
          // "X-EBAY-API-IAF-TOKEN": token,
          "X-EBAY-API-IAF-TOKEN": token,
        },
        body: listingBody,
      });
      const rawResponse = await response.text();

      const parser = new XMLParser({ ignoreAttributes: false, trimValues: true });
      const jsonObj = parser.parse(rawResponse);

      const itemId =
        jsonObj?.ReviseItemResponse?.ItemID ||
        jsonObj?.ReviseFixedPriceItemResponse?.Ack == "Success" ||
        jsonObj?.ReviseFixedPriceItemResponse?.Ack == "Warning";

      if (itemId) {
        return JSON.stringify({ status: 200, statusText: "OK", itemId });
      } else {
        return JSON.stringify({ status: 400, statusText: "Failed to update listing on Ebay", response: jsonObj });
      }
    } catch (error: any) {
      console.error("Error updatnng listinng On eBay:", error.message);

      return JSON.stringify({ status: 500, message: error.message || "Error updating/revising eBay API" });
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
      case "Neetwork Equipments":
        return {
          Brand: [prodTechInfo?.brand || "Unbranded"],
          Frequency: [prodTechInfo?.frequency || "Unknown"],
          Connectivity: [prodTechInfo?.connectivity || "Unknown"],
        };
      default:
        return { Brand: [prodTechInfo?.brand || "Unbranded"] };
    }
  },

  getOrders: async (req: Request, res: Response): Promise<any> => {
    try {
      const credentials = await getStoredEbayAccessToken();
      // const ebayUrl = "https://api.sandbox.ebay.com/ws/api.dll";
      const ebayUrl =
        type === "production" ? "https://api.ebay.com/ws/api.dll" : "https://api.sandbox.ebay.com/ws/api.dll";
      const currentDate = Date.now();
      const startDate = currentDate;
      // 90 days ago
      const endDate = currentDate - 90 * 24 * 60 * 60 * 1000;
      const formattedStartDate = new Date(startDate).toISOString();
      const formattedEndDate = new Date(endDate).toISOString();

      // console.log("formattedStartDate", formattedStartDate);
      // console.log("formattedEndDate", formattedEndDate);

      const response = await fetch(ebayUrl, {
        method: "POST",
        headers: {
          "X-EBAY-API-SITEID": "3", // UK site ID
          "X-EBAY-API-COMPATIBILITY-LEVEL": "967",
          "X-EBAY-API-CALL-NAME": "GetOrders",
          "X-EBAY-API-IAF-TOKEN": credentials?.access_token || "",
        },
        body: `
        <?xml version="1.0" encoding="utf-8"?>
        <GetOrdersRequest xmlns="urn:ebay:apis:eBLBaseComponents">
          <ErrorLanguage>en_US</ErrorLanguage>
          <WarningLevel>High</WarningLevel>
          <CreateTimeFrom>${formattedEndDate}</CreateTimeFrom >
          <CreateTimeTo>${formattedStartDate}</CreateTimeTo>
          <OrderRole>Seller</OrderRole>
          <OrderStatus>Active</OrderStatus>
        </GetOrdersRequest>
        `,
      });
      const rawResponse = await response.text();
      const parser = new XMLParser({ ignoreAttributes: false, trimValues: true });
      const jsonObj = parser.parse(rawResponse);
      // console.log("jsonObj", jsonObj);
      return res.status(StatusCodes.OK).json({ status: StatusCodes.OK, message: ReasonPhrases.OK, data: jsonObj });
    } catch (error: any) {
      console.error("Error fetching orders:", error.message);
      throw new Error("Error fetching orders");
    }
  },
};
const generateListingDescription = (ebayData: any) => {
  const defaultData = {
    title: ebayData?.productInfo?.title ?? "A TEST product",
    description: ebayData?.productInfo?.description ?? "No description available.",
    imageUrls: ebayData?.prodMedia?.images?.map((img: any) => img.url) ?? [],
    retailPrice:
      (ebayData?.prodPricing?.retailPrice || ebayData?.prodPricing?.selectedVariations?.[0]?.retailPrice) ?? 10.0,
  };

  // Get raw attributes (prodTechInfo)
  // const rawAttributes = ebayData?.prodTechInfo ?? {};
  const rawAttributes =
    ebayData?.prodTechInfo?.toObject?.() || JSON.parse(JSON.stringify(ebayData?.prodTechInfo || {}));
  // console.log("Raw Attributes:", rawAttributes);

  // Build dynamic attributes
  const dynamicAttributes: Record<string, string> = {};
  if (rawAttributes instanceof Map) {
    for (const [key, value] of rawAttributes.entries()) {
      if (Array.isArray(value) && value.length > 0) {
        dynamicAttributes[key] = value.join(", ");
      } else if (typeof value === "string" && value.trim() !== "") {
        dynamicAttributes[key] = value.trim();
      }
    }
  } else if (typeof rawAttributes === "object" && rawAttributes !== null) {
    for (const [key, value] of Object.entries(rawAttributes)) {
      if (Array.isArray(value) && value.length > 0) {
        dynamicAttributes[key] = value.join(", ");
      } else if (typeof value === "string" && value.trim() !== "") {
        dynamicAttributes[key] = value.trim();
      }
    }
  }

  // console.log("Dynamic Attributes Received:", dynamicAttributes);

  // Format for template
  const attributeList = Object.entries(dynamicAttributes).map(([key, value]) => ({
    name: key,
    value,
  }));

  return ebayHtmlTemplate({
    ...defaultData,
    attributes: attributeList,
  });
};

function generateItemSpecifics(
  ebayData: any,
  forceInclude: Record<string, string[]> = {
    productInfo: ["Brand"],
  },
  exclude: Record<string, string[]> = {
    productInfo: ["ProductCategory", "Title", "Description", "Sku"],
  }
) {
  const itemSpecifics = [];

  // ✅ Step 1: Choose correct variation source
  const variations = ebayData?.listingWithStock
    ? ebayData?.prodPricing?.selectedVariations || []
    : ebayData?.prodPricing?.listingWithoutStockVariations || [];

  // ✅ Step 2: Extract variation attribute names (case-insensitive)
  const variationAttributeNames = new Set<string>();

  variations.forEach((variation: any) => {
    if (ebayData?.listingWithStock) {
      // Stock variation: read from variationId.attributes
      const attributes = variation?.variationId?.attributes || {};
      Object.keys(attributes).forEach((key) => variationAttributeNames.add(key.toLowerCase()));
    } else {
      // Non-stock variation: dynamic keys (exclude known static fields)
      const { retailPrice, listingQuantity, discountValue, images, ...dynamicAttrs } = variation || {};

      Object.keys(dynamicAttrs).forEach((key) => variationAttributeNames.add(key.toLowerCase()));
    }
  });

  // ✅ Step 3: Define sections to extract from
  const sections = ["prodTechInfo", "productInfo"];

  for (const section of sections) {
    const data = ebayData[section];
    if (!data || typeof data !== "object") continue;

    const sectionForceInclude = (forceInclude[section] || []).map((k) => k.toLowerCase());
    const sectionExclude = (exclude[section] || []).map((k) => k.toLowerCase());

    for (const [key, value] of Object.entries(data)) {
      const lowerKey = key.toLowerCase();
      const formattedKey = key.charAt(0).toUpperCase() + key.slice(1);

      const isVariationAttr = variationAttributeNames.has(lowerKey);
      const isForced = sectionForceInclude.includes(lowerKey);
      const isExcluded = sectionExclude.includes(lowerKey);

      if (isVariationAttr && !isForced) {
        console.log(`⛔ Skipped (in variation): ${formattedKey}`);
        continue;
      }

      if (isExcluded) {
        console.log(`⛔ Excluded: ${formattedKey}`);
        continue;
      }

      if (value != null) {
        let finalValue = value;

        if (Array.isArray(value)) {
          finalValue = value.join(", ");
        }

        if (typeof finalValue === "string" && finalValue.trim() === "") continue;

        itemSpecifics.push(`
          <NameValueList>
            <Name>${formattedKey}</Name>
            <Value>${finalValue}</Value>
          </NameValueList>
        `);
      }
    }
  }

  return itemSpecifics.join("");
}

function escapeXml(unsafe: any): string {
  if (unsafe == null) return "";
  return String(unsafe)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function generateVariationsXml(ebayData: any): string {
  // console.log("im in variation xml");
  const variations = ebayData?.prodPricing?.selectedVariations || [];
  if (!variations.length) return "";

  const variationSpecificsSet: { [key: string]: Set<string> } = {};
  const picturesByAttribute: { [value: string]: string[] } = {};
  const pictureAttributeName = "ramSize"; // or set dynamically if needed

  const usedKeys = new Set<string>();
  const seenCombinations = new Set<string>();

  const variationNodes = variations.reduce((acc: string[], variation: any) => {
    // ✅ Only include variations with enableEbayListing === true
    // if (!variation?.enableEbayListing) return acc;

    const attrObj = variation?.variationId?.attributes || {};

    // Keep only allowed 5 keys
    Object.keys(attrObj).forEach((key) => {
      if (!usedKeys.has(key) && usedKeys.size < 5) {
        usedKeys.add(key);
      }
    });

    const filteredAttrObj = Object.entries(attrObj).reduce(
      (acc2, [key, value]: any) => {
        if (usedKeys.has(key)) acc2[key] = value;
        return acc2;
      },
      {} as Record<string, string>
    );
    // Serialize combination to string
    const comboKey = JSON.stringify(filteredAttrObj);
    if (seenCombinations.has(comboKey)) return acc;

    seenCombinations.add(comboKey);

    const nameValueXml = Object.entries(filteredAttrObj)
      .map(([key, value]) => {
        if (!variationSpecificsSet[key]) variationSpecificsSet[key] = new Set();
        variationSpecificsSet[key].add(value);
        return `<NameValueList><Name>${escapeXml(key)}</Name><Value>${escapeXml(value)}</Value></NameValueList>`;
      })
      .join("");

    acc.push(`
      <Variation>
        <SKU>VARIATION-${acc.length + 1}</SKU>
        <StartPrice>${variation.retailPrice}</StartPrice>
        <Quantity>${variation.listingQuantity}</Quantity>
        <VariationSpecifics>
          ${nameValueXml}
        </VariationSpecifics>
      </Variation>
    `);
    return acc;
  }, []);
  // Build <VariationSpecificsSet>
  const specificsXml = Object.entries(variationSpecificsSet)
    .map(([name, values]) => {
      const valueXml = Array.from(values)
        .map((v) => `<Value>${escapeXml(v)}</Value>`)
        .join("");
      return `<NameValueList><Name>${escapeXml(name)}</Name>${valueXml}</NameValueList>`;
    })
    .join("");
  // Pictures block
  const picturesXml = Object.keys(picturesByAttribute).length
    ? `<Pictures>
        <VariationSpecificName>${escapeXml(pictureAttributeName)}</VariationSpecificName>
        ${Object.entries(picturesByAttribute)
          .map(
            ([value, urls]) => `
          <VariationSpecificPictureSet>
            <VariationSpecificValue>${escapeXml(value)}</VariationSpecificValue>
            ${urls.map((url) => `<PictureURL>${escapeXml(url)}</PictureURL>`).join("")}
          </VariationSpecificPictureSet>`
          )
          .join("\n")}
      </Pictures>`
    : "";

  return `
    <Variations>
      <VariationSpecificsSet>
        ${specificsXml}
      </VariationSpecificsSet>
      ${variationNodes.join("\n")}
      ${picturesXml}
    </Variations>`;
}

function generateVariationsForListingWithoutStockXml(ebayData: any): string {
  const variations = ebayData?.prodPricing?.listingWithoutStockVariations || [];
  if (!variations.length) return "";

  const variationSpecificsSet: { [key: string]: Set<string> } = {};
  const picturesByAttribute: { [value: string]: string[] } = {};
  const pictureAttributeName = "Model"; // You can change this if needed

  const usedKeys = new Set<string>();
  const seenCombinations = new Set<string>();

  const staticKeys = new Set([
    "retailPrice",
    "listingQuantity",
    "discountValue",
    "images",
    "_id",
    "price",
    "quantity", // explicitly skip
  ]);

  const variationNodes = variations.reduce((acc: string[], variation: any) => {
    if (variation.listingQuantity <= 0) return acc; // skip zero quantity

    const attrObj: Record<string, string> = {};
    for (const key in variation) {
      if (!staticKeys.has(key)) {
        attrObj[key] = variation[key];
      }
    }

    Object.keys(attrObj).forEach((key) => {
      if (!usedKeys.has(key) && usedKeys.size < 5) {
        usedKeys.add(key);
      }
    });

    const filteredAttrObj = Object.entries(attrObj).reduce(
      (acc2, [key, value]) => {
        if (usedKeys.has(key)) acc2[key] = value;
        return acc2;
      },
      {} as Record<string, string>
    );

    const comboKey = JSON.stringify(filteredAttrObj);
    if (seenCombinations.has(comboKey)) return acc;
    seenCombinations.add(comboKey);

    const nameValueXml = Object.entries(filteredAttrObj)
      .map(([key, value]) => {
        if (!variationSpecificsSet[key]) variationSpecificsSet[key] = new Set();
        variationSpecificsSet[key].add(value);
        return `<NameValueList><Name>${escapeXml(key)}</Name><Value>${escapeXml(value)}</Value></NameValueList>`;
      })
      .join("");

    acc.push(`
      <Variation>
        <SKU>VARIATION-${acc.length + 1}</SKU>
        <StartPrice>${variation.retailPrice}</StartPrice>
        <Quantity>${variation.listingQuantity}</Quantity>
        <VariationSpecifics>
          ${nameValueXml}
        </VariationSpecifics>
      </Variation>
    `);
    return acc;
  }, []);

  if (!variationNodes.length) return ""; // All variations were skipped

  const specificsXml = Object.entries(variationSpecificsSet)
    .map(([name, values]) => {
      const valueXml = Array.from(values)
        .map((v) => `<Value>${escapeXml(v)}</Value>`)
        .join("");
      return `<NameValueList><Name>${escapeXml(name)}</Name>${valueXml}</NameValueList>`;
    })
    .join("");

  const picturesXml = Object.keys(picturesByAttribute).length
    ? `<Pictures>
        <VariationSpecificName>${escapeXml(pictureAttributeName)}</VariationSpecificName>
        ${Object.entries(picturesByAttribute)
          .map(
            ([value, urls]) => `
          <VariationSpecificPictureSet>
            <VariationSpecificValue>${escapeXml(value)}</VariationSpecificValue>
            ${urls.map((url) => `<PictureURL>${escapeXml(url)}</PictureURL>`).join("")}
          </VariationSpecificPictureSet>`
          )
          .join("\n")}
      </Pictures>`
    : "";

  return `
    <Variations>
      <VariationSpecificsSet>
        ${specificsXml}
      </VariationSpecificsSet>
      ${variationNodes.join("\n")}
      ${picturesXml}
    </Variations>`;
}
