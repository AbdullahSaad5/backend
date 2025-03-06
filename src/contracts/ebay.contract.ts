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


//made by owais, exact according to documentation, can be used in future if needed
export type EbayControllerCreateProductContractRequest= {
  product: {
    title: string;
    aspects: Record<string, string[]>; // Key-value pair for aspects like CPU, Feature
    description: string;
    upc: string[];
    ean: string[];
    isbn: string[];
    mpn: string;
    epid: string;
    brand: string;
    subtitle: string;
    videoIds: string[];
    imageUrls: string[];
  };
  condition: 
    | "NEW" 
    | "LIKE_NEW" 
    | "NEW_OTHER" 
    | "NEW_WITH_DEFECTS" 
    | "MANUFACTURER_REFURBISHED" 
    | "CERTIFIED_REFURBISHED" 
    | "EXCELLENT_REFURBISHED" 
    | "VERY_GOOD_REFURBISHED" 
    | "GOOD_REFURBISHED" 
    | "SELLER_REFURBISHED" 
    | "USED_EXCELLENT" 
    | "USED_VERY_GOOD" 
    | "USED_GOOD" 
    | "USED_ACCEPTABLE" 
    | "FOR_PARTS_OR_NOT_WORKING" 
    | "PRE_OWNED_EXCELLENT" 
    | "PRE_OWNED_FAIR";
  conditionDescription: string;
  conditionDescriptors: {
    additionalInfo: string;
    name: string;
    values: string[];
  }[];
  packageWeightAndSize: {
    dimensions: {
      height: number;
      length: number;
      width: number;
      unit: "INCH" | "FEET" | "CENTIMETER" | "METER";
    };
    weight: {
      value: number;
      unit: "POUND" | "KILOGRAM" | "OUNCE" | "GRAM";
    };
    packageType: 
      | "LETTER" 
      | "BULKY_GOODS" 
      | "CARAVAN" 
      | "CARS" 
      | "EUROPALLET" 
      | "EXPANDABLE_TOUGH_BAGS" 
      | "EXTRA_LARGE_PACK" 
      | "FURNITURE" 
      | "INDUSTRY_VEHICLES" 
      | "LARGE_CANADA_POSTBOX" 
      | "LARGE_CANADA_POST_BUBBLE_MAILER" 
      | "LARGE_ENVELOPE" 
      | "MAILING_BOX" 
      | "MEDIUM_CANADA_POST_BOX" 
      | "MEDIUM_CANADA_POST_BUBBLE_MAILER" 
      | "MOTORBIKES" 
      | "ONE_WAY_PALLET" 
      | "PACKAGE_THICK_ENVELOPE" 
      | "PADDED_BAGS" 
      | "PARCEL_OR_PADDED_ENVELOPE" 
      | "ROLL" 
      | "SMALL_CANADA_POST_BOX" 
      | "SMALL_CANADA_POST_BUBBLE_MAILER" 
      | "TOUGH_BAGS" 
      | "UPS_LETTER" 
      | "USPS_FLAT_RATE_ENVELOPE" 
      | "USPS_LARGE_PACK" 
      | "VERY_LARGE_PACK" 
      | "WINE_PAK";
    shippingIrregular: boolean;
  };
  availability: {
    pickupAtLocationAvailability: {
      availabilityType: "IN_STOCK" | "OUT_OF_STOCK" | "SHIP_TO_STORE";
      fulfillmentTime: {
        unit: "YEAR" | "MONTH" | "DAY" | "HOUR" | "CALENDAR_DAY" | "BUSINESS_DAY" | "MINUTE" | "SECOND" | "MILLISECOND";
        value: number;
      };
      merchantLocationKey: string;
      quantity: number;
    }[];
    shipToLocationAvailability: {
      availabilityDistributions: {
        fulfillmentTime: {
          unit: "YEAR" | "MONTH" | "DAY" | "HOUR" | "CALENDAR_DAY" | "BUSINESS_DAY" | "MINUTE" | "SECOND" | "MILLISECOND";
          value: number;
        };
        merchantLocationKey: string;
        quantity: number;
      }[];
      quantity: number;
    };
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
