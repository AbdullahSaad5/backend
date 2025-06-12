import _ from "lodash";
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
  amazonCategoryId: { type: String },
  // productSupplier: { type: Schema.Types.ObjectId, ref: "User", required: true },
  item_name: [
    {
      _id: false,
      value: { type: String, required: true },
      language_tag: { type: String, default: "en_UK" },
      marketplace_id: { type: String, default: "A1F83G8C2ARO7P", required: true },
    },
  ],
  product_description: [
    {
       _id: false,
      value: { type: String, required: true },
      language_tag: { type: String, default: "en_UK" },
      marketplace_id: { type: String, default: "A1F83G8C2ARO7P" },
    },
  ],
  inventoryImages: { type: [mediaSchema], _id: false },
  inventoryCondition: { type: String, enum: ["used", "new", "refurbished"] },
  brand: [
    {
       _id: false,
      value: { type: String, required: true },
      marketplace_id: { type: String, default: "A1F83G8C2ARO7P", required: true },
    },
  ],
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
Inventory.schema.index({ ean: 1 }, { unique: false });
export { Inventory };
