import mongoose, { Schema, Document } from "mongoose";

interface IPlatformData {
  stock: number;
  price: number;
  cpu: string;
  ram: string;
  sku: string;
  variationQuantity: number;
  variationPrice: string;
  storage: string;
  graphics: string;
  height: string;
  length: string;
  width: string;
}

export interface IVariation extends Document {
  productId: mongoose.Types.ObjectId;
  variationData?: {
    amazon?: IPlatformData;
    ebay?: IPlatformData;
    website?: IPlatformData;
  };
}

const PlatformDataSchema = new Schema<IPlatformData>({
  stock: { type: Number, default: 0 },
  price: { type: Number },
  cpu: { type: String },
  ram: { type: String },
  sku: { type: String },
  variationQuantity: { type: Number },
  variationPrice: { type: String },
  storage: { type: String },
  graphics: { type: String },
  height: { type: String },
  length: { type: String },
  width: { type: String },
});

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
