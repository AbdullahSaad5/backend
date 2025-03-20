import { IVariation } from "@/contracts/variation.contract";
import mongoose, { model, Schema } from "mongoose";

// Define Mongoose schema
const VariationSchema: Schema = new Schema(
  {
    inventoryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Inventory",
      required: true,
    },
    availableForListing: { type: Boolean, default: false },
    variations: [
      {
        _id: {
          type: mongoose.Schema.Types.ObjectId,
          auto: true, // Auto-generate unique ID for each variation
        },
        type: Map, // Allows dynamic key-value attributes
        of: Schema.Types.Mixed, // Accepts any type (string, number, etc.)
        isSelected: { type: Boolean, default: false }, // Field to track selection status
      },
    ],
  },
  { timestamps: true } // Adds createdAt and updatedAt fields
);

export const Variation = model<IVariation>("Variation", VariationSchema);
