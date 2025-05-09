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
  "v^1.1#i^1#f^0#r^0#p^3#I^3#t^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";
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
          <SKU>${ebayData.productInfo?.sku}</SKU>
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
      const rawResponse = await response.text(); // Read once
      const parser = new XMLParser({ ignoreAttributes: false, trimValues: true });
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
          <SKU>${ebayData.productInfo?.sku}</SKU>
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
  <NameValueList>
    <Name>ScreenSize</Name>
    <Value>16inch</Value>
  </NameValueList>
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
    sku: ebayData.productInfo?.sku,
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
  const variations = ebayData?.prodPricing?.selectedVariations || [];

  // Step 1: Extract variation-specific attribute names (case-insensitive)
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
    Model: ebayData.prodTechInfo?.model || "Unknown",
    Brand:
      ebayData.productInfo?.brand && Array.isArray(ebayData.productInfo.brand)
        ? ebayData.productInfo.brand.join(", ")
        : ebayData.productInfo?.brand || "MixBrand",
    Storage: ebayData.prodTechInfo?.storageType,
    Type: ebayData.prodTechInfo?.type || "Unknown",
    RAM: ebayData.prodTechInfo?.ramSize,
    Processor: ebayData.prodTechInfo?.processor || "Unknown", //also in variiation specific
    FormFactor: ebayData.prodTechInfo?.formFactor,
    GPU: ebayData.prodTechInfo?.gpu,
    ScreenSize:
      ebayData.prodTechInfo?.screenSize && Array.isArray(ebayData.prodTechInfo.screenSize)
        ? ebayData.prodTechInfo.screenSize.join(", ")
        : ebayData.prodTechInfo?.screenSize || "16 inch",
    Resolution: ebayData.prodTechInfo?.resolution,
    Frequency: ebayData.prodTechInfo?.frequency,
    Connectivity: ebayData.prodTechInfo?.connectivity,
    Color: ebayData.prodTechInfo?.color,
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
    HardDriveCapacity: ebayData.prodTechInfo?.hardDriveCapacity,
    SSDCapacity: ebayData.prodTechInfo?.ssdCapacity,
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
    OperatingSystem: ebayData.prodTechInfo?.operatingSystem,
    OperatingSystemEdition: ebayData.prodTechInfo?.operatingSystemEdition,
    Memory: ebayData.prodTechInfo?.memory,
    MaxRamCapacity: ebayData.prodTechInfo?.maxRamCapacity,
    MemoryType: ebayData.prodTechInfo?.memoryType,
    RaidLevel: ebayData.prodTechInfo?.raidLevel,
  };

  for (const [key, value] of Object.entries(dynamicFields)) {
    // skip if it's a variation-specific key
    if (variationAttributeNames.has(key.toLowerCase())) {
      console.log(`Skipped from item specifics (exists in variation): ${key}`);
      continue;
    }

    if (value && (Array.isArray(value) ? value.length > 0 : typeof value === "string" ? value.trim() : true)) {
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
