import { Schema, model, Types } from "mongoose";
import { Variation } from "./variation.model";

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
    },

    // Promotional images with alt text
    images: { type: [mediaSchema], _id: false },
    status: { type: String, enum: ["draft", "published"], default: "draft" },
    isBlocked: { type: Boolean, default: false },
    // ✅ Store only selected variations
    selectedBundleCombinations: [
      {
        _id: false,
        variationId: {
          type: Schema.Types.ObjectId,
          ref: "Variation",
        },
        costPricePerVariationCombination: { type: Number, required: true, min: 0 },
      },
    ],
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

    // Bundle discount structure
    // discount: {
    //   type: {
    //     type: String,
    //     enum: ["percentage", "fixed" , "none"],
    //     required: true,
    //   },
    //   value: {
    //     type: Number,
    //     required: true,
    //     min: 0,
    //   },
    // },

    // Bundle expiration date
    validity: {
      type: Date,
      required: true,
    },
  },
  { timestamps: true }
);

// Model for the Bundle
export const Bundle = model("Bundle", bundleSchema);
