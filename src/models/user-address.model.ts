import mongoose, { Schema, model, Document } from "mongoose";

import {
  IUserAddress,
  UserAddressModel,
} from "@/contracts/user-address.contracts";

const AddressSchema = new Schema<IUserAddress, UserAddressModel>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    country: { type: String,  trim: true },
    address: { type: String,  trim: true },
    county: { type: String, trim: true },
    appartment: { type: String, trim: true },
    city: { type: String,  trim: true },
    postalCode: { type: String, trim: true },
    longitude: { type: Number,  },
    latitude: { type: Number,  },
    isDefault: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true },
    originalLocationMapSearch: { type: String, trim: true }, // Store the original location map search value
  },
  {
    timestamps: true,
  }
);

export const Address = model("Address", AddressSchema);
