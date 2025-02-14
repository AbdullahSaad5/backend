export function transformProductData(data: any) {
  const result: any = {
    stepData: {
      productInfo: {},
      prodMedia: {},
      prodTechInfo: {},
      prodPricing: {},
      prodDelivery: {},
      prodSeo: {},
    },
  };

  // Helper function to create the common structure
  const createField = (name: string, value: any, platforms: any) => ({
    name,
    value,
    isAmz: platforms.amazon?.hasOwnProperty(name) || false,
    isEbay: platforms.ebay?.hasOwnProperty(name) || false,
    isWeb: platforms.website?.hasOwnProperty(name) || false,
  });

  // Generic transformation logic
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

      // Add field only if it has a value in at least one platform
      if (value !== null) {
        target[field] = createField(field, value, platforms);
      }
    });
  };

  // Define the field groups for each section
  const fieldGroups = {
    productInfo: [
      "brand",
      "title",
      "productDescription",
      "productCategory",
      "productSupplier",
      "kind",
    ],
    prodMedia: ["images", "videos"],
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
    ],
    prodDelivery: [
      "postagePolicy",
      "packageWeight",
      "packageDimensions",
      "irregularPackage",
    ],
    prodSeo: ["seoTags", "relevantTags", "suggestedTags"],
  };

  // Transform each section
  Object.entries(fieldGroups).forEach(([sectionKey, fields]) => {
    transformFields(fields, sectionKey, result.stepData[sectionKey]);
  });

  return result;
}
