import { IStock } from "@/contracts/stock.contract";
import mongoose, { Schema, Document } from "mongoose";

const mediaSchema = new Schema({
  id: { type: String },
  originalname: { type: String },
  encoding: { type: String },
  mimetype: { type: String },
  size: { type: Number },
  url: { type: String },
  type: { type: String },
  filename: { type: String },
}, { _id: false });
interface IStockModel extends IStock, Document {
  isVariation: boolean;
}

const StockSchema = new Schema<IStockModel>(
  {
    inventoryId: {
      type: Schema.Types.ObjectId,
      ref: "Inventory",
      required: true,
    },
    productSupplier: { type: Schema.Types.ObjectId, ref: "User", required: true },

    // ✅ Store only selected variations if isVariation: true
    selectedVariations: [
      {
        _id: false,
        variationId: {
          type: Schema.Types.ObjectId,
          ref: "Variation",
          required: function () {
            return (this as IStockModel).isVariation;
          },
        },
        costPricePerUnit: { type: Number, required: true, min: 0 },
        retailPricePerUnit: { type: Number, required: true, min: 0 },
        purchasePricePerUnit: { type: Number, required: true, min: 0 },
        totalUnits: { type: Number, required: true, min: 0 },
        usableUnits: { type: Number, required: true, min: 0 },
      },
    ],

    // ✅ Direct stock fields if isVariation: false
    totalUnits: {
      type: Number,
      required: function () {
        return !(this as IStockModel).isVariation;
      },
      min: 0,
    },
    usableUnits: {
      type: Number,
      required: function () {
        return !(this as IStockModel).isVariation;
      },
      min: 0,
    },
    costPricePerUnit: {
      type: Number,
      required: function () {
        return !(this as IStockModel).isVariation;
      },
      min: 0,
    },
    retailPricePerUnit: {
      type: Number,
      required: function () {
        return !(this as IStockModel).isVariation;
      },
      min: 0,
    },
    purchasePricePerUnit: {
      type: Number,
      required: function () {
        return !(this as IStockModel).isVariation;
      },
      min: 0,
    },

    priceBreakdown: [
      {
        _id: false,
        name: { type: String, required: true },
        value: { type: Schema.Types.Mixed, required: true },
        comment: { type: String, required: false },
      },
    ],
    stockInvoice: mediaSchema,
    batchNumber: { type: Number, min: 0 },
    receivedDate: { type: Date, required: true, default: Date.now },
    receivedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    purchaseDate: { type: Date, default: Date.now },
    markAsStock: { type: Boolean },
    images: [mediaSchema],
    videos: [mediaSchema],
  },
  { timestamps: true }
);

// ✅ Virtual property to check if Inventory has variations
StockSchema.virtual("isVariation").get(async function () {
  const inventory = await mongoose.model("Inventory").findById(this.inventoryId);
  return inventory ? inventory.isVariation : false;
});

// ✅ Pre-save hook to generate batch number automatically
StockSchema.pre<IStockModel>("save", async function (next) {
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

export const Stock = mongoose.model<IStockModel>("Stock", StockSchema);
