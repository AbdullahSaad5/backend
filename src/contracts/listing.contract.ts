import { Document, Types } from "mongoose";

// Technical specifications shared between platforms
interface ITechnicalSpecifications {
  processorType?: string;
  motherboard?: string;
  cpuFan?: string;
  case?: string;
  accessories?: string;
  expansionsNetworking?: string;
  ramSize?: string;
  storageDetails?: string;
  graphicsCard?: string;
  operatingSystem?: string;
  additionalSpecifications?: string;
}
interface IPart extends Document {
  type: string;
  name: string;
  specifications: string;
  price: number;
}

interface IVariation extends Document {
  product: string;
  cpu: IPart;
  ram: IPart;
  storage: IPart;
  graphics: IPart;
  price: number;
  description?: string;
}
// Pricing details shared between platforms
interface IPricing {
  pricePerUnit: number;
  discountPrice?: number;
  purchasePrice?: number;
  buyItNowPrice?: number; // Specific to eBay
  auctionStartingPrice?: number; // Specific to eBay
}

// Listing condition details
interface ICondition {
  status: string; // e.g., "New", "Used"
  details?: string; // Additional details for non-new condition
}

// Shipping details shared between platforms
interface IShipping {
  weight: string;
  options: string[]; // Array of shipping options
  estimatedDeliveryTime: string;
  handlingTime?: string; // Specific to eBay
  weightUnit?: string; // Specific to Website
}

// Keywords for SEO or listing metadata
interface IKeywords {
  relevantKeywords?: string[]; // Array of relevant keywords
  suggestedKeywords?: string[]; // Array of suggested keywords
}

// Platform-specific listing details for Amazon
interface IAmazonPlatformDetails {
  title: string;
  brand: string[];
  productCategory: Types.ObjectId;
  productSupplier: Types.ObjectId;
  images: string[];
  description: string;

  quantity: string;
  price: string;
  condition: string;
  conditionDescription?: string;
  pricingFormat: string;
  vat: string;
  paymentPolicy: Types.ObjectId;

  postagePolicy: string;
  packageWeight: {
    weightKg: string;
    weightG: string;
  };
  packageDimensions: {
    dimensionLength: string;
    dimensionWidth: string;
    dimensionHeight: string;
  };
  irregularPackage: boolean;

  seoTags: string[];
  relevantTags: string[];
  suggestedTags: string[];
}

// Platform-specific listing details for eBay
interface IEbayPlatformDetails {
  title: string;
  brand: string[];
  productCategory: Types.ObjectId;
  productSupplier: Types.ObjectId;
  images: string[];
  description: string;

  quantity: string;
  price: string;
  condition: string;
  conditionDescription?: string;
  pricingFormat: string;
  vat: string;
  paymentPolicy: Types.ObjectId;

  postagePolicy: string;
  packageWeight: {
    weightKg: string;
    weightG: string;
  };
  packageDimensions: {
    dimensionLength: string;
    dimensionWidth: string;
    dimensionHeight: string;
  };
  irregularPackage: boolean;

  seoTags: string[];
  relevantTags: string[];
  suggestedTags: string[];
}

// Platform-specific listing details for Website
interface IWebsitePlatformDetails {
  title: string;
  brand: string[];
  productCategory: Types.ObjectId;
  produuctSupplier: Types.ObjectId;

  images: string[];
  description: string;

  quantity: string;
  price: string;
  condition: string;
  conditionDescription?: string;
  pricingFormat: string;
  vat: string;
  model?: string;

  paymentPolicy: Types.ObjectId;

  postagePolicy: string;
  packageWeight: {
    weightKg: string;
    weightG: string;
  };
  packageDimensions: {
    dimensionLength: string;
    dimensionWidth: string;
    dimensionHeight: string;
  };
  irregularPackage: boolean;

  seoTags: string[];
  relevantTags: string[];
  suggestedTags: string[];
  prodTechInfo?: {
    processor?: string;

    model?: string;

    ssdCapacity?: string;

    hardDriveCapacity?: string;

    manufacturerWarranty?: string;

    type?: string;

    memory?: string;

    screenSize?: string;

    maxResolution?: string;

    gpu?: string;

    networkType?: string;

    processorType?: string;
  };
}

interface IPlatformListingInfo {
  productCategory: Types.ObjectId;
  productSupplier: Types.ObjectId; // Populated with category details
  title: string;
  brand: string[];
  description: string;
  images: string[];
  model?: string;
  srno?: string;
}

// Full Listing Interface
interface IListing {
  isBlocked: boolean; // Common details for all platforms
  platformDetails: {
    amazon?: IAmazonPlatformDetails; // Amazon-specific details
    ebay?: IEbayPlatformDetails; // eBay-specific details
    website?: IWebsitePlatformDetails;
    // Website-specific details
  };
  status: "draft" | "published"; // Listing status
  isTemplate: boolean;
  kind?: string;
}

// Update payload for listing
export type IListingUpdatePayload = Partial<IListing>;

// Exports
export {
  IListing,
  ITechnicalSpecifications,
  IPricing,
  ICondition,
  IShipping,
  IVariation,
  IPart,
  IKeywords,
  IAmazonPlatformDetails,
  IEbayPlatformDetails,
  IWebsitePlatformDetails,
  IPlatformListingInfo,
};
