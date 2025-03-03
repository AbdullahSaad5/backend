import { Document, Model } from "mongoose";

export interface IFulfillmentPolicy extends Document {
  name: string;
  description?: string;
  marketplaceId: string;
  isBlocked: boolean;
freightShipping: boolean,
    globalShipping: boolean,
  categoryTypes: [
    {
      name: "MOTORS_VEHICLES" | "ALL_EXCLUDING_MOTORS_VEHICLES";
      default: boolean;
    },
  ];

  handlingTime?: {
    unit: "YEAR" | "MONTH" | "DAY" | "HOUR";
    value: number;
  };

  localPickup?: boolean;
  pickupDropOff?: boolean;

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

  fullFulfillmentDueIn?: {
    unit: "DAY";
    value: 3 | 7 | 10 | 14;
  };

  immediatePay?: boolean;

  fulfillmentMethods?: {
    fulfillmentMethodType:
      | "CASH_ON_PICKUP"
      | "CASHIER_CHECK"
      | "MONEY_ORDER"
      | "PERSONAL_CHECK";
  }[];

  shippingOptions?: [
    {
      costType: "CALCULATED" | "FLAT_RATE" | "NOT_SPECIFIED";
      insuranceFee?: {
        currency: string;
        value: string;
      };
      insuranceOffered?: boolean;
      optionType: "DOMESTIC" | "INTERNATIONAL";
      packageHandlingCost?: {
        currency: string;
        value: string;
      };
      rateTableId?: string;
      shippingDiscountProfileId?: string;
      shippingPromotionOffered?: boolean;
      shippingServices?: [
        {
          additionalShippingCost?: {
            currency: string;
            value: string;
          };
          buyerResponsibleForPickup?: boolean;
          buyerResponsibleForShipping?: boolean;
          freeShipping?: boolean;
          shippingCarrierCode: string;
          shippingCost?: {
            currency: string;
            value: string;
          };
          shippingServiceCode: string;
          shipToLocations?: {
            regionExcluded?: [
              {
                regionName: string;
                regionType: "COUNTRY" | "COUNTRY_REGION" | "STATE_OR_PROVINCE";
              },
            ];
            regionIncluded?: [
              {
                regionName: string;
                regionType: "COUNTRY" | "COUNTRY_REGION" | "STATE_OR_PROVINCE";
              },
            ];
          };
          sortOrder?: number;
          surcharge?: {
            currency: string;
            value: string;
          };
        },
      ];
    },
  ];

  shipToLocations?: {
    regionExcluded?: [
      {
        regionName: string;
        regionType: "COUNTRY" | "COUNTRY_REGION" | "STATE_OR_PROVINCE";
      },
    ];
    regionIncluded?: [
      {
        regionName: string;
        regionType: "COUNTRY" | "COUNTRY_REGION" | "STATE_OR_PROVINCE";
      },
    ];
  };
}

export type FulfillmentPolicyModel = Model<IFulfillmentPolicy>;
