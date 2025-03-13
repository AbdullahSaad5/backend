import mongoose, { Schema, model } from "mongoose";
import {
  IAmazonPlatformDetails,
  IEbayPlatformDetails,
  IWebsitePlatformDetails,
  IListing,
} from "@/contracts/listing.contract";
import { invokeMap } from "lodash";

export const mediaSchema = {
  id: { type: String },
  originalname: { type: String },
  encoding: { type: String },
  mimetype: { type: String },
  size: { type: Number },
  url: { type: String },
  type: { type: String },
  filename: { type: String },
};
const options = { timestamps: true, discriminatorKey: "kind" };

const prodInfoSchema = {
  title: { type: String, required: true },
  listingDescription: { type: String },
  brand: { type: String, required: true },
  displayUnits: { type: Number, required: true },
};

const prodMediaSchema = {
  images: { type: [mediaSchema], _id: false },
  videos: { type: [mediaSchema], _id: false },
};

const prodPricingSchema = {
  // prod pricing details
  listingQuantity: { type: Number, required: true },
  discountType: { type: String, enum: ["fixed", "percentage"] },
  discountValue: { type: Number },
  condition: { type: String },
  conditionDescription: { type: String },
  pricingFormat: { type: String },
  vat: { type: Number },
  buy2andSave: { type: String },
  buy3andSave: { type: String },
  buy4andSave: { type: String },

  // paymentPolicy: {
  //   type: Schema.Types.ObjectId,
  //   ref: "PaymentPolicy",
  //   default: null,
  //   set: (value: any) => (value === "" ? null : value), // Convert empty string to null
  // },
  paymentPolicy: { type: String },
  retailPricePerUnit: { type: Number, default: 0 },
  warrantyDuration: { type: String }, // Duration in days
  warrantyCoverage: { type: String }, // Coverage description
  warrantyDocument: {
    type: [mediaSchema],
    _id: false,
  },
};
const prodDeliverySchema = {
  // prod delivery details
  postagePolicy: { type: String },
  packageWeightKg: { type: String },
  packageWeightG: { type: String },
  packageDimensionLength: { type: String },
  packageDimensionWidth: { type: String },
  packageDimensionHeight: { type: String },
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
  operatingSystem: { type: String },
  storageType: { type: String },
  features: { type: [String] },
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
  ean: { type: String, unique: true },
  series: { type: String },
  operatingSystem: { type: String },
  operatingSystemEdition: { type: String },
  storageType: { type: String },
  features: { type: [String] },
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

const projectorTechnicalSchema = {
  model: { type: String },
  type: { type: String },
  features: { type: [String] },
  connectivity: { type: String },
  unitType: { type: String },
  unitQuantity: { type: String },
  mpn: { type: String },
  ean: { type: String },
  color: { type: String },
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

  displayTechnology: { type: String },
  nativeResolution: { type: String },
  imageBrightness: { type: String },
  throwRatio: { type: String },

  aspectRatio: { type: String },
  maxResolution: { type: String },
  contrastRatio: { type: String },
  compatibleOperatingSystems: { type: String },
  californiaProp65Warning: { type: String },
  compatibleFormat: { type: String },
  lensMagnification: { type: String },
  yearManufactured: { type: String },
};

const monitorTechnicalSchema = {
  model: { type: String },
  features: { type: [String] },
  color: { type: String },
  displayType: { type: String },
  maxResolution: { type: String },
  mostSuitableFor: { type: String },
  screenSize: { type: String },
  regionOfManufacture: { type: String },
  manufacturerWarranty: { type: String },
  aspectRatio: { type: String },
  ean: { type: String, required: true },
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
  ean: { type: String, required: true },
  series: { type: String },
  operatingSystem: { type: String },
  customBundle: { type: String },
  storageType: { type: String },
  features: { type: [String] },
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
  //amazon fields below
  // recommendedBrowseNotes: { type: String, required: true },
  // bulletPoint: { type: String, required: true },
  // powerPlug: { type: String, required: true },
  // graphicsCardInterface: { type: String, required: true },
  // ramMemoryMaximumSize: { type: String, required: true },
  // ramMemoryMaximumSizeUnit: { type: String, required: true },
  // ramMemoryTechnology: { type: String, required: true },
  // humanInterfaceInput: { type: String, required: true },
  // includedComponents: { type: String, required: true },
  // specificUsesForProduct: { type: String, required: true },
  // cacheMemoryInstalledSize: { type: String, required: true },
  // cacheMemoryInstalledSizeUnit: { type: String, required: true },
  // cpuModel: { type: String, required: true },
  // cpuModelManufacturer: { type: String, required: true },
  // cpuModelNumber: { type: String, required: true },
  // cpuSocket: { type: String, required: true },
  // cpuBaseSpeed: { type: String, required: true },
  // cpuBaseSpeedUnit: { type: String, required: true },
  // graphicsRam: { type: String, required: true },
  // hardDiskDescription: { type: String, required: true },
  // hardDiskInterface: { type: String, required: true },
  // hardDiskRotationalSpeed: { type: String, required: true },
  // hardDiskRotationalSpeedUnit: { type: String, required: true },
  // totalUsb2oPorts: { type: String, required: true },
  // totalUsb3oPorts: { type: String, required: true },
  // productWarranty: { type: String, required: true },
  // gdprRisk: { type: String, required: true },
  // opticalStorageDevice: { type: String, required: true },
  // dangerousGoodsRegulation: { type: String, required: true },
  // safetyAndCompliance: { type: String, required: true },
  // manufacturer: { type: String, required: true },
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

// Define variation schema
const selectedVariationsSchema = new Schema({
  cpu: [{ type: String }], // Multiple CPU options
  ram: [{ type: String }], // Multiple RAM options
  storage: [{ type: String }], // Multiple storage options
  graphics: [{ type: String }],
  attributes: { type: Map, of: [Schema.Types.Mixed], default: {} },
});
// Main Listing Schema
const listingSchema = new Schema(
  {
    inventoryId: { type: mongoose.Schema.Types.ObjectId, ref: "Inventory", required: true },
    isBlocked: { type: Boolean, default: false },
    publishToEbay: { type: Boolean },
    publishToAmazon: { type: Boolean },
    publishToWebsite: { type: Boolean },
    status: { type: String, enum: ["draft", "published"], default: "draft" },
    isTemplate: { type: Boolean, default: false },
    stocks: [{ type: mongoose.Schema.Types.ObjectId, ref: "Stock" }],
    stockThreshold: { type: Number, default: 10 },
    selectedVariations: selectedVariationsSchema,
  },
  options
);

// Base Listing Model
const Listing = model<IListing>("Listing", listingSchema);

// discriminator for laptops
Listing.discriminator(
  "listing_laptops",
  new mongoose.Schema(
    {
      prodTechInfo: laptopTechnicalSchema,
      prodPricing: prodPricingSchema,
      prodDelivery: prodDeliverySchema,
      prodSeo: prodSeoSchema,
      productInfo: prodInfoSchema,
      prodMedia: prodMediaSchema,
    },
    options
  )
);

// discriminator for all in one pc
Listing.discriminator(
  "listing_all_in_one_pc",
  new mongoose.Schema(
    {
      prodTechInfo: allInOnePCTechnicalSchema,
      prodPricing: prodPricingSchema,
      prodDelivery: prodDeliverySchema,
      prodSeo: prodSeoSchema,
      productInfo: prodInfoSchema,
      prodMedia: prodMediaSchema,
    },
    options
  )
);

// discriminator for projectors
Listing.discriminator(
  "listing_projectors",
  new mongoose.Schema(
    {
      prodTechInfo: projectorTechnicalSchema,
      prodPricing: prodPricingSchema,
      prodDelivery: prodDeliverySchema,
      prodSeo: prodSeoSchema,
      productInfo: prodInfoSchema,
      prodMedia: prodMediaSchema,
    },
    options
  )
);

// discriminator for Monitors
Listing.discriminator(
  "listing_monitors",
  new mongoose.Schema(
    {
      prodTechInfo: monitorTechnicalSchema,
      prodPricing: prodPricingSchema,
      prodDelivery: prodDeliverySchema,
      prodSeo: prodSeoSchema,
      productInfo: prodInfoSchema,
      prodMedia: prodMediaSchema,
    },
    options
  )
);

// discriminator for Gaming PC
Listing.discriminator(
  "listing_gaming_pc",
  new mongoose.Schema(
    {
      prodTechInfo: gamingPCTechnicalSchema,
      prodPricing: prodPricingSchema,
      prodDelivery: prodDeliverySchema,
      prodSeo: prodSeoSchema,
      productInfo: prodInfoSchema,
      prodMedia: prodMediaSchema,
    },
    options
  )
);

// discriminator for Network Equipments
Listing.discriminator(
  "listing_network_equipments",
  new mongoose.Schema(
    {
      prodTechInfo: networkEquipmentsTechnicalSchema,
      prodPricing: prodPricingSchema,
      prodDelivery: prodDeliverySchema,
      prodSeo: prodSeoSchema,
      productInfo: prodInfoSchema,
      prodMedia: prodMediaSchema,
    },
    options
  )
);

// Export the base Listing and its discriminators
export { Listing };
