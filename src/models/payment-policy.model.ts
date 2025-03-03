import mongoose, { Schema, model, Document } from "mongoose";
import {
  IPaymentPolicy,
  PaymentPolicyModel,
} from "@/contracts/payment-policy.contract";

const paymentPolicySchema = new Schema<IPaymentPolicy>(
  {
    name: { type: String, required: true, maxlength: 64 },
    description: { type: String, maxlength: 250 },

    categoryTypes: [
      {
        name: {
          type: String,
          enum: ["ALL_EXCLUDING_MOTORS_VEHICLES"],
          required: true,
        },
      },
    ],

    marketplaceId: { type: String, required: true },

    deposit: {
      amount: {
        currency: {
          type: String,
          required: true,
        },
        value: {
          type: String,
          required: true,
        },
      },
      dueIn: {
        unit: {
          type: String,
          enum: ["HOUR"],
          required: true,
        },
        value: {
          type: Number,
          enum: [24, 48, 72], // Allowed values per docs
          default: 48,
          required: true,
        },
      },
    },

    fullPaymentDueIn: {
      unit: {
        type: String,
        enum: ["DAY"],
        required: true,
      },
      value: {
        type: Number,
        enum: [3, 7, 10, 14], // Allowed values per docs
        default: 7,
        required: true,
      },
    },

    immediatePay: { type: Boolean, default: false },

    paymentMethods: [
      {
        paymentMethodType: {
          type: String,
          enum: [
            "CASH_ON_PICKUP",
            "CASHIER_CHECK",
            "MONEY_ORDER",
            "PERSONAL_CHECK",
          ],
          required: true,
        },
      },
    ],
  },
  { timestamps: true }
);

export const PaymentPolicy = model<IPaymentPolicy, PaymentPolicyModel>(
  "PaymentPolicy",
  paymentPolicySchema
);
