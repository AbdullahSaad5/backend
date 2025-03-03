import mongoose, { Schema, model } from "mongoose";
import {
  IReturnPolicy,
  ReturnPolicyModel,
} from "@/contracts/return-policy.contract";

const returnPolicySchema = new Schema<IReturnPolicy>(
  {
    name: { type: String, required: true, maxlength: 64 },
    description: { type: String, maxlength: 250 },
    isBlocked: { type: Boolean, default: false },
    marketplaceId: { type: String, required: true },

    categoryTypes: [
      {
        name: {
          type: String,
          required: true,
          enum: ["ALL_EXCLUDING_MOTORS_VEHICLES"],
        },
      },
    ],

    returnsAccepted: { type: Boolean, required: true },
    returnPeriod: {
      unit: {
        type: String,
        enum: ["DAY"],
        required: true,
      },
      value: {
        type: Number,
        enum: [30, 60],
        required: true,
      },
    },

    returnShippingCostPayer: {
      type: String,
      enum: ["BUYER", "SELLER"],
      required: true,
    },

    refundMethod: {
      type: String,
      enum: ["MONEY_BACK"], // Defaulting to MONEY_BACK per eBay docs
      default: "MONEY_BACK",
    },

    returnMethod: {
      type: String,
      enum: ["REPLACEMENT", "MONEY_BACK"],
    },

    returnInstructions: { type: String, maxlength: 5000 },

    internationalOverride: {
      returnsAccepted: { type: Boolean },
      returnPeriod: {
        unit: {
          type: String,
          enum: ["DAY"],
          required: true,
        },
        value: {
          type: Number,
          enum: [30, 60],
          required: true,
        },
      },
      returnShippingCostPayer: {
        type: String,
        enum: ["BUYER", "SELLER"],
        required: true,
      },
    },
  },
  { timestamps: true }
);

export const ReturnPolicy = model<IReturnPolicy, ReturnPolicyModel>(
  "ReturnPolicy",
  returnPolicySchema
);
