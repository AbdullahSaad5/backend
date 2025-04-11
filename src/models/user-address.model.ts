import mongoose, { Schema, model, Document } from "mongoose";

import {
  IUserAddress,
  UserAddressModel,
} from "@/contracts/user-address.contracts";

const AddressSchema = new Schema<IUserAddress, UserAddressModel>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User" },
    country: { type: String },
    address: { type: String },
    label: { type: String },
    appartment: { type: String },
    city: { type: String },
    postalCode: { type: String },
    isDefault: { type: Boolean },
  },
  {
    timestamps: true,
  }
);

export const Address = model("Address", AddressSchema);
