import { ILocation } from "@/contracts/location.contract";
import { model, Schema } from "mongoose";

const LocationSchema = new Schema<ILocation>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },
    address: {
      type: String,
      required: true,
      trim: true,
    },
    latitude: {
      type: Number,
      required: true,
      min: -90,
      max: 90,
    },
    longitude: {
      type: Number,
      required: true,
      min: -180,
      max: 180,
    },
    radius: {
      type: Number,
      required: true,
      min: 50,
      max: 1000,
      default: 100,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for geospatial queries and common filters
LocationSchema.index({ latitude: 1, longitude: 1 });
LocationSchema.index({ isActive: 1 });

export const Location = model<ILocation>("Location", LocationSchema);
