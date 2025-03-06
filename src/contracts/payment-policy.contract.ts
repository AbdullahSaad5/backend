import { Document, Model, Types } from "mongoose";

export interface IPaymentPolicy extends Document {
  policyName: string;
  policyDescription: string;
  immediatePayment: boolean;
  cashOnPickUp: boolean;
  isBlocked: boolean;
  categoryTypes: {
    name: "MOTORS_VEHICLES" | "ALL_EXCLUDING_MOTORS_VEHICLES";
  }[];
  marketplaceId: string;
  deposit?: {
    amount: {
      currency: string;
      value: string;
    };
    dueIn: {
      unit: "HOUR";
      value: number;
    };
  };
  fullPaymentDueIn?: {
    unit: "DAY";
    value: 3 | 7 | 10 | 14;
  };
  paymentMethods?: {
    paymentMethodType:
      | "CASH_ON_PICKUP"
      | "CASHIER_CHECK"
      | "MONEY_ORDER"
      | "PERSONAL_CHECK";
  }[];
}

export type PaymentPolicyModel = Model<IPaymentPolicy>;
