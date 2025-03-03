import { Document, Model } from "mongoose";

export interface IPaymentPolicy extends Document {
  name: string;
  description?: string;
  marketplaceId: string;
  isBlocked: boolean;
  categoryTypes: {
    name: "ALL_EXCLUDING_MOTORS_VEHICLES";
  }[];

  deposit?: {
    amount: {
      currency: string;
      value: string;
    };
    dueIn: {
      unit: "HOUR";
      value: 24 | 48 | 72;
    };
  };

  fullPaymentDueIn?: {
    unit: "DAY";
    value: 3 | 7 | 10 | 14;
  };

  immediatePay?: boolean;

  paymentMethods?: {
    paymentMethodType:
      | "CASH_ON_PICKUP"
      | "CASHIER_CHECK"
      | "MONEY_ORDER"
      | "PERSONAL_CHECK";
  }[];
}

export type PaymentPolicyModel = Model<IPaymentPolicy>;
