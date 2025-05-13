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
    },

    // Promotional images with alt text
    images: { type: [mediaSchema], _id: false },


    // Items in the bundle
    items: [
      {
        productId: {
          type: Types.ObjectId,
          ref: "Inventory",
          required: true,
        },
        variationId: [{
          type: Types.ObjectId,
          ref: "Variation",
          required: false,
        }],
        stockId: {
          type: Types.ObjectId,
          ref: "Stock",
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
        },
        _id: false 
      },
      
    ],

    // Bundle discount structure
    discount: {
      type: {
        type: String,
        enum: ["percentage", "fixed" , "none"],
        required: true,
      },
      value: {
        type: Number,
        required: true,
        min: 0,
      },
    },

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
