export function transformProductData(data: any) {
  const result: any = {
    stepData: {
      productInfo: {},
      prodMedia: {}, // Restructured to hold platforms
      prodTechInfo: {},
      prodPricing: {},
      prodDelivery: {},
      prodSeo: {},
    },
  };

  // Helper function to create the common structure for other sections
  const createField = (name: string, value: any, platforms: any) => ({
    name,
    value,
    isAmz: platforms.amazon?.hasOwnProperty(name) || false,
    isEbay: platforms.ebay?.hasOwnProperty(name) || false,
    isWeb: platforms.website?.hasOwnProperty(name) || false,
  });

  // Generic transformation logic for non-media sections
  const transformFields = (
    fields: string[],
    sectionKey: string,
    target: any
  ) => {
    fields.forEach((field) => {
      const platforms = {
        amazon: data.platformDetails.amazon?.[sectionKey],
        ebay: data.platformDetails.ebay?.[sectionKey],
        website: data.platformDetails.website?.[sectionKey],
      };

      const value =
        platforms.amazon?.[field] ||
        platforms.ebay?.[field] ||
        platforms.website?.[field] ||
        null;

      if (value !== null) {
        target[field] = createField(field, value, platforms);
      }
    });
  };

  // Define the field groups (excluding prodMedia)
  const fieldGroups = {
    productInfo: [
      "brand",
      "title",
      "productDescription",
      "productCategory",
      "productSupplier",
      "kind",
    ],
    prodTechInfo: [
      "processor",
      "model",
      "operatingSystem",
      "storageType",
      "features",
      "ssdCapacity",
      "gpu",
      "type",
      "releaseYear",
      "hardDriveCapacity",
      "color",
      "maxResolution",
      "mostSuitableFor",
      "screenSize",
      "graphicsProcessingType",
      "connectivity",
      "motherboardModel",
      "series",
      "operatingSystemEdition",
      "memory",
      "maxRamCapacity",
      "unitType",
      "unitQuantity",
      "mpn",
      "processorSpeed",
      "ramSize",
      "formFactor",
      "ean",
      "productType",
      "manufacturerWarranty",
      "regionOfManufacture",
      "height",
      "length",
      "width",
      "weight",
      "nonNewConditionDetails",
      "productCondition",
      "numberOfLANPorts",
      "maximumWirelessData",
      "maximumLANDataRate",
      "ports",
      "toFit",
      "displayType",
      "aspectRatio",
      "imageBrightness",
      "throwRatio",
      "compatibleOperatingSystem",
      "compatibleFormat",
      "lensMagnification",
      "yearManufactured",
      "nativeResolution",
      "displayTechnology",
      "energyEfficiencyRating",
      "videoInputs",
      "refreshRate",
      "responseTime",
      "brightness",
      "contrastRatio",
      "ecRange",
      "productLine",
      "customBundle",
      "interface",
      "networkConnectivity",
      "networkManagementType",
      "networkType",
      "processorManufacturer",
      "numberOfProcessors",
      "numberOfVANPorts",
      "processorType",
      "raidLevel",
      "memoryType",
      "deviceConnectivity",
      "connectorType",
      "supportedWirelessProtocol",

      // adding amazon specific fields

      // "recommendedBrowseNotes",
      // "bulletPoint",
      // "powerPlug",
      // "graphicsCardInterface",
      // "ramMemoryMaximumSize",
      // "ramMemoryMaximumSizeUnit",
      // "ramMemoryTechnology",
      // "humanInterfaceInput",
      // "includedComponents",
      // "specificUsesForProduct",
      // "cacheMemoryInstalledSize",
      // "cacheMemoryInstalledSizeUnit",
      // "cpuModel",
      // "cpuModelManufacturer",
      // "cpuModelNumber",
      // "cpuSocket",
      // "cpuBaseSpeed",
      // "cpuBaseSpeedUnit",
      // "graphicsRam",
      // "hardDiskDescription",
      // "hardDiskInterface",
      // "hardDiskRotationalSpeed",
      // "hardDiskRotationalSpeedUnit",
      // "totalUsb2oPorts",
      // "totalUsb3oPorts",
      // "productWarranty",
      // "gdprRisk",
      // "opticalStorageDevice",
      // "dangerousGoodsRegulation",
      // "safetyAndCompliance",
      // "manufacturer",
    ],
    prodPricing: [
      "quantity",
      "price",
      "condition",
      "conditionDescription",
      "pricingFormat",
      "discountType",
      "discountValue",
      "vat",
      "paymentPolicy",
      "buy2andSave",
      "buy3andSave",
      "buy4andSave",
      "warrantyDuration",
      "warrantyCoverage",
      "warrantyDocument",
    ],
    prodDelivery: [
      "postagePolicy",
      "packageWeight",
      "packageDimensions",
      "irregularPackage",
    ],
    prodSeo: ["seoTags", "relevantTags", "suggestedTags"],
  };

  // Transform each section except prodMedia
  Object.entries(fieldGroups).forEach(([sectionKey, fields]) => {
    transformFields(fields, sectionKey, result.stepData[sectionKey]);
  });

  // Handle prodMedia separately per platform
  const platforms = ["amazon", "ebay", "website"] as const;
  result.stepData.prodMedia = { platformMedia: {} }; // Wrapping prodMedia inside platformMedia

  platforms.forEach((platform) => {
    const mediaData = data.platformDetails[platform]?.prodMedia;
    result.stepData.prodMedia.platformMedia[platform] = {
      images: mediaData?.images || [],
      videos: mediaData?.videos || [],
    };
  });

  return result;
}
