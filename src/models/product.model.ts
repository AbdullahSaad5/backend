import mongoose, { Schema, model } from "mongoose";
import {
  IAmazonPlatformDetails,
  IEbayPlatformDetails,
  IWebsitePlatformDetails,
  IProduct,
} from "@/contracts/product.contract";
import { fileSchema } from "./user.model";

const options = { timestamps: true, discriminatorKey: "kind" };

const prodInfoSchema = {
  productCategory: {
    type: Schema.Types.ObjectId,
    ref: "ProductCategory",
    required: true,
  },
  productSupplier: {
    type: Schema.Types.ObjectId,
    ref: "Supplier",
    required: true,
  },
  title: { type: String, required: true },
  productDescription: { type: String },
  brand: { type: String, required: true },
  images: { type: [fileSchema], _id: false },
  videos: { type: [fileSchema], _id: false },
};

const prodPricingSchema = {
  // prod pricing details
  quantity: { type: String },
  price: { type: String },
  condition: { type: String },
  conditionDescription: { type: String },
  pricingFormat: { type: String },
  vat: { type: String },
  paymentPolicy: {
    type: Schema.Types.ObjectId,
    ref: "PaymentPolicy",
    default: null,
    set: (value: any) => value === "" ? null : value, // Convert empty string to null
  },
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
// mock
const laptopTechnicalSchema = {
  processor: { type: String, required: true },
  model: { type: String },
  // productCondition: { type: String },
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
  screenSize: { type: String, required: true },
  graphicsProcessingType: { type: String },
  connectivity: { type: String },
  manufacturerWarranty: { type: String },
  regionOfManufacture: { type: String },
  height: { type: String },
  length: { type: String },
  weight: { type: String },
  width: { type: String },
};

const allInOnePCTechnicalSchema = {
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
  productType: { type: String, default: "All In One PC" },
  hardDriveCapacity: { type: String },
  color: { type: String },
  // maxResolution: { type: String },
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
};

const projectTechnicalSchema = {
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
};

const monitorTechnicalSchema = {
  model: { type: String },
  features: { type: String },
  color: { type: String },
  displayType: { type: String },
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
  responseTime: { type: String },
  brightness: { type: String },
  contrastRatio: { type: String },
  ecRange: { type: String },
  productLine: { type: String },
  height: { type: String },
  length: { type: String },
  width: { type: String },
};

const gamingPCTechnicalSchema = {
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
};

const networkEquipmentsTechnicalSchema = {
  model: { type: String },
  maxRamCapacity: { type: String },
  unitQuantity: { type: String },
  unitType: { type: String },
  productLine: { type: String },
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
};

// Main Product Schema
const productSchema = new Schema(
  {
    platformDetails: {
      amazon: {},
      ebay: {},
      website: {},
    },
    isBlocked: { type: Boolean, default: false },
    status: { type: String, enum: ["draft", "published"], default: "draft" },
    isTemplate: { type: Boolean, default: false },
  },
  options
);

// Base Product Model
const Product = model<IProduct>("Product", productSchema);

// discriminator for laptops
Product.discriminator(
  "Laptops",
  new mongoose.Schema(
    {
      platformDetails: {
        amazon: {
          prodTechInfo: laptopTechnicalSchema,
          prodPricing: prodPricingSchema,
          prodDelivery: prodDeliverySchema,
          prodSeo: prodSeoSchema,
          productInfo: prodInfoSchema,
        },
        ebay: {
          prodTechInfo: laptopTechnicalSchema,
          prodPricing: prodPricingSchema,
          prodDelivery: prodDeliverySchema,
          prodSeo: prodSeoSchema,
          productInfo: prodInfoSchema,
        },
        website: {
          prodTechInfo: laptopTechnicalSchema,
          prodPricing: prodPricingSchema,
          prodDelivery: prodDeliverySchema,
          prodSeo: prodSeoSchema,
          productInfo: prodInfoSchema,
        },
      },
    },
    options
  )
);

// descriminator for all in one pc
Product.discriminator(
  "All In One PC",
  new mongoose.Schema(
    {
      platformDetails: {
        amazon: {
          prodTechInfo: allInOnePCTechnicalSchema,
          prodPricing: prodPricingSchema,
          prodDelivery: prodDeliverySchema,
          prodSeo: prodSeoSchema,
          productInfo: prodInfoSchema,
        },
        ebay: {
          prodTechInfo: allInOnePCTechnicalSchema,
          prodPricing: prodPricingSchema,
          prodDelivery: prodDeliverySchema,
          prodSeo: prodSeoSchema,
          productInfo: prodInfoSchema,
        },
        website: {
          prodTechInfo: allInOnePCTechnicalSchema,
          prodPricing: prodPricingSchema,
          prodDelivery: prodDeliverySchema,
          prodSeo: prodSeoSchema,
          productInfo: prodInfoSchema,
        },
      },
    },
    options
  )
);

// discriminator for projectors
Product.discriminator(
  "Projectors",
  new mongoose.Schema(
    {
      platformDetails: {
        amazon: {
          prodTechInfo: projectTechnicalSchema,
          prodPricing: prodPricingSchema,
          prodDelivery: prodDeliverySchema,
          prodSeo: prodSeoSchema,
          productInfo: prodInfoSchema,
        },
        ebay: {
          prodTechInfo: projectTechnicalSchema,
          prodPricing: prodPricingSchema,
          prodDelivery: prodDeliverySchema,
          prodSeo: prodSeoSchema,
          productInfo: prodInfoSchema,
        },
        website: {
          prodTechInfo: projectTechnicalSchema,
          prodPricing: prodPricingSchema,
          prodDelivery: prodDeliverySchema,
          prodSeo: prodSeoSchema,
          productInfo: prodInfoSchema,
        },
      },
    },
    options
  )
);

// discriminator for Monitors
Product.discriminator(
  "Monitors",
  new mongoose.Schema(
    {
      platformDetails: {
        amazon: {
          prodTechInfo: monitorTechnicalSchema,
          prodPricing: prodPricingSchema,
          prodDelivery: prodDeliverySchema,
          prodSeo: prodSeoSchema,
          productInfo: prodInfoSchema,
        },
        ebay: {
          prodTechInfo: monitorTechnicalSchema,
          prodPricing: prodPricingSchema,
          prodDelivery: prodDeliverySchema,
          prodSeo: prodSeoSchema,
          productInfo: prodInfoSchema,
        },
        website: {
          prodTechInfo: monitorTechnicalSchema,
          prodPricing: prodPricingSchema,
          prodDelivery: prodDeliverySchema,
          prodSeo: prodSeoSchema,
          productInfo: prodInfoSchema,
        },
      },
    },
    options
  )
);

// discriminator for Gaming PC
Product.discriminator(
  "Gaming PC",
  new mongoose.Schema(
    {
      platformDetails: {
        amazon: {
          prodTechInfo: gamingPCTechnicalSchema,
          prodPricing: prodPricingSchema,
          prodDelivery: prodDeliverySchema,
          prodSeo: prodSeoSchema,
          productInfo: prodInfoSchema,
        },
        ebay: {
          prodTechInfo: gamingPCTechnicalSchema,
          prodPricing: prodPricingSchema,
          prodDelivery: prodDeliverySchema,
          prodSeo: prodSeoSchema,
          productInfo: prodInfoSchema,
        },
        website: {
          prodTechInfo: gamingPCTechnicalSchema,
          prodPricing: prodPricingSchema,
          prodDelivery: prodDeliverySchema,
          prodSeo: prodSeoSchema,
          productInfo: prodInfoSchema,
        },
      },
    },
    options
  )
);

// descriminator for Network Equipments
Product.discriminator(
  "Network Equipments",
  new mongoose.Schema(
    {
      platformDetails: {
        amazon: {
          prodTechInfo: networkEquipmentsTechnicalSchema,
          prodPricing: prodPricingSchema,
          prodDelivery: prodDeliverySchema,
          prodSeo: prodSeoSchema,
          productInfo: prodInfoSchema,
        },
        ebay: {
          prodTechInfo: networkEquipmentsTechnicalSchema,
          prodPricing: prodPricingSchema,
          prodDelivery: prodDeliverySchema,
          prodSeo: prodSeoSchema,
          productInfo: prodInfoSchema,
        },
        website: {
          prodTechInfo: networkEquipmentsTechnicalSchema,
          prodPricing: prodPricingSchema,
          prodDelivery: prodDeliverySchema,
          prodSeo: prodSeoSchema,
          productInfo: prodInfoSchema,
        },
      },
    },
    options
  )
);

// Export the base Product and its discriminators
export { Product };
