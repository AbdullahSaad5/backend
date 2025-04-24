// import { IEbay } from "@/contracts/ebay.contract";
import { StatusCodes, ReasonPhrases } from "http-status-codes";
import { Request, Response } from "express";
import ebayHtmlTemplate from "@/utils/ebayHtmlTemplate.util";
import {
  exchangeCodeForAccessToken,
  getEbayAuthURL,
  getNormalAccessToken,
  getStoredEbayAccessToken,
  refreshEbayAccessToken,
} from "@/utils/ebay-helpers.util";

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

  async syncListingWithEbay(listing: any): Promise<string> {
    try {
      const token = await getStoredEbayAccessToken();
      if (!token) {
        throw new Error("Missing or invalid eBay access token");
      }

      const ebayData = listing;

      const generateListingDescription = (ebayData: any) => {
        return ebayHtmlTemplate({
          title: ebayData.productInfo?.title ?? "A TEST product",
          brand: ebayData.productInfo?.brand || "Mix Brand",
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
      };
      const retailPrice =
        ebayData?.prodPricing?.retailPrice ?? ebayData?.prodPricing?.selectedVariations?.[0]?.retailPrice ?? 0;
      const escapeXml = (unsafe: any) =>
        unsafe
          ?.replace(/&/g, "&amp;")
          .replace(/</g, "&lt;")
          .replace(/>/g, "&gt;")
          .replace(/"/g, "&quot;")
          .replace(/'/g, "&apos;");
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
      const generateItemSpecifics = (ebayData: any) => {
        const itemSpecifics = [];

        // Define dynamic fields mapping
        const dynamicFields = {
          // Handle features array as a single string with comma-separated values
          Feature:
            ebayData.prodTechInfo?.features && Array.isArray(ebayData.prodTechInfo.features)
              ? ebayData.prodTechInfo.features.join(", ") // Join array elements into a string
              : null,
          CPU: ebayData.prodTechInfo?.cpu,
          UPC: ebayData.prodTechInfo?.upc,
          EAN: ebayData.prodTechInfo?.ean,
          MPN: ebayData.prodTechInfo?.mpn,
          Model: ebayData.prodTechInfo?.model,
          Brand: ebayData.prodTechInfo?.brand,
          Storage: ebayData.prodTechInfo?.storageType,
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
      };

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
      const ebayUrl = "https://api.ebay.com/ws/api.dll";

      const listingBody = `
      <?xml version="1.0" encoding="UTF-8"?>
      <AddItemRequest xmlns="urn:ebay:apis:eBLBaseComponents">
        <ErrorLanguage>en_US</ErrorLanguage>
        <WarningLevel>High</WarningLevel>
        <Item>
          <Title>${escapeXml(ebayData.productInfo?.title ?? "A TEST product")}</Title>
          <Description>${escapeXml(ebayData.productInfo?.description ?? "A test desccription")}</Description>
          <PrimaryCategory>
            <CategoryID>${categoryId}</CategoryID>
          </PrimaryCategory>
          <BuyItNowPrice currencyID="GBP">${retailPrice}</BuyItNowPrice>
          <CategoryMappingAllowed>true</CategoryMappingAllowed>
          <Country>GB</Country>
          <Currency>GBP</Currency>
          <DispatchTimeMax>3</DispatchTimeMax>
          <ListingDuration>Days_7</ListingDuration>
          <ListingType>Chinese</ListingType>
          <PictureDetails>
          ${pictureURLs}
          </PictureDetails>
          <PostalCode>95125</PostalCode>
          <Quantity>${ebayData.prodPricing?.listingQuantity ?? 1}</Quantity>
            <!-- Dynamic ItemSpecifics -->
          <ItemSpecifics>
          ${generateItemSpecifics(ebayData)}
          </ItemSpecifics>

          <ReturnPolicy>
            <ReturnsAcceptedOption>ReturnsAccepted</ReturnsAcceptedOption>
            <RefundOption>MoneyBack</RefundOption>
            <ReturnsWithinOption>Days_30</ReturnsWithinOption>
            <ShippingCostPaidByOption>Buyer</ShippingCostPaidByOption>
          </ReturnPolicy>
<ShippingDetails>
  <ShippingType>Flat</ShippingType>
  <ShippingServiceOptions>
    <ShippingServicePriority>1</ShippingServicePriority>
    <ShippingService>USPSPriority</ShippingService> <!-- Change this to a valid shipping service -->
    <ShippingServiceCost>5.00</ShippingServiceCost>
    <FreeShipping>false</FreeShipping>
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
          // Authorization: `Bearer ${token}`,

          "X-EBAY-API-SITEID": "3", // UK site ID
          "X-EBAY-API-COMPATIBILITY-LEVEL": "967",
          "X-EBAY-API-CALL-NAME": "AddItem",
          "X-EBAY-API-IAF-TOKEN": token,
        },
        body: listingBody,
      });

      return JSON.stringify({
        status: response.status,
        statusText: response.statusText,
        response: await response.text(),
      });
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
