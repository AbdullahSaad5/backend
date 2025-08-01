import mongoose, { Schema, model, Document } from "mongoose";

import {
  IUserAddress,
  UserAddressModel,
} from "@/contracts/user-address.contracts";

const AddressSchema = new Schema<IUserAddress, UserAddressModel>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    country: { type: String, required: true, trim: true },
    address: { type: String, required: true, trim: true },
    county: { type: String, trim: true },
    appartment: { type: String, trim: true },
    city: { type: String, required: true, trim: true },
    postalCode: { type: String, required: true, trim: true },
    longitude: { type: Number, required: true },
    latitude: { type: Number, required: true },
    isDefault: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true },
  },
  {
    timestamps: true,
  }
);

export const Address = model("Address", AddressSchema);
