import mongoose, { Schema, Document } from "mongoose";

// Interface for platform-specific variation data
interface IPlatformData {
  stock: number;
  price: number;
  sku: string;
  variationQuantity: number;
  variationPrice: string;
  attributes: Record<string, string | number>; // 👈 Stores dynamic attributes
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
  stock: { type: Number, default: 0 },
  price: { type: Number },
  sku: { type: String },
  variationQuantity: { type: Number },
  variationPrice: { type: String },
  attributes: { type: Map, of: Schema.Types.Mixed, default: {} }, // 👈 Stores dynamic properties
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
