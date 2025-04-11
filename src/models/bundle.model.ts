import { Schema, model, Types } from "mongoose";
import { IProduct } from "@/contracts/listing.contract";
import { IProductCategory } from "@/contracts/product-category.contract";
import { IProductBrand } from "@/contracts/product-brand.contract";

// Schema for Bundle
const bundleSchema = new Schema(
  {
    // Bundle Name
    bundleName: {
      type: String,
      required: true,
      trim: true,
    },

    // Bundle Description
    description: {
      type: String,
      required: true,
      trim: true,
    },

    // Promotional images or material for the bundle
    imageUrls: {
      type: [String], // Array of URLs to images or promotional material
      required: false,
    },

    // Products included in the Bundle (Referencing Product Model)
    products: [
      {
        product: {
          type: Types.ObjectId,
          ref: "Product", // Reference to the Product model
          required: true,
        },
        quantity: {
          type: Number,
          required: true,
          min: 1, // Ensuring at least one unit of product
        },
        //todo fix
        price: {
          type: Number,
          required: true,
        },
        discount: {
          type: Number,
          default: 0, // Discount on individual product in the bundle
        },
      },
    ],

    // Total cost of the bundle after considering product prices and discounts
    //TODO fix
    totalCost: {
      type: Number,
      required: true,
      min: 0, // Ensuring non-negative value
    },

    // Bundle-wide discount
    discount: {
      type: Number,
      default: 0, // Discount applied to the entire bundle
      min: 0, // Discount cannot be negative
    },

    // Validity period for the bundle's pricing and discount
    validityPeriod: {
      startDate: {
        type: Date,
        required: false,
      },
      endDate: {
        type: Date,
        required: false,
      },
    },

    // Status of the bundle (draft or published)
    status: {
      type: String,
      enum: ["draft", "published"], // Draft for unapproved bundles, published for active ones
      default: "draft", // Default to draft when created
    },

    // Bundle Category - Can help group bundles by category (e.g., Gaming, Office)
    category: {
      type: Types.ObjectId,
      ref: "ProductCategory", // Reference to Category Model
      required: true,
    },

    // Bundle Brand (Optional - You may want to group bundles by a brand)
    brand: {
      type: Types.ObjectId,
      ref: "ProductBrand", // Reference to ProductBrand Model
      required: false, // Optional field, not required
    },

    // Total Quantity of the bundle available (Inventory Tracking)
    bundleQuantity: {
      type: Number,
      required: true,
      min: 0,
      default: 0, // Number of bundles in stock
    },

    // Additional fields for stock management
    stockNotificationLevel: {
      type: Number,
      default: 5, // Level at which you want to be notified about low stock
    },
  },
  { timestamps: true } // Automatically manage createdAt and updatedAt fields
);

// Model for the Bundle
export const Bundle = model("Bundle", bundleSchema);
