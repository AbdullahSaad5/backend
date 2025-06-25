import mongoose, { Schema } from "mongoose";

const GtinSchema = new Schema({
  gtinNumber: {
    type: String,
    required: true,
    unique: true, // Ensure GTINs are unique
  },
  isUsed: {
    type: Boolean,
    default: false, // Initially, GTIN is not used
  },
});

export const GTIN = mongoose.model("GTIN", GtinSchema);
