import mongoose, { Schema, model, Document } from "mongoose";
import {
  IFulfillmentPolicy,
  FulfillmentPolicyModel,
} from "@/contracts/fulfillment-policy.contract";

const fulfillmentPolicySchema = new Schema<IFulfillmentPolicy>({
  categoryTypes: [
    {
      default: Boolean,
      name: String,
    },
  ],
  description: { type: String, required: true },
  freightShipping: { type: Boolean, required: true },
  globalShipping: { type: Boolean, required: true },
  handlingTime: {
    unit: { type: String, required: true },
    value: { type: Number, required: true },
  },
  localPickup: { type: Boolean, required: true },
  marketplaceId: { type: String, required: true },
  name: { type: String, required: true },
  pickupDropOff: { type: Boolean, required: true },
  shippingOptions: [
    {
      costType: { type: String, required: true },
      insuranceFee: {
        currency: String,
        value: String,
      },
      insuranceOffered: { type: Boolean, required: true },
      optionType: { type: String, required: true },
      packageHandlingCost: {
        currency: String,
        value: String,
      },
      rateTableId: String,
      shippingDiscountProfileId: String,
      shippingPromotionOffered: { type: Boolean, required: true },
      shippingServices: [
        {
          additionalShippingCost: {
            currency: String,
            value: String,
          },
          buyerResponsibleForPickup: { type: Boolean, required: true },
          buyerResponsibleForShipping: { type: Boolean, required: true },
          freeShipping: { type: Boolean, required: true },
          shippingCarrierCode: { type: String, required: true },
          shippingCost: {
            currency: String,
            value: String,
          },
          shippingServiceCode: { type: String, required: true },
          shipToLocations: {
            regionExcluded: [
              {
                regionName: String,
                regionType: String,
              },
            ],
            regionIncluded: [
              {
                regionName: String,
                regionType: String,
              },
            ],
          },
          sortOrder: { type: Number, required: true },
          surcharge: {
            currency: String,
            value: String,
          },
        },
      ],
    },
  ],
  shipToLocations: {
    regionExcluded: [
      {
        regionName: String,
        regionType: String,
      },
    ],
    regionIncluded: [
      {
        regionName: String,
        regionType: String,
      },
    ],
  },
});

export const FulfillmentPolicy = model<
  IFulfillmentPolicy,
  FulfillmentPolicyModel
>("FulfillmentPolicy", fulfillmentPolicySchema);
