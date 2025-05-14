import mongoose, { Schema, model } from "mongoose";
import { IListing } from "@/contracts/listing.contract";

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
  title: { type: String, required: true, maxlength: 80 },
  sku: { type: String, required: true },

  productCategory: { type: Schema.Types.ObjectId, ref: "ProductCategory" },
  description: { type: String },
  brand: { type: [String], required: true },
  displayUnits: { type: Number, required: true },
};

const prodMediaSchema = {
  images: { type: [mediaSchema], _id: false },
  videos: { type: [mediaSchema], _id: false },
};

const prodPricingSchema = {
  // prod pricing details
  discountType: { type: String, enum: ["fixed", "percentage"] },
  discountValue: { type: Number },
  condition: { type: String },
  conditionDescription: { type: String },
  pricingFormat: { type: String },
  vat: { type: Number },
  buy2andSave: { type: String },
  buy3andSave: { type: String },
  buy4andSave: { type: String },
  paymentPolicy: { type: String },
  selectedAttributes: {
    type: Map,
    of: [String], // each value is an array of strings
    required: false,
  },
  listingWithoutStockVariations: [
    new Schema(
      {
        retailPrice: { type: Number, required: true, default: 0 },
        images: { type: [mediaSchema], _id: false },
        listingQuantity: { type: Number, required: true, default: 0 },
        discountValue: { type: Number },

        // Allow any extra dynamic keys
      },
      { _id: true, strict: false } // 👈 this line allows undefined fields (dynamic attributes)
    ),
  ],
  selectedVariations: [
    {
      _id: false,
      variationId: {
        type: Schema.Types.ObjectId,
        ref: "Variation",
        required: function (): boolean {
          return (this as any).isVariation;
        },
      },
      retailPrice: { type: Number, required: true, default: 0 },
      images: { type: [mediaSchema], _id: false },
      listingQuantity: { type: Number, required: true, default: 0 },
      discountValue: { type: Number },
    },
  ],
  retailPrice: {
    type: Number,
    required: function () {
      return !(this as any).isVariation;
    },
    min: 0,
  },
  listingQuantity: {
    type: Number,
    required: function () {
      return !(this as any).isVariation;
    },
    min: 0,
  },
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
    selectedStockId: { type: mongoose.Schema.Types.ObjectId, ref: "Stock", required: false },
    listingHasVariations: { type: Boolean, default: false },
    listingwithStock: { type: Boolean, default: true },
    ebayItemId: { type: String },
    ebaySandboxUrl: { type: String },
    offerId: { type: String },
    isBlocked: { type: Boolean, default: false },
    publishToEbay: { type: Boolean, default: false },
    publishToAmazon: { type: Boolean, default: false },
    publishToWebsite: { type: Boolean, default: false },
    status: { type: String, enum: ["draft", "published"], default: "draft" },
    isTemplate: { type: Boolean, default: false },
    alias: { type: String },
    stocks: [{ type: mongoose.Schema.Types.ObjectId, ref: "Stock" }],
    stockThreshold: { type: Number, default: 10 },
    selectedVariations: selectedVariationsSchema,
  },
  options
);
// ✅ Virtual property to check if Inventory has variations
listingSchema.virtual("isVariation").get(async function () {
  const inventory = await mongoose.model("Inventory").findById(this.inventoryId);
  return inventory ? inventory.isVariation : false;
});
listingSchema.index({ alias: 1 }, { unique: false });

// Base Listing Model
const Listing = model<IListing>("Listing", listingSchema);

// discriminator for product
Listing.discriminator(
  "listing_product",
  new mongoose.Schema(
    {
      prodTechInfo: productsTechnicalSchema,
      prodPricing: prodPricingSchema,
      prodDelivery: prodDeliverySchema,
      prodSeo: prodSeoSchema,
      productInfo: prodInfoSchema,
      prodMedia: prodMediaSchema,
    },
    options
  )
);

// discriminator for part
Listing.discriminator(
  "listing_part",
  new mongoose.Schema(
    {
      prodTechInfo: partsTechnicalSchema,
      prodPricing: prodPricingSchema,
      prodDelivery: prodDeliverySchema,
      prodSeo: prodSeoSchema,
      productInfo: prodInfoSchema,
      prodMedia: prodMediaSchema,
    },
    options
  )
);
Listing.schema.index({ ean: 1 }, { unique: false });
// Export the base Listing and its discriminators
export { Listing };
