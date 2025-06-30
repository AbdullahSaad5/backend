import { Document, Types } from "mongoose";

// Bundle-specific fields

// Information about a product included in a bundle
interface IBundleProduct {
  product: Types.ObjectId; // Reference to the Product model
  quantity: number; // Quantity of this product in the bundle
  price: number; // Price of this product in the bundle
  discount?: number; // Discount on this product (optional)
}

// Bundle-wide discount
interface IBundleDiscount {
  amount: number; // Discount applied to the entire bundle
  validityPeriod: {
    startDate?: Date; // Start date of the discount (optional)
    endDate?: Date; // End date of the discount (optional)
  };
}

// Bundle status
type BundleStatus = "draft" | "published";

// Bundle details (name, description, etc.)
interface IBundleDetails {
  bundleName: string; // Name of the bundle
  description: string; // Detailed description of the bundle
  imageUrls: string[]; // Array of URLs to images or promotional materials
}

// Pricing details of the bundle
interface IBundlePricing {
  totalCost: number; // Total cost of the bundle
  bundleDiscount?: IBundleDiscount; // Bundle-wide discount (optional)
}

// Category and Brand
interface IBundleCategoryAndBrand {
  category: Types.ObjectId; // Reference to ProductCategory model
  brand?: Types.ObjectId; // Reference to ProductBrand model (optional)
}

// Stock and availability
interface IBundleStock {
  bundleQuantity: number; // Total number of bundles available in stock
  stockNotificationLevel: number; // Level at which stock notification should be triggered
}

// Full Bundle Contract Interface
interface IBundle {
  name: string; 
  details: IBundleDetails; // Bundle-specific details (name, description, images)
  products: IBundleProduct[]; // Array of products included in the bundle
  pricing: IBundlePricing; // Pricing details for the bundle
  categoryAndBrand: IBundleCategoryAndBrand; // Category and optional brand references
  stock: IBundleStock; // Stock and availability details
  discount?: IBundleDiscount; // Optional bundle-wide discount
  status: BundleStatus; // Status of the bundle (draft or published)
  validityPeriod?: {
    startDate?: Date; // Optional start date of the bundle offer
    endDate?: Date; // Optional end date of the bundle offer
  };
  createdAt: Date; // Created at timestamp
  updatedAt: Date; // Updated at timestamp
}

// Update Payload for Bundle (Partial type to support updates)
export type IBundleUpdatePayload = Partial<IBundle>;

export {
  IBundle,
  IBundleProduct,
  IBundleDiscount,
  IBundleDetails,
  IBundlePricing,
  IBundleCategoryAndBrand,
  IBundleStock,
};
