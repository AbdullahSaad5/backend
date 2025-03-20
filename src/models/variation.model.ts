import { IVariation } from "@/contracts/variation.contract";
import mongoose, { model, Schema } from "mongoose";

// Define Mongoose schema for individual variations
const VariationSchema: Schema = new Schema(
  {
    inventoryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Inventory",
      required: true,
    },
    attributes: {
      type: Map,
      of: Schema.Types.Mixed,
      required: true,
    },
    isSelected: { type: Boolean, default: false },
  },
  { timestamps: true } // Adds createdAt and updatedAt fields
);

export const Variation = model<IVariation>("Variation", VariationSchema);
