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
  sku: { type: String },

  productCategory: { type: Schema.Types.ObjectId, ref: "ProductCategory" },

  displayUnits: { type: Number, required: true },

  item_name: [
    {
      _id: false,
      value: { type: String, required: true },
      language_tag: { type: String, default: "en_GB" },
      marketplace_id: { type: String, default: "A1F83G8C2ARO7P", required: true },
    },
  ],
  condition_type: [
    {
      _id: false,
      value: {
        type: String,
        enum: [
          "collectible_acceptable",
          "collectible_good",
          "collectible_like_new",
          "collectible_very_good",
          "new_new",
          "new_oem",
          "new_open_box",
          "refurbished_refurbished",
          "used_acceptable",
          "used_good",
          "used_like_new",
          "used_very_good",
        ],
        default: "new_new",
      },

      marketplace_id: { type: String, default: "A1F83G8C2ARO7P" },
    },
  ],
  product_description: [
    {
      _id: false,
      value: { type: String, required: true },
      language_tag: { type: String, default: "en_GB" },
      marketplace_id: { type: String, default: "A1F83G8C2ARO7P" },
    },
  ],
  brand: [
    {
      _id: false,
      value: { type: String, required: true },
      marketplace_id: { type: String, default: "A1F83G8C2ARO7P", required: true },
    },
  ],
};

const prodMediaSchema = {
  images: { type: [mediaSchema], _id: false, maxlength: 9 },
  offerImages: { type: [mediaSchema], _id: false, maxlength: 6 },
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
        images: { type: [mediaSchema], _id: false, maxlength: 9 },
        listingQuantity: { type: Number, required: true, default: 0 },
        discountValue: { type: Number },

        // Allow any extra dynamic keys
      },
      { _id: true, strict: false } // 👈 this line allows undefined fields (dynamic attributes)
    ),
  ],

  currentEbayVariationsSKU: { type: [String] },
  currentAmazonVariationsSKU: { type: [String] },
  amazonVariationStatus: {
    parentCreated: { type: Boolean, default: false },
    lastUpdated: { type: Date, default: Date.now },
    totalAttempted: { type: Number, default: 0 },
    successful: [
      {
        childSku: String,
        variationIndex: Number,
        variationId: String,
        status: String,
        retailPrice: String,
        listingQuantity: String,
        createdAt: { type: Date, default: Date.now },
      },
    ],
    failed: [
      {
        childSku: String,
        variationIndex: Number,
        variationId: String,
        error: String,
        status: String,
        amazonResponse: Object,
        failedAt: { type: Date, default: Date.now },
      },
    ],
  },
  variationHistory: [
    {
      childSku: String,
      variationId: String,
      action: { type: String, enum: ["created", "updated", "deleted"] },
      timestamp: { type: Date, default: Date.now },
      retailPrice: String,
      listingQuantity: String,
      details: Object,
    },
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
      images: { type: [mediaSchema], _id: false, maxlength: 9 },
      offerImages: { type: [mediaSchema], _id: false, maxlength: 6 },
      listingQuantity: { type: Number, required: true, default: 0 },
      variationName: { type: String },
      discountValue: { type: Number },
      enableEbayListing: { type: Boolean, default: false },
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
  irregularPackage: { type: Boolean },

  item_package_dimensions: [
    {
      _id: false,
      length: { value: { type: Number }, unit: { type: String, default: "centimeters" } },
      width: { value: { type: Number }, unit: { type: String, default: "centimeters" } },
      height: { value: { type: Number }, unit: { type: String, default: "centimeters" } },
      marketplace_id: { type: String, default: "A1F83G8C2ARO7P" },
    },
  ],

  item_package_weight: [
    {
      _id: false,
      value: { type: Number },
      unit: { type: String, default: "grams" },
      marketplace_id: { type: String, default: "A1F83G8C2ARO7P" },
    },
  ],
  item_display_weight: [
    {
      _id: false,
      value: { type: Number, required: true },
      unit: { type: String, default: "grams" },
      marketplace_id: { type: String, default: "A1F83G8C2ARO7P" },
    },
  ],
  epr_product_packaging: [
    {
      _id: false,
      main_material: {
        type: String,
        enum: ["ceramic", "glass", "metal", "paper", "plastic", "textile", "wood"],
      },
      granular_materials: [
        {
          _id: false,
          granular_material: { type: String },
          weight: {
            _id: false,
            value: { type: Number },
            unit: { type: String, default: "grams" },
          },
          recycled_content_percentage: { type: Number, min: 0, max: 100 },
        },
      ],
      marketplace_id: { type: String, default: "A1F83G8C2ARO7P" },
    },
  ],
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
    inventoryId: { type: mongoose.Schema.Types.ObjectId, ref: "Inventory", required: false },
    bundleId: { type: mongoose.Schema.Types.ObjectId, ref: "Bundle", required: false },
    selectedStockId: { type: mongoose.Schema.Types.ObjectId, ref: "Stock", required: false },
    listingType: { type: String, enum: ["product", "part", "bundle"] },
    listingHasVariations: { type: Boolean, default: false },
    listingWithStock: { type: Boolean, default: true },
    ebayItemId: { type: String },
    ebaySandboxUrl: { type: String },
    amazonSubmissionId: { type: String },
    amazonSku: { type: String },
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
