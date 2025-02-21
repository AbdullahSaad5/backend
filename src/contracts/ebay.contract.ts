export type EbayControllerCreateProductRequest = {
  sku: string;
  title: string;
  features: string[];
  cpu: string;
  description: string;
  upc: string;
  imageUrls: string[];
  condition: string;
  dimensions: {
    length: number;
    width: number;
    height: number;
    unit: string;
  };
  weight: {
    value: number;
    unit: string;
  };
  shipToLocationQuantity: number;
  fulfillmentTime: {
    value: number;
    unit: string;
  };
  listingPolicies: {
    fulfillmentPolicyId: string;
    paymentPolicyId: string;
    returnPolicyId: string;
  };
};

export type EbayControllerCreateOfferRequest = {
  sku: string;
  marketplaceId: string;
  priceFormat: string;
  listingDescription: string;
  availableQuantity: number;
  quantityLimitPerBuyer: number;
  price: {
    value: number;
    currency: string;
  };
  categoryId: string;
  merchantLocationKey: string;
  tax: {
    vatPercentage: number;
    applyTax: boolean;
    thirdPartyTaxCategory: string;
  };
  listingPolicies: {
    fulfillmentPolicyId: string;
    paymentPolicyId: string;
    returnPolicyId: string;
  };
};

export type EbayControllerUpdateOfferRequest = {
  availableQuantity: number;
  categoryId: string;
  listingDescription: string;
  price: {
    value: number;
    currency: string;
  };
  weight: {
    value: number;
    unit: string;
  };
  dimensions: {
    length: number;
    width: number;
    height: number;
    unit: string;
  };
  packageType: string;
  quantityLimitPerBuyer: number;
  merchantLocationKey: string;
  includeCatalogProductDetails: boolean;
  globalShipping: boolean;
  pickupDropOff: boolean;
  localPickup: boolean;
  freightShipping: boolean;
  listingPolicies: {
    fulfillmentPolicyId: string;
    paymentPolicyId: string;
    returnPolicyId: string;
  };
};

export type EbayControllerCreateCustomPolicyRequest = {
  name: string;
  description: string;
  label: string;
  policyType: string;
};

export type EbayControllerCreatePolicyRequest = {
  name: string;
  label: string;
  description: string;
  policyType: string;
};

export type EbayControllerCreateFulfillmentPolicyRequest = {
  categoryTypeName: string;
  marketplaceId: string;
  name: string;
  globalShipping: boolean;
  handlingTime: {
    value: number;
    unit: string;
  };
  shippingOptions: {
    shippingCostType: string;
    shippingServiceType: string;
    shippingCost: {
      value: number;
      currency: string;
    };
    buyerResponsibleForShipping: boolean;
    freeShipping: boolean;
    shippingCarrierCode: string;
    shippingServiceCode: string;
  }[];
};

export type EbayDayOfWeekEnum =
  | "SUNDAY"
  | "MONDAY"
  | "TUESDAY"
  | "WEDNESDAY"
  | "THURSDAY"
  | "FRIDAY"
  | "SATURDAY";

export type EbayControllerCreateLocationRequest = {
  address: {
    addressLine1: string;
    addressLine2: string;
    city: string;
    country: string;
    postalCode: string;
    stateOrProvince: string;
  };
  geoCoordinates: {
    latitude: number;
    longitude: number;
  };
  phone: string;
  locationTypes: string[];
  operatingHours: {
    dayOfWeek: EbayDayOfWeekEnum;
    intervals: {
      close: string;
      open: string;
    }[];
  }[];
  sameDayShippingCutOffTimes: {
    weeklySchedule: {
      day: EbayDayOfWeekEnum[];
      cutOffTime: string;
    }[];
  };
};

export type EbayControllerCreatePaymentPolicyRequest = {
  name: string;
  marketplaceId: string;
  categoryTypes: string[];
  paymentMethods: string[];
};

export type EbayControllerCreateReturnPolicyRequest = {
  name: string;
  marketplaceId: string;
  refundMethod: string;
  returnsAccepted: boolean;
  returnShippingCostPayer: string;
  returnPeriod: {
    value: number;
    unit: string;
  };
};
