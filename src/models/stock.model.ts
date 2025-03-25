import { IStock } from "@/contracts/stock.contract";
import mongoose, { Schema } from "mongoose";

const StockSchema = new Schema<IStock>(
  {
    inventoryId: {
      type: Schema.Types.ObjectId,
      ref: "Inventory",
      required: true,
    },

    // ✅ Store only selected variations (if inventory supports variations)
    selectedVariations: [
      {
        _id: false,
        variationId: {
          type: Schema.Types.ObjectId,
          ref: "Variation",
          required: function () {
            return this.isVariation; // Required only if variations exist
          },
        },
        costPricePerUnit: { type: Number, required: true, min: 0 },
        purchasePricePerUnit: { type: Number, required: true, min: 0 },
        totalUnits: { type: Number, required: true, min: 0 },
        usableUnits: { type: Number, required: true, min: 0 },
      },
    ],

    // ✅ Direct stock tracking if inventory has no variations
    costPricePerUnit: {
      type: Number,
      required: function () {
        return !this.isVariation; // Required only if no variations exist
      },
      min: 0,
    },
    purchasePricePerUnit: {
      type: Number,
      required: function () {
        return !this.isVariation;
      },
      min: 0,
    },
    totalUnits: {
      type: Number,
      required: function () {
        return !this.isVariation;
      },
      min: 0,
    },
    usableUnits: {
      type: Number,
      required: function () {
        return !this.isVariation;
      },
      min: 0,
    },

    batchNumber: { type: Number, unique: true, min: 0 },
    receivedDate: { type: Date, required: true, default: Date.now },
    receivedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    purchaseDate: { type: Date, default: Date.now },
    markAsStock: { type: Boolean },

    // ✅ Dynamic flag to determine if inventory has variations
    isVariation: { type: Boolean, required: true },
  },
  { timestamps: true }
);

// ✅ Pre-save hook to generate batch number automatically
StockSchema.pre<IStock>("save", async function (next) {
  if (!this.batchNumber) {
    try {
      const lastStock = await mongoose.model("Stock").findOne().sort({ batchNumber: -1 }).exec();
      this.batchNumber = lastStock ? lastStock.batchNumber + 1 : 1;
    } catch (error: any) {
      return next(error);
    }
  }
  next();
});

export const Stock = mongoose.model<IStock>("Stock", StockSchema);
