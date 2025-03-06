import mongoose, { Schema, Document } from "mongoose";

// Interface for platform-specific variation data
interface IPlatformData {
  stock: number;

  sku: string;

  variationPrice: string;
  parts: Record<string, string | number>; // 👈 Stores dynamic attributes
}

// Interface for the Variation document
export interface IVariation extends Document {
  productId: mongoose.Types.ObjectId;
  variationData?: {
    amazon?: IPlatformData;
    ebay?: IPlatformData;
    website?: IPlatformData;
  };
}

// Schema for PlatformData
const PlatformDataSchema = new Schema<IPlatformData>({
  // stock: { type: Number, default: 0 },

  sku: { type: String },

  variationPrice: { type: String },
  parts: { type: Map, of: Schema.Types.Mixed, default: {} }, // 👈 Stores dynamic properties
  //variations will contain parts' objects ids in array[id1,id2,id3,...]
  // variations: [{ type: Schema.Types.ObjectId, ref: "Variation" }],
});

// Schema for Variation
const VariationSchema = new Schema<IVariation>(
  {
    productId: { type: Schema.Types.ObjectId, ref: "Product", required: true },
    variationData: {
      amazon: PlatformDataSchema,
      ebay: PlatformDataSchema,
      website: PlatformDataSchema,
    },
  },
  { timestamps: true }
);

export const Variation = mongoose.model<IVariation>(
  "Variation",
  VariationSchema
);
