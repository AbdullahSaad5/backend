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
import { strict } from "assert";

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

  syncListingWithEbay: async (listing: any): Promise<string> => {
    try {
      // const token = await getStoredEbayAccessToken();
      const token =
        "v^1.1#i^1#p^3#I^3#r^0#f^0#t^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";
      if (!token) {
        throw new Error("Missing or invalid eBay access token");
      }

      const ebayData = listing;

      const retailPrice =
        ebayData?.prodPricing?.retailPrice ?? ebayData?.prodPricing?.selectedVariations?.[0]?.retailPrice ?? 0;
      const escapeXml = (unsafe: any) =>
        unsafe
          ?.replace(/&/g, "&amp;")
          .replace(/</g, "&lt;")
          .replace(/>/g, "&gt;")
          .replace(/"/g, "&quot;")
          .replace(/'/g, "&apos;");

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
      <AddItemRequest xmlns="urn:ebay:apis:eBLBaseComponents">
        <ErrorLanguage>en_US</ErrorLanguage>
        <WarningLevel>High</WarningLevel>
        <Item>
          <Title>${escapeXml(ebayData.productInfo?.title ?? "A TEST product")}</Title>
          <Description>${escapeXml(listingDescriptionData)}</Description>
          <PrimaryCategory>
            <CategoryID>${categoryId}</CategoryID>
          </PrimaryCategory>

        <StartPrice currencyID="GBP">10.00</StartPrice>
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
          <Quantity>23</Quantity>
            <!-- Dynamic ItemSpecifics -->
          <ItemSpecifics>
                ${escapeXml(generateItemSpecifics(ebayData))}
              </ItemSpecifics>
              <ItemSpecifics>
                <NameValueList>
                     <Name>Model</Name>
                     <Value>xyz model</Value>
                </NameValueList>
                <NameValueList>
                     <Name>ScreenSize</Name>
                     <Value>14 inch</Value>
                </NameValueList>
                <NameValueList>
                      <Name>Processor</Name>
                      <Value>Intel Core i7</Value>
                 </NameValueList>
                  <NameValueList>
                       <Name>Brand</Name>
                       <Value>Lenovo</Value>
                   </NameValueList>
                    <NameValueList>
                        <Name>Type</Name>
                        <Value>Laptop</Value>
                    </NameValueList>
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
        </Item>
      </AddItemRequest>
    `;

      console.log("Request Body for Listing Creation:", listingBody, null, 2);

      // Step 1: Create Listing on eBay
      const response = await fetch(ebayUrl, {
        method: "POST",
        headers: {
          "X-EBAY-API-SITEID": "3", // UK site ID
          "X-EBAY-API-COMPATIBILITY-LEVEL": "967",
          "X-EBAY-API-CALL-NAME": "AddItem",
          "X-EBAY-API-IAF-TOKEN": token,
        },
        body: listingBody,
      });
      const rawResponse = await response.text();

      const parser = new XMLParser({
        ignoreAttributes: false,
        trimValues: true,
      });
      const jsonObj = parser.parse(rawResponse);

      const itemId = jsonObj?.AddItemResponse?.ItemID;

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
          statusText: "Failed to create listing",
          response: jsonObj,
        });
      }

      // return JSON.stringify({
      //   status: response.status,
      //   statusText: response.statusText,
      //   response: await response.text(),
      // });
    } catch (error: any) {
      console.error("Error syncing product with eBay:", error.message);

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

  // Define dynamic fields mapping
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
    Model: ebayData.prodTechInfo?.model || "INTEL CCORE I9",
    Brand: ebayData.prodTechInfo?.brand || "LENOVO",
    Storage: ebayData.prodTechInfo?.storageType,
    Type: ebayData.prodTechInfo?.type || "Laptop",
    RAM: ebayData.prodTechInfo?.ramSize,
    Processor: ebayData.prodTechInfo?.processor,
    FormFactor: ebayData.prodTechInfo?.formFactor,
    GPU: ebayData.prodTechInfo?.gpu,
    ScreenSize: ebayData.prodTechInfo?.screenSize,
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
    WarrantyDocument: ebayData.prodPricing?.warrantyDocument,
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

  // Loop through dynamic fields to create NameValueList for each one if it exists
  for (const [key, value] of Object.entries(dynamicFields)) {
    // Only add to itemSpecifics if the value is not empty, null, or undefined
    if (value && (Array.isArray(value) ? value.length > 0 : value.trim())) {
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
