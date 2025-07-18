import { ITaxes } from "@/contracts/taxes.contract";
import mongoose, { Schema } from "mongoose";

const TaxesSchema = new Schema<ITaxes>(
  {
    vatPercentage: { type: Number, required: true, min: 0, max: 100 },
    profitPercentage: { type: Number, min: 0, max: 100 },
    // country: { type: String, required: true },
    // state: { type: String },
  },
  { timestamps: true }
);

export const Taxes = mongoose.model<ITaxes>("Taxes", TaxesSchema);
