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
export const newToken =
  "v^1.1#i^1#r^0#I^3#f^0#p^3#t^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";
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

  getEbayCategories: async (req: Request, res: Response) => {
    try {
      const token = await getStoredEbayAccessToken();
      if (!token) {
        throw new Error("Missing or invalid eBay access token");
      }
      const CATEGORY_ID = 3;
      const url = `https://api.ebay.com/commerce/taxonomy/v1/category_tree/${CATEGORY_ID}`;
      const response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const categories = await response.json();
      return res.status(StatusCodes.OK).json({
        status: StatusCodes.OK,
        message: ReasonPhrases.OK,
        data: categories,
      });
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
      const token = await getStoredEbayAccessToken();
      if (!token) {
        throw new Error("Missing or invalid eBay access token");
      }

      const CATEGORY_ID = 3;
      const url = `https://api.ebay.com/commerce/taxonomy/v1/category_tree/${CATEGORY_ID}/get_category_subtree?category_id=${categoryId}`;
      const response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const subCategories = await response.json();
      return res.status(StatusCodes.OK).json({
        status: StatusCodes.OK,
        message: ReasonPhrases.OK,
        data: subCategories,
      });
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
      const token = await getStoredEbayAccessToken();
      if (!token) {
        throw new Error("Missing or invalid eBay access token");
      }

      const url = `https://api.ebay.com/commerce/taxonomy/v1/category_tree/0/get_category_suggestions?q=${query}`;
      const response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const categorySuggestions = await response.json();
      return res.status(StatusCodes.OK).json({
        status: StatusCodes.OK,
        message: ReasonPhrases.OK,
        data: categorySuggestions,
      });
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

      const url = `https://api.ebay.com/commerce/taxonomy/v1/category_tree/${CATEGORY_ID}/get_item_aspects_for_category?category_id=${categoryId}`;
      const response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const categoryAspects = await response.json();
      return res.status(StatusCodes.OK).json({
        status: StatusCodes.OK,
        message: ReasonPhrases.OK,
        data: categoryAspects,
      });
    } catch (error) {
      console.log(error);
      return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        status: StatusCodes.INTERNAL_SERVER_ERROR,
        message: ReasonPhrases.INTERNAL_SERVER_ERROR,
        error: "Failed to get eBay category aspects",
      });
    }
  },

  addItemOnEbay: async (listing: any): Promise<string> => {
    try {
      // const token = await getStoredEbayAccessToken();
      if (!newToken) {
        throw new Error("Missing or invalid eBay access token");
      }
      const populatedListing: any = await Listing.findById(listing._id)
        .populate("prodPricing.selectedVariations.variationId")
        .lean();

      if (!populatedListing) {
        throw new Error("Listing not found or failed to populate");
      }
      const ebayData = populatedListing;
      const variationXml = ebayData.listingHasVariations ? generateVariationsXml(ebayData) : "";

      const retailPrice =
        ebayData?.prodPricing?.retailPrice ?? ebayData?.prodPricing?.selectedVariations?.[0]?.retailPrice ?? 10.0;

      const listingQuantity =
        ebayData?.prodPricing?.listingQuantity ?? ebayData?.prodPricing?.selectedVariations?.[0]?.listingQuantity ?? 10;

      console.log("retailPrice", retailPrice);
      const listingDescriptionData = generateListingDescription(ebayData);
      if (!ebayData) {
        throw new Error("Missing eBay listing details");
      }
      // Handle multiple image URLs dynamically
      const pictureURLs =
        ebayData.prodMedia?.images
          ?.map((image: any) => `<PictureURL>${escapeXml(image.url)}</PictureURL>`)
          .join("\n") || "<PictureURL>https://mysamplepicture.com/15.jpg</PictureURL>";
      let categoryId;

      switch (listing.kind) {
        case "listing_laptops":
          categoryId = 177;
          break;
        case "listing_all_in_one_pc":
          categoryId = 179;
          break;
        case "listing_projectors":
          categoryId = 25321;
          break;
        case "listing_monitors":
          categoryId = 80053;
          break;
        case "listing_gaming_pc":
          categoryId = 179;
          break;
        case "listing_network_equipments":
          categoryId = 175709;
          break;
        default:
          categoryId = 177;
      }
      // Use listing._id as the SKU (or replace with the correct ID field)
      // const sku = listing._id?.toString();
      const ebayUrl = "https://api.sandbox.ebay.com/ws/api.dll";

      const listingBody = `
      <?xml version="1.0" encoding="UTF-8"?>
      <AddFixedPriceItemRequest xmlns="urn:ebay:apis:eBLBaseComponents">
        <ErrorLanguage>en_US</ErrorLanguage>
        <WarningLevel>High</WarningLevel>
        <Item>
          <Title>${escapeXml(ebayData.productInfo?.title ?? "A TEST product")}</Title>
          <Description>test descripption for now to tesst the variation thing correctly, if it works then we will move forward</Description>
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
          // "X-EBAY-API-IAF-TOKEN": token,
          "X-EBAY-API-IAF-TOKEN": newToken,
        },
        body: listingBody,
      });
      const rawResponse = await response.text();

      const parser = new XMLParser({
        ignoreAttributes: false,
        trimValues: true,
      });
      const jsonObj = parser.parse(rawResponse);

      const itemId = jsonObj?.AddFixedPriceItemResponse?.ItemID;

      if (itemId) {
        const rawTitle = ebayData.productInfo?.title || "item";
        const safeTitle = rawTitle.replace(/\//g, " ").split(" ").join("-");
        const sandboxUrl = `https://sandbox.ebay.com/itm/${safeTitle}/${itemId}`;

        return JSON.stringify({
          status: 200,
          statusText: "OK",
          itemId,
          sandboxUrl,
          response: response,
        });
      } else {
        return JSON.stringify({
          status: 400,
          statusText: "Failed to create listing",
          errorResponse: jsonObj,
          response: await response.text(),
        });
      }
    } catch (error: any) {
      console.error("Error adding listinng On eBay:", error.message);

      return JSON.stringify({
        status: 500,
        message: error.message || "Error syncing with eBay API",
      });
    }
  },
  reviseItemOnEbay: async (listing: any): Promise<string> => {
    try {
      // const token = await getStoredEbayAccessToken();
      if (!newToken) {
        throw new Error("Missing or invalid eBay access token");
      }

      const ebayData = listing;
      const variationXml = ebayData.listingHasVariations ? generateVariationsXml(ebayData) : "";
      const retailPrice =
        ebayData?.prodPricing?.retailPrice ?? ebayData?.prodPricing?.selectedVariations?.[0]?.retailPrice ?? 10.0;

      const listingQuantity =
        ebayData?.prodPricing?.listingQuantity ?? ebayData?.prodPricing?.selectedVariations?.[0]?.listingQuantity ?? 10;

      console.log("retailPrice", retailPrice);

      const listingDescriptionData = generateListingDescription(ebayData);
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
      const ebayUrl = "https://api.sandbox.ebay.com/ws/api.dll";

      const listingBody = `
      <?xml version="1.0" encoding="utf-8"?>
<ReviseItemRequest xmlns="urn:ebay:apis:eBLBaseComponents">
        <ErrorLanguage>en_US</ErrorLanguage>
        <WarningLevel>High</WarningLevel>
        <Item>
        <ItemID>${ebayData.ebayItemId}</ItemID>
          <Title>${escapeXml(ebayData.productInfo?.title ?? "A TEST product")}</Title>
          <Description>test descripption for now to tesst the variation thing correctly, if it works then we will move forward</Description>
          <PrimaryCategory>
            <CategoryID>${ebayData.categoryId}</CategoryID>
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
      </ReviseItemRequest>
    `;

      console.log("Request Body for revise Listing:", listingBody, null, 2);

      // Step 1: Create Listing on eBay
      const response = await fetch(ebayUrl, {
        method: "POST",
        headers: {
          "X-EBAY-API-SITEID": "3", // UK site ID
          "X-EBAY-API-COMPATIBILITY-LEVEL": "967",
          "X-EBAY-API-CALL-NAME": "ReviseItem",
          // "X-EBAY-API-IAF-TOKEN": token,
          "X-EBAY-API-IAF-TOKEN": newToken,
        },
        body: listingBody,
      });
      const rawResponse = await response.text();

      const parser = new XMLParser({
        ignoreAttributes: false,
        trimValues: true,
      });
      const jsonObj = parser.parse(rawResponse);

      const itemId = jsonObj?.AddFixedPriceItemResponse?.ItemID;

      if (itemId) {
        const itemTitle = ebayData.productInfo?.title?.split(" ").join("-") || "item";
        const sandboxUrl = `https://sandbox.ebay.com/itm/${itemTitle}/${itemId}`;

        return JSON.stringify({
          status: 200,
          statusText: "OK",
          itemId,
          sandboxUrl,
        });
      } else {
        return JSON.stringify({
          status: 400,
          statusText: "Failed to update listing on Ebay",
          response: jsonObj,
        });
      }
    } catch (error: any) {
      console.error("Error updatnng listinng On eBay:", error.message);

      return JSON.stringify({
        status: 500,
        message: error.message || "Error updating/revising eBay API",
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
      case "Neetwork Equipments":
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
function generateListingDescription(ebayData: any) {
  return ebayHtmlTemplate({
    title: ebayData.productInfo?.title ?? "A TEST product",
    brand: ebayData.productInfo?.brand || "LENOVO",
    processor: ebayData.prodTechInfo?.processor || "Core I9",
    ram: ebayData.prodTechInfo?.ramSize || "16 GB",
    storage: ebayData.prodTechInfo?.storageType || "SSD",
    formFactor: ebayData.prodTechInfo?.formFactor || "Unknown",
    gpu: ebayData.prodTechInfo?.gpu || "Nvidia RTX 3060",
    screenSize: ebayData.prodTechInfo?.screenSize || "Unknown",
    resolution: ebayData.prodTechInfo?.resolution || "Unknown",
    frequency: ebayData.prodTechInfo?.frequency || "Unknown",
    connectivity: ebayData.prodTechInfo?.connectivity || "Unknown",
    description: ebayData.productInfo?.description || "No description available.",
    imageUrls: ebayData.prodMedia?.images?.map((img: any) => img.url) ?? [],
    weightUnit: "POUND",
    ean: ebayData.prodTechInfo?.ean,
    mpn: ebayData.prodTechInfo?.mpn,
    upc: ebayData.prodTechInfo?.upc,
    model: ebayData.prodTechInfo?.model,
    operatingSystem: ebayData.prodTechInfo?.operatingSystem,
    storageType: ebayData.prodTechInfo?.storageType,
    features: ebayData.prodTechInfo?.features,
    ssdCapacity: ebayData.prodTechInfo?.ssdCapacity,
    type: ebayData.prodTechInfo?.type,
    releaseYear: ebayData.prodTechInfo?.releaseYear,
    hardDriveCapacity: ebayData.prodTechInfo?.hardDriveCapacity,
    color: ebayData.prodTechInfo?.color,
    maxResolution: ebayData.prodTechInfo?.maxResolution,
    mostSuitableFor: ebayData.prodTechInfo?.mostSuitableFor,
    graphicsProcessingType: ebayData.prodTechInfo?.graphicsProcessingType,
    motherboardModel: ebayData.prodTechInfo?.motherboardModel,
    series: ebayData.prodTechInfo?.series,
    operatingSystemEdition: ebayData.prodTechInfo?.operatingSystemEdition,
    memory: ebayData.prodTechInfo?.memory,
    maxRamCapacity: ebayData.prodTechInfo?.maxRamCapacity,
    unitType: ebayData.prodTechInfo?.unitType,
    unitQuantity: ebayData.prodTechInfo?.unitQuantity,
    processorSpeed: ebayData.prodTechInfo?.processorSpeed,
    ramSize: ebayData.prodTechInfo?.ramSize,
    productType: ebayData.prodTechInfo?.productType,
    manufacturerWarranty: ebayData.prodPricing?.manufacturerWarranty,
    regionOfManufacture: ebayData.prodTechInfo?.regionOfManufacture,
    height: ebayData.prodTechInfo?.height || "Unknown",
    length: ebayData.prodTechInfo?.length || "Unknown",
    width: ebayData.prodTechInfo?.width || "Unknown",
    weight: ebayData.prodTechInfo?.weight || "Unknown",
    nonNewConditionDetails: ebayData.prodTechInfo?.nonNewConditionDetails,
    productCondition: ebayData.prodTechInfo?.productCondition,
    numberOfLANPorts: ebayData.prodTechInfo?.numberOfLANPorts,
    maximumWirelessData: ebayData.prodTechInfo?.maximumWirelessData,
    maximumLANDataRate: ebayData.prodTechInfo?.maximumLANDataRate,
    ports: ebayData.prodTechInfo?.ports,
    toFit: ebayData.prodTechInfo?.toFit,
    displayType: ebayData.prodTechInfo?.displayType,
    aspectRatio: ebayData.prodTechInfo?.aspectRatio,
    imageBrightness: ebayData.prodTechInfo?.imageBrightness,
    throwRatio: ebayData.prodTechInfo?.throwRatio,
    compatibleOperatingSystem: ebayData.prodTechInfo?.compatibleOperatingSystem,
    compatibleFormat: ebayData.prodTechInfo?.compatibleFormat,
    lensMagnification: ebayData.prodTechInfo?.lensMagnification,
    nativeResolution: ebayData.prodTechInfo?.nativeResolution,
    displayTechnology: ebayData.prodTechInfo?.displayTechnology,
    energyEfficiencyRating: ebayData.prodTechInfo?.energyEfficiencyRating,
    videoInputs: ebayData.prodTechInfo?.videoInputs,
    refreshRate: ebayData.prodTechInfo?.refreshRate,
    responseTime: ebayData.prodTechInfo?.responseTime,
    brightness: ebayData.prodTechInfo?.brightness,
    contrastRatio: ebayData.prodTechInfo?.contrastRatio,
    ecRange: ebayData.prodTechInfo?.ecRange,
    productLine: ebayData.prodTechInfo?.productLine,
    customBundle: ebayData.prodTechInfo?.customBundle,
    interface: ebayData.prodTechInfo?.interface,
    networkConnectivity: ebayData.prodTechInfo?.networkConnectivity,
    networkManagementType: ebayData.prodTechInfo?.networkManagementType,
    networkType: ebayData.prodTechInfo?.networkType,
    processorManufacturer: ebayData.prodTechInfo?.processorManufacturer,
    numberOfProcessors: ebayData.prodTechInfo?.numberOfProcessors,
    numberOfVANPorts: ebayData.prodTechInfo?.numberOfVANPorts,
    processorType: ebayData.prodTechInfo?.processorType,
    raidLevel: ebayData.prodTechInfo?.raidLevel,
    memoryType: ebayData.prodTechInfo?.memoryType,
    deviceConnectivity: ebayData.prodTechInfo?.deviceConnectivity,
    connectorType: ebayData.prodTechInfo?.connectorType,
    supportedWirelessProtocol: ebayData.prodTechInfo?.supportedWirelessProtocol,
    compatibleOperatingSystems: ebayData.prodTechInfo?.compatibleOperatingSystems,
    californiaProp65Warning: ebayData.prodTechInfo?.californiaProp65Warning,
    yearManufactured: ebayData.prodTechInfo?.yearManufactured,
    warrantyDuration: ebayData.prodPricing?.warrantyDuration,
    warrantyCoverage: ebayData.prodPricing?.warrantyCoverage,
    warrantyDocument: ebayData.prodPricing?.warrantyDocument,
    postagePolicy: ebayData.prodDelivery?.postagePolicy,
    packageWeight: ebayData.prodDelivery?.packageWeight,
    packageDimensions: ebayData.prodDelivery?.packageDimensions,
    irregularPackage: ebayData.prodDelivery?.irregularPackage,
  });
}
function generateItemSpecifics(ebayData: any) {
  const itemSpecifics = [];
  // Extract variation attribute names

  // Step 1: Extract variation attribute names into a Set
  const variations = ebayData?.prodPricing?.selectedVariations || [];
  const variationAttributeNames = new Set<string>();
  variations.forEach((variation: any) => {
    const attributes = variation?.variationId?.attributes || {};
    Object.keys(attributes).forEach((key) => variationAttributeNames.add(key.toLowerCase()));
  });
  const dynamicFields = {
    // Handle features array as a singtle string with comma-separated values
    Feature:
      ebayData.prodTechInfo?.features && Array.isArray(ebayData.prodTechInfo.features)
        ? ebayData.prodTechInfo.features.join(", ") // Join array elements into a string
        : null,
    CPU: ebayData.prodTechInfo?.cpu,
    UPC: ebayData.prodTechInfo?.upc,
    EAN: ebayData.prodTechInfo?.ean,
    MPN: ebayData.prodTechInfo?.mpn,
    // Model: ebayData.prodTechInfo?.model || "Unknown",
    Brand:
      ebayData.productInfo?.brand && Array.isArray(ebayData.productInfo.brand)
        ? ebayData.productInfo.brand.join(", ")
        : ebayData.productInfo?.brand || "MixBrand",
    Storage: ebayData.prodTechInfo?.storageType,
    Type: ebayData.prodTechInfo?.type || "Unknown",
    // RAM: ebayData.prodTechInfo?.ramSize,
    // Processor: ebayData.prodTechInfo?.processor || "Unknown",
    FormFactor: ebayData.prodTechInfo?.formFactor,
    // GPU: ebayData.prodTechInfo?.gpu,
    ScreenSize:
      ebayData.prodTechInfo?.screenSize && Array.isArray(ebayData.prodTechInfo.screenSize)
        ? ebayData.prodTechInfo.screenSize.join(", ")
        : ebayData.prodTechInfo?.screenSize || 0,
    Resolution: ebayData.prodTechInfo?.resolution,
    Frequency: ebayData.prodTechInfo?.frequency,
    Connectivity: ebayData.prodTechInfo?.connectivity,
    // Color: ebayData.prodTechInfo?.color,
    ProductType: ebayData.prodTechInfo?.productType,
    ProductCondition: ebayData.prodTechInfo?.productCondition,
    NonNewConditionDetails: ebayData.prodTechInfo?.nonNewConditionDetails,
    Height: ebayData.prodTechInfo?.height,
    Length: ebayData.prodTechInfo?.length,
    Width: ebayData.prodTechInfo?.width,
    Weight: ebayData.prodTechInfo?.weight,
    ManufacturerWarranty: ebayData.prodPricing?.manufacturerWarranty,
    RegionOfManufacture: ebayData.prodTechInfo?.regionOfManufacture,
    CustomBundle: ebayData.prodTechInfo?.customBundle,
    ReleaseYear: ebayData.prodTechInfo?.releaseYear,
    // HardDriveCapacity: ebayData.prodTechInfo?.hardDriveCapacity,
    // SSDCapacity: ebayData.prodTechInfo?.ssdCapacity,
    MostSuitableFor: ebayData.prodTechInfo?.mostSuitableFor,
    GraphicsProcessingType: ebayData.prodTechInfo?.graphicsProcessingType,
    MaximumWirelessData: ebayData.prodTechInfo?.maximumWirelessData,
    MaximumLANDataRate: ebayData.prodTechInfo?.maximumLANDataRate,
    NumberOfLANPorts: ebayData.prodTechInfo?.numberOfLANPorts,
    NumberOfVANPorts: ebayData.prodTechInfo?.numberOfVANPorts,
    NumberOfProcessors: ebayData.prodTechInfo?.numberOfProcessors,
    ProcessorManufacturer: ebayData.prodTechInfo?.processorManufacturer,
    ProcessorSpeed: ebayData.prodTechInfo?.processorSpeed,
    ProcessorType: ebayData.prodTechInfo?.processorType,
    NetworkType: ebayData.prodTechInfo?.networkType,
    NetworkManagementType: ebayData.prodTechInfo?.networkManagementType,
    NetworkConnectivity: ebayData.prodTechInfo?.networkConnectivity,
    DeviceConnectivity: ebayData.prodTechInfo?.deviceConnectivity,
    ConnectorType: ebayData.prodTechInfo?.connectorType,
    SupportedWirelessProtocol: ebayData.prodTechInfo?.supportedWirelessProtocol,
    CompatibleOperatingSystems: ebayData.prodTechInfo?.compatibleOperatingSystems,
    CompatibleOperatingSystem: ebayData.prodTechInfo?.compatibleOperatingSystem,
    CompatibleFormat: ebayData.prodTechInfo?.compatibleFormat,
    LensMagnification: ebayData.prodTechInfo?.lensMagnification,
    NativeResolution: ebayData.prodTechInfo?.nativeResolution,
    DisplayTechnology: ebayData.prodTechInfo?.displayTechnology,
    EnergyEfficiencyRating: ebayData.prodTechInfo?.energyEfficiencyRating,
    VideoInputs: ebayData.prodTechInfo?.videoInputs,
    RefreshRate: ebayData.prodTechInfo?.refreshRate,
    ResponseTime: ebayData.prodTechInfo?.responseTime,
    Brightness: ebayData.prodTechInfo?.brightness,
    ContrastRatio: ebayData.prodTechInfo?.contrastRatio,
    EcRange: ebayData.prodTechInfo?.ecRange,
    ProductLine: ebayData.prodTechInfo?.productLine,
    WarrantyDuration: ebayData.prodPricing?.warrantyDuration,
    WarrantyCoverage: ebayData.prodPricing?.warrantyCoverage,
    // WarrantyDocument: ebayData.prodPricing?.warrantyDocument,
    PostagePolicy: ebayData.prodDelivery?.postagePolicy,
    PackageWeight: ebayData.prodDelivery?.packageWeight,
    PackageDimensions: ebayData.prodDelivery?.packageDimensions,
    IrregularPackage: ebayData.prodDelivery?.irregularPackage,
    ToFit: ebayData.prodTechInfo?.toFit,
    DisplayType: ebayData.prodTechInfo?.displayType,
    AspectRatio: ebayData.prodTechInfo?.aspectRatio,
    ImageBrightness: ebayData.prodTechInfo?.imageBrightness,
    ThrowRatio: ebayData.prodTechInfo?.throwRatio,
    CaliforniaProp65Warning: ebayData.prodTechInfo?.californiaProp65Warning,
    YearManufactured: ebayData.prodTechInfo?.yearManufactured,
    DeviceType: ebayData.prodTechInfo?.deviceType,
    UnitType: ebayData.prodTechInfo?.unitType,
    UnitQuantity: ebayData.prodTechInfo?.unitQuantity,
    HardDriveType: ebayData.prodTechInfo?.hardDriveType,
    // OperatingSystem: ebayData.prodTechInfo?.operatingSystem,
    OperatingSystemEdition: ebayData.prodTechInfo?.operatingSystemEdition,
    // Memory: ebayData.prodTechInfo?.memory,
    MaxRamCapacity: ebayData.prodTechInfo?.maxRamCapacity,
    MemoryType: ebayData.prodTechInfo?.memoryType,
    RaidLevel: ebayData.prodTechInfo?.raidLevel,
  };

  // Loop through dynamic fields to create NameValueList for each one if it exists
  for (const [key, value] of Object.entries(dynamicFields)) {
    // Only add to itemSpecifics if the value is not empty, null, or undefined
    if (value && (Array.isArray(value) ? value.length > 0 : typeof value === "string" ? value.trim() : true)) {
      // If value is an array, create multiple <Value> tags for each item
      if (Array.isArray(value)) {
        itemSpecifics.push(`
                  <NameValueList>
                      <Name>${key}</Name>
                      ${value.map((val) => `<Value>${val}</Value>`).join("")}
                  </NameValueList>
              `);
      } else {
        // If value is not an array, just add a single <Value> tag
        itemSpecifics.push(`
                  <NameValueList>
                      <Name>${key}</Name>
                      <Value>${value}</Value>
                  </NameValueList>
              `);
      }
    }
  }

  return itemSpecifics.join("");
}

function escapeXml(unsafe: any) {
  return unsafe
    ?.replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}
function generateVariationsXml(ebayData: any): string {
  const variations = ebayData?.prodPricing?.selectedVariations || [];
  if (!variations.length) return "";

  const variationSpecificsSet: { [key: string]: Set<string> } = {};
  const picturesByAttribute: { [value: string]: string[] } = {};
  const pictureAttributeName = "ramSize"; // or set dynamically if needed

  const usedKeys = new Set<string>();
  const seenCombinations = new Set<string>();

  const variationNodes = variations.reduce((acc: string[], variation: any, index: number) => {
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
    if (seenCombinations.has(comboKey)) return acc; // Skip duplicate

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
