import { IStock } from "@/contracts/stock.contract";
import mongoose, { Schema } from "mongoose";

const StockSchema = new Schema<IStock>(
  {
    inventoryId: {
      type: Schema.Types.ObjectId,
      ref: "Inventory",
      required: true,
    },

    // ✅ Store only selected variations
    selectedVariations: [
      {
        variationId: {
          type: Schema.Types.ObjectId,
          ref: "Variation",
          required: true,
        },
        costPricePerUnit: { type: Number, required: true, min: 0 },
        purchasePricePerUnit: { type: Number, required: true, min: 0 },
        totalUnits: { type: Number, required: true, min: 0 },
        usableUnits: { type: Number, required: true, min: 0 },
      },
    ],

    batchNumber: { type: Number, unique: true, min: 0 },
    receivedDate: { type: Date, required: true, default: Date.now },
    receivedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    purchaseDate: { type: Date, default: Date.now },
    markAsStock: { type: Boolean },
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
