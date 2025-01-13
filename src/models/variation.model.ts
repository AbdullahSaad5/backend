import mongoose, { Schema, model } from "mongoose";
import { IVariation } from "@/contracts/variation.contract";
const options = { timestamps: true, discriminatorKey: "kind" };

const prodInfoSchema = {
  variationCategory: {
    type: Schema.Types.ObjectId,
    ref: "VariationCategory",
    required: true,
  },
  title: { type: String, required: true },
  variationDescription: { type: String },
  brand: { type: String, required: true },
  images: [{ type: String, required: true }],
};

const prodPricingSchema = {
  // prod pricing details
  quantity: { type: String },
  price: { type: String },
  condition: { type: String },
  conditionDescription: { type: String },
  pricingFormat: { type: String },
  vat: { type: String },
  paymentPolicy: { type: Schema.Types.ObjectId, ref: "PaymentPolicy" },
  buy2andSave: { type: String },
  buy3andSave: { type: String },
  buy4andSave: { type: String },
};

const prodDeliverySchema = {
  // prod delivery details
  postagePolicy: {
    type: String,
  },
  packageWeight: {
    weightKg: {
      type: String,
    },
    weightG: {
      type: String,
    },
  },
  packageDimensions: {
    dimensionLength: {
      type: String,
    },
    dimensionWidth: {
      type: String,
    },
    dimensionHeight: {
      type: String,
    },
  },
  irregularPackage: { type: Boolean },
};

const prodSeoSchema = {
  // prod seo details
  seoTags: {
    type: [String],
  },
  relevantTags: {
    type: [String],
  },
  suggestedTags: {
    type: [String],
  },
};

const amazonSchema = {
  variationInfo: prodInfoSchema,
};
// eBay-specific schema
const ebaySchema = {
  variationInfo: prodInfoSchema,
};
// Website-specific schema
const websiteSchema = {
  variationInfo: prodInfoSchema,
};

// Main Variation Schema
const variationSchema = new Schema(
  {
    platformDetails: {
      amazon: amazonSchema,
      ebay: ebaySchema,
      website: websiteSchema,
    },
    isBlocked: { type: Boolean, default: false },
    status: { type: String, enum: ["draft", "published"], default: "draft" },
    isTemplate: { type: Boolean, default: false },
  },
  options
);

// Base Variation Model
const Variation = model<IVariation>("Variation", variationSchema);

// discriminator for laptops
Variation.discriminator(
  "Laptops",
  new mongoose.Schema(
    {
      platformDetails: {
        amazon: {
          prodTechInfo: {
            processor: { type: String },
            model: { type: String },
            // variationCondition: { type: String },
            // nonNewConditionDetails: { type: String },
            operatingSystem: { type: String },
            storageType: { type: String },
            features: { type: String },
            ssdCapacity: { type: String },
            gpu: { type: String },
            type: { type: String },
            releaseYear: { type: Number },
            hardDriveCapacity: { type: String },
            color: { type: String },
            maxResolution: { type: String },
            mostSuitableFor: { type: String },
            screenSize: { type: String },
            graphicsProcessingType: { type: String },
            connectivity: { type: String },
            manufacturerWarranty: { type: String },
            regionOfManufacture: { type: String },
            height: { type: String },
            length: { type: String },
            weight: { type: String },
            width: { type: String },
          },
          prodPricing: prodPricingSchema,

          prodDelivery: prodDeliverySchema,

          prodSeo: prodSeoSchema,
        },
        ebay: {
          prodTechInfo: {
            processor: { type: String },
            model: { type: String },
            // variationCondition: { type: String },
            // nonNewConditionDetails: { type: String },
            operatingSystem: { type: String },
            storageType: { type: String },
            features: { type: String },
            ssdCapacity: { type: String },
            gpu: { type: String },
            type: { type: String },
            releaseYear: { type: Number },
            hardDriveCapacity: { type: String },
            color: { type: String },
            maxResolution: { type: String },
            mostSuitableFor: { type: String },
            screenSize: { type: String },
            graphicsProcessingType: { type: String },
            connectivity: { type: String },
            manufacturerWarranty: { type: String },
            regionOfManufacture: { type: String },
            height: { type: String },
            length: { type: String },
            weight: { type: String },
            width: { type: String },
          },
          prodPricing: prodPricingSchema,

          prodDelivery: prodDeliverySchema,

          prodSeo: prodSeoSchema,
        },
        website: {
          prodTechInfo: {
            processor: { type: String },
            model: { type: String },
            // variationCondition: { type: String },
            // nonNewConditionDetails: { type: String },
            operatingSystem: { type: String },
            storageType: { type: String },
            features: { type: String },
            ssdCapacity: { type: String },
            gpu: { type: String },
            type: { type: String },
            releaseYear: { type: Number },
            hardDriveCapacity: { type: String },
            color: { type: String },
            maxResolution: { type: String },
            mostSuitableFor: { type: String },
            screenSize: { type: String },
            graphicsProcessingType: { type: String },
            connectivity: { type: String },
            manufacturerWarranty: { type: String },
            regionOfManufacture: { type: String },
            height: { type: String },
            length: { type: String },
            weight: { type: String },
            width: { type: String },
          },
          prodPricing: prodPricingSchema,

          prodDelivery: prodDeliverySchema,

          prodSeo: prodSeoSchema,
        },
      },
    },
    options
  )
);

// descriminator for all in one pc
Variation.discriminator(
  "All In One PC",
  new mongoose.Schema(
    {
      platformDetails: {
        amazon: {
          prodTechInfo: {
            processor: { type: String },
            model: { type: String },
            memory: { type: String },
            maxRamCapacity: { type: String },
            unitType: { type: String },
            unitQuantity: { type: String },
            mpn: { type: String },
            processorSpeed: { type: String },
            ramSize: { type: String },
            formFactor: { type: String },
            motherboardModel: { type: String },
            ean: { type: String },
            series: { type: String },
            operatingSystem: { type: String },
            operatingSystemEdition: { type: String },
            storageType: { type: String },
            features: { type: String },
            ssdCapacity: { type: String },
            gpu: { type: String },
            type: { type: String },
            releaseYear: { type: Number },
            variationType: { type: String, default: "All In One PC" },
            hardDriveCapacity: { type: String },
            color: { type: String },
            maxResolution: { type: String },
            mostSuitableFor: { type: String },
            screenSize: { type: String },
            graphicsProcessingType: { type: String },
            connectivity: { type: String },
            manufacturerWarranty: { type: String },
            regionOfManufacture: { type: String },
            height: { type: String },
            length: { type: String },
            width: { type: String },
            // Uncomment if weight is required
            // weight: { type: String },
          },
          prodPricing: prodPricingSchema,

          prodDelivery: prodDeliverySchema,

          prodSeo: prodSeoSchema,
        },
        ebay: {
          prodTechInfo: {
            processor: { type: String },
            model: { type: String },
            memory: { type: String },
            maxRamCapacity: { type: String },
            unitType: { type: String },
            unitQuantity: { type: String },
            mpn: { type: String },
            processorSpeed: { type: String },
            ramSize: { type: String },
            formFactor: { type: String },
            motherboardModel: { type: String },
            ean: { type: String },
            series: { type: String },
            operatingSystem: { type: String },
            operatingSystemEdition: { type: String },
            storageType: { type: String },
            features: { type: String },
            ssdCapacity: { type: String },
            gpu: { type: String },
            type: { type: String },
            releaseYear: { type: Number },
            variationType: { type: String, default: "All In One PC" },
            hardDriveCapacity: { type: String },
            color: { type: String },
            maxResolution: { type: String },
            mostSuitableFor: { type: String },
            screenSize: { type: String },
            graphicsProcessingType: { type: String },
            connectivity: { type: String },
            manufacturerWarranty: { type: String },
            regionOfManufacture: { type: String },
            height: { type: String },
            length: { type: String },
            width: { type: String },
            // Uncomment if weight is required
            // weight: { type: String },
          },
          prodPricing: prodPricingSchema,

          prodDelivery: prodDeliverySchema,

          prodSeo: prodSeoSchema,
        },
        website: {
          prodTechInfo: {
            processor: { type: String },
            model: { type: String },
            memory: { type: String },
            maxRamCapacity: { type: String },
            unitType: { type: String },
            unitQuantity: { type: String },
            mpn: { type: String },
            processorSpeed: { type: String },
            ramSize: { type: String },
            formFactor: { type: String },
            motherboardModel: { type: String },
            ean: { type: String },
            series: { type: String },
            operatingSystem: { type: String },
            operatingSystemEdition: { type: String },
            storageType: { type: String },
            features: { type: String },
            ssdCapacity: { type: String },
            gpu: { type: String },
            type: { type: String },
            releaseYear: { type: Number },
            variationType: { type: String, default: "All In One PC" },
            hardDriveCapacity: { type: String },
            color: { type: String },
            maxResolution: { type: String },
            mostSuitableFor: { type: String },
            screenSize: { type: String },
            graphicsProcessingType: { type: String },
            connectivity: { type: String },
            manufacturerWarranty: { type: String },
            regionOfManufacture: { type: String },
            height: { type: String },
            length: { type: String },
            width: { type: String },
            // Uncomment if weight is required
            // weight: { type: String },
          },
          prodPricing: prodPricingSchema,

          prodDelivery: prodDeliverySchema,

          prodSeo: prodSeoSchema,
        },
      },
    },
    options
  )
);

// discriminator for projectors
Variation.discriminator(
  "Projectors",
  new mongoose.Schema(
    {
      platformDetails: {
        amazon: {
          prodTechInfo: {
            model: { type: String },
            unitType: { type: String },
            unitQuantity: { type: String },
            features: { type: String },
            mpn: { type: String },
            ean: { type: String },
            type: { type: String },
            color: { type: String },
            connectivity: { type: String },
            numberOfLANPorts: { type: String },
            maximumWirelessData: { type: String },
            maximumLANDataRate: { type: String },
            ports: { type: String },
            toFit: { type: String },
            manufacturerWarranty: { type: String },
            regionOfManufacture: { type: String },
            height: { type: String },
            length: { type: String },
            width: { type: String },
            // Uncomment if weight is required
            // weight: { type: String },
          },
          prodPricing: prodPricingSchema,

          prodDelivery: prodDeliverySchema,

          prodSeo: prodSeoSchema,
        },
        ebay: {
          prodTechInfo: {
            model: { type: String },
            unitType: { type: String },
            unitQuantity: { type: String },
            features: { type: String },
            mpn: { type: String },
            ean: { type: String },
            type: { type: String },
            color: { type: String },
            connectivity: { type: String },
            numberOfLANPorts: { type: String },
            maximumWirelessData: { type: String },
            maximumLANDataRate: { type: String },
            ports: { type: String },
            toFit: { type: String },
            manufacturerWarranty: { type: String },
            regionOfManufacture: { type: String },
            height: { type: String },
            length: { type: String },
            width: { type: String },
            // Uncomment if weight is required
            // weight: { type: String },
          },
          prodPricing: prodPricingSchema,

          prodDelivery: prodDeliverySchema,

          prodSeo: prodSeoSchema,
        },
        website: {
          prodTechInfo: {
            model: { type: String },
            unitType: { type: String },
            unitQuantity: { type: String },
            features: { type: String },
            mpn: { type: String },
            ean: { type: String },
            type: { type: String },
            color: { type: String },
            connectivity: { type: String },
            numberOfLANPorts: { type: String },
            maximumWirelessData: { type: String },
            maximumLANDataRate: { type: String },
            ports: { type: String },
            toFit: { type: String },
            manufacturerWarranty: { type: String },
            regionOfManufacture: { type: String },
            height: { type: String },
            length: { type: String },
            width: { type: String },
            // Uncomment if weight is required
            // weight: { type: String },
          },
          prodPricing: prodPricingSchema,

          prodDelivery: prodDeliverySchema,

          prodSeo: prodSeoSchema,
        },
      },
    },
    options
  )
);

// discriminator for Monitors
Variation.discriminator(
  "Monitors",
  new mongoose.Schema(
    {
      platformDetails: {
        amazon: {
          prodTechInfo: {
            model: { type: String },
            features: { type: String },
            color: { type: String },
            maxResolution: { type: String },
            mostSuitableFor: { type: String },
            screenSize: { type: String },
            regionOfManufacture: { type: String },
            manufacturerWarranty: { type: String },
            aspectRatio: { type: String },
            ean: { type: String },
            mpn: { type: String },
            unitType: { type: String },
            unitQuantity: { type: String },
            energyEfficiencyRating: { type: String },
            videoInputs: { type: String },
            refreshRate: { type: String },
            responseType: { type: String },
            brightness: { type: String },
            contrastRatio: { type: String },
            ecRange: { type: String },
            variationLine: { type: String },
            height: { type: String },
            length: { type: String },
            width: { type: String },
          },
          prodPricing: prodPricingSchema,

          prodDelivery: prodDeliverySchema,

          prodSeo: prodSeoSchema,
        },
        ebay: {
          prodTechInfo: {
            model: { type: String },
            features: { type: String },
            color: { type: String },
            maxResolution: { type: String },
            mostSuitableFor: { type: String },
            screenSize: { type: String },
            regionOfManufacture: { type: String },
            manufacturerWarranty: { type: String },
            aspectRatio: { type: String },
            ean: { type: String },
            mpn: { type: String },
            unitType: { type: String },
            unitQuantity: { type: String },
            energyEfficiencyRating: { type: String },
            videoInputs: { type: String },
            refreshRate: { type: String },
            responseType: { type: String },
            brightness: { type: String },
            contrastRatio: { type: String },
            ecRange: { type: String },
            variationLine: { type: String },
            height: { type: String },
            length: { type: String },
            width: { type: String },
          },
          prodPricing: prodPricingSchema,

          prodDelivery: prodDeliverySchema,

          prodSeo: prodSeoSchema,
        },
        website: {
          prodTechInfo: {
            model: { type: String },
            features: { type: String },
            color: { type: String },
            maxResolution: { type: String },
            mostSuitableFor: { type: String },
            screenSize: { type: String },
            regionOfManufacture: { type: String },
            manufacturerWarranty: { type: String },
            aspectRatio: { type: String },
            ean: { type: String },
            mpn: { type: String },
            unitType: { type: String },
            unitQuantity: { type: String },
            energyEfficiencyRating: { type: String },
            videoInputs: { type: String },
            refreshRate: { type: String },
            responseType: { type: String },
            brightness: { type: String },
            contrastRatio: { type: String },
            ecRange: { type: String },
            variationLine: { type: String },
            height: { type: String },
            length: { type: String },
            width: { type: String },
          },
          prodPricing: prodPricingSchema,

          prodDelivery: prodDeliverySchema,

          prodSeo: prodSeoSchema,
        },
      },
    },
    options
  )
);

// descriminator for Gaming PC
Variation.discriminator(
  "Gaming PC",
  new mongoose.Schema(
    {
      platformDetails: {
        amazon: {
          prodTechInfo: {
            processor: { type: String },
            model: { type: String },
            maxRamCapacity: { type: String },
            unitType: { type: String },
            unitQuantity: { type: String },
            mpn: { type: String },
            type: { type: String },
            processorSpeed: { type: String },
            ramSize: { type: String },
            formFactor: { type: String },
            motherboardModel: { type: String },
            ean: { type: String },
            series: { type: String },
            operatingSystem: { type: String },
            customBundle: { type: String },
            storageType: { type: String },
            features: { type: String },
            ssdCapacity: { type: String },
            gpu: { type: String },
            releaseYear: { type: String },
            hardDriveCapacity: { type: String },
            color: { type: String },
            mostSuitableFor: { type: String },
            screenSize: { type: String },
            graphicsProcessingType: { type: String },
            connectivity: { type: String },
            manufacturerWarranty: { type: String },
            regionOfManufacture: { type: String },
            height: { type: String },
            length: { type: String },
            width: { type: String },
          },
          prodPricing: prodPricingSchema,

          prodDelivery: prodDeliverySchema,

          prodSeo: prodSeoSchema,
        },
        ebay: {
          prodTechInfo: {
            processor: { type: String },
            model: { type: String },
            maxRamCapacity: { type: String },
            unitType: { type: String },
            unitQuantity: { type: String },
            mpn: { type: String },
            type: { type: String },
            processorSpeed: { type: String },
            ramSize: { type: String },
            formFactor: { type: String },
            motherboardModel: { type: String },
            ean: { type: String },
            series: { type: String },
            operatingSystem: { type: String },
            customBundle: { type: String },
            storageType: { type: String },
            features: { type: String },
            ssdCapacity: { type: String },
            gpu: { type: String },
            releaseYear: { type: String },
            hardDriveCapacity: { type: String },
            color: { type: String },
            mostSuitableFor: { type: String },
            screenSize: { type: String },
            graphicsProcessingType: { type: String },
            connectivity: { type: String },
            manufacturerWarranty: { type: String },
            regionOfManufacture: { type: String },
            height: { type: String },
            length: { type: String },
            width: { type: String },
          },
          prodPricing: prodPricingSchema,

          prodDelivery: prodDeliverySchema,

          prodSeo: prodSeoSchema,
        },
        website: {
          prodTechInfo: {
            processor: { type: String },
            model: { type: String },
            maxRamCapacity: { type: String },
            unitType: { type: String },
            unitQuantity: { type: String },
            mpn: { type: String },
            type: { type: String },
            processorSpeed: { type: String },
            ramSize: { type: String },
            formFactor: { type: String },
            motherboardModel: { type: String },
            ean: { type: String },
            series: { type: String },
            operatingSystem: { type: String },
            customBundle: { type: String },
            storageType: { type: String },
            features: { type: String },
            ssdCapacity: { type: String },
            gpu: { type: String },
            releaseYear: { type: String },
            hardDriveCapacity: { type: String },
            color: { type: String },
            mostSuitableFor: { type: String },
            screenSize: { type: String },
            graphicsProcessingType: { type: String },
            connectivity: { type: String },
            manufacturerWarranty: { type: String },
            regionOfManufacture: { type: String },
            height: { type: String },
            length: { type: String },
            width: { type: String },
          },
          prodPricing: prodPricingSchema,

          prodDelivery: prodDeliverySchema,

          prodSeo: prodSeoSchema,
        },
      },
    },
    options
  )
);

// descriminator for Network Equipments
Variation.discriminator(
  "Network Equipments",
  new mongoose.Schema(
    {
      platformDetails: {
        amazon: {
          prodTechInfo: {
            model: { type: String },
            maxRamCapacity: { type: String },
            unitQuantity: { type: String },
            unitType: { type: String },
            variationLine: { type: String },
            mpn: { type: String },
            type: { type: String },
            ramSize: { type: String },
            formFactor: { type: String },
            ean: { type: String },
            manufacturerWarranty: { type: String },
            regionOfManufacture: { type: String },
            interface: { type: String },
            networkConnectivity: { type: String },
            networkManagementType: { type: String },
            networkType: { type: String },
            processorManufacturer: { type: String },
            numberOfProcessors: { type: String },
            numberOfVANPorts: { type: String },
            processorType: { type: String },
            raidLevel: { type: String },
            memoryType: { type: String },
            processorSpeed: { type: String },
            deviceConnectivity: { type: String },
            connectorType: { type: String },
            supportedWirelessProtocol: { type: String },
            height: { type: String },
            length: { type: String },
            width: { type: String },
          },
          prodPricing: prodPricingSchema,

          prodDelivery: prodDeliverySchema,

          prodSeo: prodSeoSchema,
        },
        ebay: {
          prodTechInfo: {
            model: { type: String },
            maxRamCapacity: { type: String },
            unitQuantity: { type: String },
            unitType: { type: String },
            variationLine: { type: String },
            mpn: { type: String },
            type: { type: String },
            ramSize: { type: String },
            formFactor: { type: String },
            ean: { type: String },
            manufacturerWarranty: { type: String },
            regionOfManufacture: { type: String },
            interface: { type: String },
            networkConnectivity: { type: String },
            networkManagementType: { type: String },
            networkType: { type: String },
            processorManufacturer: { type: String },
            numberOfProcessors: { type: String },
            numberOfVANPorts: { type: String },
            processorType: { type: String },
            raidLevel: { type: String },
            memoryType: { type: String },
            processorSpeed: { type: String },
            deviceConnectivity: { type: String },
            connectorType: { type: String },
            supportedWirelessProtocol: { type: String },
            height: { type: String },
            length: { type: String },
            width: { type: String },
          },
          prodPricing: prodPricingSchema,

          prodDelivery: prodDeliverySchema,

          prodSeo: prodSeoSchema,
        },
        website: {
          prodTechInfo: {
            model: { type: String },
            maxRamCapacity: { type: String },
            unitQuantity: { type: String },
            unitType: { type: String },
            variationLine: { type: String },
            mpn: { type: String },
            type: { type: String },
            ramSize: { type: String },
            formFactor: { type: String },
            ean: { type: String },
            manufacturerWarranty: { type: String },
            regionOfManufacture: { type: String },
            interface: { type: String },
            networkConnectivity: { type: String },
            networkManagementType: { type: String },
            networkType: { type: String },
            processorManufacturer: { type: String },
            numberOfProcessors: { type: String },
            numberOfVANPorts: { type: String },
            processorType: { type: String },
            raidLevel: { type: String },
            memoryType: { type: String },
            processorSpeed: { type: String },
            deviceConnectivity: { type: String },
            connectorType: { type: String },
            supportedWirelessProtocol: { type: String },
            height: { type: String },
            length: { type: String },
            width: { type: String },
          },
          prodPricing: prodPricingSchema,

          prodDelivery: prodDeliverySchema,

          prodSeo: prodSeoSchema,
        },
      },
    },
    options
  )
);

// Export the base Variation and its discriminators
export { Variation };