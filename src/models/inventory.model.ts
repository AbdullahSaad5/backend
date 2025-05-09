import mongoose, { Schema, model } from "mongoose";

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

// part tchnical schema
export const partsTechnicalSchema = {
  // attributes: {
  type: Map,
  of: Schema.Types.Mixed,
  required: false,
};

// product technical schema
export const productsTechnicalSchema = {
  // attributes: {
  type: Map,
  of: Schema.Types.Mixed,
  required: false,
};

// prod info scema
export const prodInfoSchema = {
  productCategory: { type: Schema.Types.ObjectId, ref: "ProductCategory", required: true },
  ebayCategoryId: { type: String },
  // productSupplier: { type: Schema.Types.ObjectId, ref: "User", required: true },
  title: { type: String, required: true },
  description: { type: String },
  inventoryImages: { type: [mediaSchema], _id: false },
  inventoryCondition: { type: String, enum: ["used", "new"] },
  brand: { type: [String], required: true },
};

// Main Inventory Schema
const inventorySchema = new Schema(
  {
    isBlocked: { type: Boolean, default: false },
    publishToEbay: { type: Boolean },
    publishToAmazon: { type: Boolean },
    publishToWebsite: { type: Boolean },
    kind: { type: String },
    status: { type: String, enum: ["draft", "published"], default: "draft" },
    isVariation: { type: Boolean, default: false },
    isMultiBrand: { type: Boolean, default: false },
    isTemplate: { type: Boolean, default: false },
    alias: { type: String },
    isPart: { type: Boolean, default: false },

    stocks: [{ type: mongoose.Schema.Types.ObjectId, ref: "Stock" }],
    stockThreshold: { type: Number, default: 10 },
  },
  { ...options, collection: "inventory" }
);
// Compound Index to ensure unique alias across all documents in the 'inventory' collection
inventorySchema.index({ alias: 1 }, { unique: false });
// Base Inventory Model
const Inventory = model("Inventory", inventorySchema);

// discriminator for part
Inventory.discriminator(
  "part",
  new mongoose.Schema({ prodTechInfo: partsTechnicalSchema, productInfo: prodInfoSchema }, options)
);

// discriminator for product
Inventory.discriminator(
  "product",
  new mongoose.Schema({ prodTechInfo: productsTechnicalSchema, productInfo: prodInfoSchema }, options)
);

// old schemas for each product category
// export const laptopTechnicalSchema = {
//   processor: { type: [String], required: true },
//   model: { type: [String] },
//   operatingSystem: { type: String },
//   storageType: { type: [String] },
//   features: { type: [String] },
//   ssdCapacity: { type: [String] },
//   gpu: { type: String },
//   unitType: { type: String },
//   unitQuantity: { type: String },
//   mpn: { type: String },
//   processorSpeed: { type: String },
//   series: { type: String },
//   ramSize: { type: [String] },
//   californiaProp65Warning: { type: String },
//   type: { type: String },
//   releaseYear: { type: String },
//   hardDriveCapacity: { type: [String] },
//   color: { type: [String] },
//   maxResolution: { type: String },
//   mostSuitableFor: { type: [String] },
//   screenSize: { type: [String], required: true },
//   graphicsProcessingType: { type: String },
//   connectivity: { type: [String] },
//   manufacturerWarranty: { type: String },
//   regionOfManufacture: { type: String },
//   height: { type: String },
//   length: { type: String },
//   weight: { type: String },
//   width: { type: String },
// };

// export const allInOnePCTechnicalSchema = {
//   processor: { type: [String] },
//   model: { type: [String] },
//   memory: { type: [String] },
//   maxRamCapacity: { type: String },
//   unitType: { type: String },
//   unitQuantity: { type: String },
//   mpn: { type: String },
//   processorSpeed: { type: String },
//   series: { type: String },
//   ramSize: { type: [String] },
//   formFactor: { type: String },
//   motherboardModel: { type: String },
//   ean: { type: String },
//   operatingSystem: { type: [String] },
//   operatingSystemEdition: { type: String },
//   storageType: { type: [String] },
//   features: { type: [String] },
//   ssdCapacity: { type: [String] },
//   gpu: { type: [String] },
//   type: { type: String },
//   releaseYear: { type: String },
//   inventoryType: { type: String, default: "All In One PC" },
//   hardDriveCapacity: { type: [String] },
//   color: { type: [String] },
//   mostSuitableFor: { type: [String] },
//   screenSize: { type: [String] },
//   graphicsProcessingType: { type: String },
//   connectivity: { type: [String] },
//   manufacturerWarranty: { type: String },
//   regionOfManufacture: { type: String },
//   height: { type: String },
//   length: { type: String },
//   width: { type: String },
// };

// export const miniPCTechnicalSchema = {
//   processor: { type: [String] },
//   model: { type: [String] },
//   memory: { type: [String] },
//   maxRamCapacity: { type: String },
//   unitType: { type: String },
//   unitQuantity: { type: String },
//   mpn: { type: String },
//   processorSpeed: { type: String },
//   series: { type: String },
//   ramSize: { type: [String] },
//   formFactor: { type: String },
//   motherboardModel: { type: String },
//   ean: { type: String },
//   operatingSystem: { type: [String] },
//   operatingSystemEdition: { type: String },
//   storageType: { type: [String] },
//   features: { type: [String] },
//   ssdCapacity: { type: [String] },
//   gpu: { type: [String] },
//   type: { type: String },
//   releaseYear: { type: String },
//   inventoryType: { type: String, default: "Mini PC" },
//   hardDriveCapacity: { type: [String] },
//   color: { type: [String] },
//   mostSuitableFor: { type: [String] },
//   screenSize: { type: String },
//   graphicsProcessingType: { type: String },
//   connectivity: { type: [String] },
//   manufacturerWarranty: { type: String },
//   regionOfManufacture: { type: String },
//   height: { type: String },
//   length: { type: String },
//   width: { type: String },
// };

// export const projectorTechnicalSchema = {
//   model: { type: [String] },
//   type: { type: [String] },
//   features: { type: [String] },
//   connectivity: { type: [String] },
//   unitType: { type: String },
//   unitQuantity: { type: String },
//   mpn: { type: String }, //
//   ean: { type: String },
//   color: { type: [String] },
//   numberOfLANPorts: { type: String },
//   maximumWirelessData: { type: String },
//   maximumLANDataRate: { type: String },
//   ports: { type: [String] },
//   toFit: { type: [String] },
//   manufacturerWarranty: { type: String },
//   regionOfManufacture: { type: String },
//   height: { type: String },
//   length: { type: String },
//   width: { type: String },
//   displayTechnology: { type: String },
//   nativeResolution: { type: String },
//   imageBrightness: { type: String },
//   throwRatio: { type: String },
//   aspectRatio: { type: String },
//   maxResolution: { type: String },
//   contrastRatio: { type: String },
//   compatibleOperatingSystem: { type: String },
//   californiaProp65Warning: { type: String },
//   compatibleFormat: { type: String },
//   lensMagnification: { type: String },
//   yearManufactured: { type: String },
// };

// export const monitorTechnicalSchema = {
//   model: { type: [String] },
//   features: { type: [String] },
//   color: { type: [String] },
//   displayType: { type: String },
//   maxResolution: { type: String },
//   mostSuitableFor: { type: [String] },
//   screenSize: { type: [String] },
//   regionOfManufacture: { type: String },
//   manufacturerWarranty: { type: String },
//   aspectRatio: { type: String },
//   ean: { type: String },
//   mpn: { type: String },
//   unitType: { type: String },
//   unitQuantity: { type: String },
//   energyEfficiencyRating: { type: String },
//   videoInputs: { type: String },
//   refreshRate: { type: String },
//   responseTime: { type: String },
//   brightness: { type: String },
//   contrastRatio: { type: String },
//   ecRange: { type: String },
//   productLine: { type: String },
//   height: { type: String },
//   length: { type: String },
//   width: { type: String },
//   // Newly added fields to match front-end initialValues
//   energyStar: { type: String },
//   connectivity: { type: [String] },
//   californiaProp65Warning: { type: String },
//   imageBrightness: { type: String },
//   throwRatio: { type: String },
//   compatibleOperatingSystem: { type: String },
//   compatibleFormat: { type: String },
//   lensMagnification: { type: String },
//   yearManufactured: { type: String },
//   nativeResolution: { type: String },
//   displayTechnology: { type: String },
//   weight: { type: String },
// };

// export const gamingPCTechnicalSchema = {
//   processor: { type: [String] },
//   model: { type: [String] },
//   maxRamCapacity: { type: String },
//   unitType: { type: String },
//   unitQuantity: { type: String },
//   mpn: { type: String },
//   type: { type: String },
//   processorSpeed: { type: [String] },
//   ramSize: { type: [String] },
//   formFactor: { type: [String] },
//   motherboardModel: { type: String },
//   ean: { type: String },
//   series: { type: String },
//   operatingSystem: { type: String },
//   customBundle: { type: String },
//   storageType: { type: [String] },
//   features: { type: [String] },
//   ssdCapacity: { type: [String] },
//   gpu: { type: [String] },
//   releaseYear: { type: String },
//   hardDriveCapacity: { type: [String] },
//   color: { type: [String] },
//   mostSuitableFor: { type: [String] },
//   screenSize: { type: [String] },
//   graphicsProcessingType: { type: String },
//   connectivity: { type: [String] },
//   manufacturerWarranty: { type: String },
//   regionOfManufacture: { type: String },
//   height: { type: String },
//   length: { type: String },
//   width: { type: String },
// };

// export const networkEquipmentsTechnicalSchema = {
//   model: { type: [String] },
//   maxRamCapacity: { type: String },
//   unitQuantity: { type: String },
//   unitType: { type: String },
//   productLine: { type: String },
//   mpn: { type: String },
//   type: { type: String },
//   ramSize: { type: [String] },
//   formFactor: { type: [String] },
//   ean: { type: String },
//   manufacturerWarranty: { type: String },
//   regionOfManufacture: { type: String },
//   interface: { type: String },
//   networkConnectivity: { type: String },
//   networkManagementType: { type: String },
//   networkType: { type: String },
//   processorManufacturer: { type: String },
//   numberOfProcessors: { type: [String] },
//   numberOfLANPorts: { type: [String] },
//   numberOfVANPorts: { type: String },
//   processorType: { type: String },
//   raidLevel: { type: String },
//   memoryType: { type: String },
//   processorSpeed: { type: [String] },
//   deviceConnectivity: { type: String },
//   connectorType: { type: String },
//   supportedWirelessProtocol: { type: String },
//   height: { type: String },
//   length: { type: String },
//   width: { type: String },
// };

// old descriminators for each product category

// // discriminator for laptops
// Inventory.discriminator(
//   "inventory_laptops",
//   new mongoose.Schema({ prodTechInfo: laptopTechnicalSchema, productInfo: prodInfoSchema }, options)
// );

// // discriminator for all in one pc
// Inventory.discriminator(
//   "inventory_all_in_one_pc",
//   new mongoose.Schema({ prodTechInfo: allInOnePCTechnicalSchema, productInfo: prodInfoSchema }, options)
// );

// // discriminator for mini pc
// Inventory.discriminator(
//   "inventory_mini_pc",
//   new mongoose.Schema({ prodTechInfo: miniPCTechnicalSchema, productInfo: prodInfoSchema }, options)
// );

// // discriminator for projectors
// Inventory.discriminator(
//   "inventory_projectors",
//   new mongoose.Schema({ prodTechInfo: projectorTechnicalSchema, productInfo: prodInfoSchema }, options)
// );

// // discriminator for Monitors
// Inventory.discriminator(
//   "inventory_monitors",
//   new mongoose.Schema({ prodTechInfo: monitorTechnicalSchema, productInfo: prodInfoSchema }, options)
// );

// // discriminator for Gaming PC
// Inventory.discriminator(
//   "inventory_gaming_pc",
//   new mongoose.Schema({ prodTechInfo: gamingPCTechnicalSchema, productInfo: prodInfoSchema }, options)
// );

// // discriminator for Network Equipments
// Inventory.discriminator(
//   "inventory_network_equipments",
//   new mongoose.Schema({ prodTechInfo: networkEquipmentsTechnicalSchema, productInfo: prodInfoSchema }, options)
// );

// Compound index to ensure ean uniqueness across all discriminators (inventory_laptops, etc.)
Inventory.schema.index({ ean: 1 }, { unique: false });
export { Inventory };
