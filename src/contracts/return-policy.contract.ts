import { Document, Model } from "mongoose";

export interface IReturnPolicy extends Document {
  name: string;
  description?: string;
  marketplaceId: string;
  isBlocked: boolean;
  categoryTypes: [
    {
      name: "ALL_EXCLUDING_MOTORS_VEHICLES";
    },
  ];

  returnsAccepted: boolean;

  returnPeriod?: {
    unit: "DAY";
    value: 30 | 60;
  };

  returnShippingCostPayer?: "BUYER" | "SELLER";

  refundMethod?: "MONEY_BACK";
  returnMethod?: "REPLACEMENT" | "MONEY_BACK";

  returnInstructions?: string;

  internationalOverride?: {
    returnsAccepted: boolean;
    returnPeriod?: {
      unit: "DAY";
      value: 30 | 60;
    };
    returnShippingCostPayer?: "BUYER" | "SELLER";
  };
}

export type ReturnPolicyModel = Model<IReturnPolicy>;
