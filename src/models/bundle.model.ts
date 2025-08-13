import { Schema, model, Types } from "mongoose";

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

const bundleSchema = new Schema(
  {
    // Bundle Name
    name: {
      type: String,
      required: true,
      trim: true,
      unique: true,
    },

    // Promotional images with alt text
    images: { type: [mediaSchema], _id: false },
    status: { type: String, enum: ["draft", "published"], default: "draft" },
    isBlocked: { type: Boolean, default: false },
    // Items in the bundle
    items: [
      {
        productId: {
          type: Types.ObjectId,
          ref: "Inventory",
          required: true,
        },
        isPrime: { type: Boolean, default: false },
        stockId: {
          type: Types.ObjectId,
          ref: "Stock",
          required: true,
        },
        isSimpleProduct: {
          type: Boolean,
          default: false,
        },
        selectedVariations: [
          {
            variationId: {
              type: Types.ObjectId,
              ref: "Variation",
              required: true,
            },
            quantity: {
              type: Number,
              required: true,
              min: 1,
            },
            customPrice: {
              type: Number,
              required: true,
              min: 0,
            },
            _id: false,
          },
        ],
        _id: false,
      },
    ],

    // Total possible combinations in the bundle
    totalCombinations: {
      type: Number,
      required: true,
      min: 1,
    },
    selectedBundleCombinations: [
      {
        combinationName: { type: String },
        variationId: {
          type: Types.ObjectId,
          ref: "Variation",
          required: true,
        },
        totalQuantity: {
          type: Number,
          required: true,
          min: 1,
        },
        costPricePerVariationCombination: {
          type: Number,
          required: true,
          min: 0,
        },
        retailPricePerUnit: {
          type: Number,
          required: true,
          min: 0,
        },
        _id: false,
      },
    ],


    // Bundle expiration date
    validity: {
      type: Date,
      // required: true,
    },
  },
  { timestamps: true }
);

// Model for the Bundle
export const Bundle = model("Bundle", bundleSchema);
