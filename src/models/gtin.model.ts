import mongoose, { Schema } from "mongoose";

const GtinSchema = new Schema({
  gtin: {
    type: String,
    required: true,
    // unique: true,
    trim: true,
  },
  isUsed: {
    type: Boolean,
    default: false,
  },
  usedInListing: {
    type: Schema.Types.ObjectId,
    ref: "Listing",
    default: null,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

export const Gtin = mongoose.model("Gtin", GtinSchema);
