import { IVariation } from "@/contracts/variation.contract";
import mongoose, { model, Schema } from "mongoose";

const VariationSchema: Schema = new Schema(
  {
    inventoryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Inventory",
      required: false,
    },
    bundleId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Bundle",
      required: false,
    },
    attributes: {
      type: Map,
      of: Schema.Types.Mixed,
      required: false,
    },
    isSelected: {
      type: Boolean,
      default: false,
    },
    isBundleVariation: {
      type: Boolean,
      default: false,
    },
    variations: [
      {
        _id: false,
        stockId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Stock",
          required: true,
        },
        variationId: [
          {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Variation",
            required: false,
          },
        ],
      },
    ],
  },
  { timestamps: true }
);

export const Variation = model<IVariation>("Variation", VariationSchema);
