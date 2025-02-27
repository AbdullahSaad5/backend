import mongoose, { Schema, model, Document } from "mongoose";
import {
  IPaymentPolicy,
  PaymentPolicyModel,
} from "@/contracts/payment-policy.contract";

const paymentPolicySchema = new Schema<IPaymentPolicy>(
  {
    policyName: { type: String, required: true, maxlength: 64 },
    categoryTypes: [
      {
        name: {
          type: String,
          enum: ["MOTORS_VEHICLES", "ALL_EXCLUDING_MOTORS_VEHICLES"],
          required: true,
        },
      },
    ],
    marketplaceId: { type: String, required: true },
    deposit: {
      amount: {
        currency: {
          type: String,
          required: function () {
            return !!this.deposit;
          },
        },
        value: {
          type: String,
          required: function () {
            return !!this.deposit;
          },
        },
      },
      dueIn: {
        unit: {
          type: String,
          enum: ["HOUR"],
          required: function () {
            return !!this.deposit;
          },
        },
        value: {
          type: Number,
          min: 24,
          max: 72,
          required: function () {
            return !!this.deposit;
          },
        },
      },
    },
    fullPaymentDueIn: {
      unit: {
        type: String,
        enum: ["DAY"],
        required: function () {
          return !!this.categoryTypes.some(
            (c: any) => c.name === "MOTORS_VEHICLES"
          );
        },
      },
      value: {
        type: Number,
        enum: [3, 7, 10, 14],
        default: 7,
        required: function () {
          return !!this.categoryTypes.some(
            (c: any) => c.name === "MOTORS_VEHICLES"
          );
        },
      },
    },
    immediatePayment: { type: Boolean },
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
          required: function () {
            return !!this.categoryTypes.some(
              (c: any) => c.name === "MOTORS_VEHICLES"
            );
          },
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
