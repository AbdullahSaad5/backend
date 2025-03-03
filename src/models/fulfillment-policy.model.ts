import mongoose, { Schema, model, Document } from "mongoose";
import {
  IFulfillmentPolicy,
  FulfillmentPolicyModel,
} from "@/contracts/fulfillment-policy.contract";

const fulfillmentPolicySchema = new Schema<IFulfillmentPolicy>(
  {
    categoryTypes: [
      {
        default: { type: Boolean, required: true },
        name: {
          type: String,
          enum: ["MOTORS_VEHICLES", "ALL_EXCLUDING_MOTORS_VEHICLES"],
          required: true,
        },
      },
    ],
    description: { type: String, required: false },
    freightShipping: { type: Boolean, default: false },
    globalShipping: { type: Boolean, default: false },
    handlingTime: {
      unit: {
        type: String,
        enum: ["YEAR", "MONTH", "DAY", "HOUR"],
        required: true,
      },
      value: { type: Number, required: true },
    },
    localPickup: { type: Boolean, default: false },
    marketplaceId: {
      type: String,
      enum: [
        "EBAY_AT",
        "EBAY_AU",
        "EBAY_BE",
        "EBAY_US", // Add all MarketplaceIdEnum values
      ],
      required: true,
    },
    name: { type: String, required: true },
    pickupDropOff: { type: Boolean, default: false },
    shippingOptions: [
      new Schema(
        {
          costType: {
            type: String,
            enum: ["CALCULATED", "FLAT_RATE", "NOT_SPECIFIED"],
            required: true,
          },
          insuranceFee: {
            currency: { type: String, required: true },
            value: { type: String, required: true },
          },
          insuranceOffered: { type: Boolean, default: false },
          optionType: {
            type: String,
            enum: ["DOMESTIC", "INTERNATIONAL"],
            required: true,
          },
          packageHandlingCost: {
            currency: { type: String, required: true },
            value: { type: String, required: true },
          },
          rateTableId: { type: String, required: false },
          shippingDiscountProfileId: { type: String, required: false },
          shippingPromotionOffered: { type: Boolean, default: false },
          shippingServices: [
            new Schema(
              {
                additionalShippingCost: {
                  currency: { type: String, required: true },
                  value: { type: String, required: true },
                },
                buyerResponsibleForPickup: { type: Boolean, default: false },
                buyerResponsibleForShipping: { type: Boolean, default: false },
                freeShipping: { type: Boolean, default: false },
                shippingCarrierCode: { type: String, required: true },
                shippingCost: {
                  currency: { type: String, required: true },
                  value: { type: String, required: true },
                },
                shippingServiceCode: { type: String, required: true },
                shipToLocations: {
                  regionExcluded: [
                    new Schema(
                      {
                        regionName: { type: String, required: true },
                        regionType: {
                          type: String,
                          enum: [
                            "COUNTRY",
                            "COUNTRY_REGION",
                            "STATE_OR_PROVINCE",
                          ],
                          required: true,
                        },
                      },
                      { _id: false }
                    ),
                  ],
                  regionIncluded: [
                    new Schema(
                      {
                        regionName: { type: String, required: true },
                        regionType: {
                          type: String,
                          enum: [
                            "COUNTRY",
                            "COUNTRY_REGION",
                            "STATE_OR_PROVINCE",
                          ],
                          required: true,
                        },
                      },
                      { _id: false }
                    ),
                  ],
                },
                sortOrder: { type: Number, required: false },
                surcharge: {
                  currency: { type: String, required: true },
                  value: { type: String, required: true },
                },
              },
              { _id: false }
            ),
          ],
        },
        { _id: false }
      ),
    ],
    shipToLocations: {
      regionExcluded: [
        new Schema(
          {
            regionName: { type: String, required: true },
            regionType: {
              type: String,
              enum: ["COUNTRY", "COUNTRY_REGION", "STATE_OR_PROVINCE"],
              required: true,
            },
          },
          { _id: false }
        ),
      ],
      regionIncluded: [
        new Schema(
          {
            regionName: { type: String, required: true },
            regionType: {
              type: String,
              enum: ["COUNTRY", "COUNTRY_REGION", "STATE_OR_PROVINCE"],
              required: true,
            },
          },
          { _id: false }
        ),
      ],
    },
  },
  { timestamps: true }
);

export const FulfillmentPolicy = model<
  IFulfillmentPolicy,
  FulfillmentPolicyModel
>("FulfillmentPolicy", fulfillmentPolicySchema);
