import { IStock } from "@/contracts/stock.contract";
import mongoose, { Schema } from "mongoose";

const StockSchema = new Schema<IStock>(
  {
    productId: {
      type: Schema.Types.ObjectId,
      ref: "Product",
      required: true,
    },
    // stockSupplier: {
    //   type: Schema.Types.ObjectId,
    //   ref: "User",
    //   required: true,
    // },
    quantity: { type: Number, required: true, min: 0 },
    purchasePricePerUnit: { type: Number, required: true, min: 0 },
    costPricePerUnit: { type: Number, required: true, min: 0 },
    retailPricePerUnit: { type: Number, min: 0 },
    batchNumber: { type: Number,  unique: true, min: 0 },
    receivedDate: { type: Date, required: true, default: Date.now },
    purchaseDate: { type: Date, default: Date.now },
  },
  { timestamps: true }
);
// Pre-save hook to generate batch number automatically
StockSchema.pre<IStock>("save", async function (next) {
  if (!this.batchNumber) {
    try {
      // Find the latest batchNumber
      const lastStock = await mongoose
        .model("Stock")
        .findOne()
        .sort({ batchNumber: -1 })
        .exec();

      // If there's no stock found, initialize batchNumber to 1
      const newBatchNumber = lastStock ? lastStock.batchNumber + 1 : 1;

      this.batchNumber = newBatchNumber;
    } catch (error: any) {
      return next(error);
    }
  }
  next();
});

export const Stock = mongoose.model<IStock>("Stock", StockSchema);
