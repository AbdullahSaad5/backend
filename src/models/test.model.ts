import { Schema, model } from "mongoose";
import { REGEX } from "@/constants/regex";

const validateEmail = (email: string) => REGEX.EMAIL.test(email);

const fileSchema = {
  originalname: { type: String, required: true },
  encoding: { type: String, required: true },
  mimetype: { type: String, required: true },
  size: { type: Number, required: true },
  url: { type: String, required: true },
  filename: { type: String, required: true },
};

// Module 1 : User Management
// Schemas:
// 1 User Schema
// 2 PasswordReset Schema
// 3 UserCategory Schema
// 4 Address Schema

const userSchema = new Schema(
  {
    firstName: { type: String, required: true },
    lastName: { type: String },
    email: {
      type: String,
      lowercase: true,
      required: true,
      validate: {
        validator: validateEmail,
        message: "Invalid email format",
      },
    },
    password: { type: String , select: false},
    signUpThrough: {
      type: String,
      enum: ["Google", "Apple", "Web"],
      required: true,
      default: "Web",
    },
    profileImage: {type : fileSchema , required: true},
    EmailVerifiedOTP: { type: String },
    EmailVerifiedOTPExpiredAt: { type: String },
    isEmailVerified: { type: Boolean, required: true },
    EmailVerifiedAt: { type: Date, required: true },
    userType: { type: Date, required: true },
    additionalAccessRights: { type: [Array] , default: [] },
    restrictedAccessRights: { type: [Array], default: [] },
    phoneNumber: { type: Number, required: true },
    //   defaultAddress: {id from AddressSchema pass here}
    // stripeCustomerId: {}
    // klarnaCustomerId: {}
  },
  {
    timestamps: true,
  }
);


const userCategory = new Schema(
    {
      userType: { type: String, required: true },
      description: { type: String },
      permissions: { type: [String], required: true },
    },
    {
      timestamps: true,
    }
  );


const PasswordReset = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true }, // Links the reset request to a specific user
    otp: { type: String, required: true }, // Unique token to validate password reset
    expiresAt: { type: Date, required: true }, // Expiration time for the reset token
    createdAt: { type: Date, default: Date.now }, // Time when the reset request was created
    used: { type: Boolean, default: false }, // Flag to indicate if the token has already been used
  },
  {
    timestamps: true,
  }
);




const AddressSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    label: { type: String, required: true },
    street: { type: String, required: true },
    city: { type: String, required: true },
    state: { type: String, required: true },
    postalCode: { type: String, required: true },
    country: { type: String, required: true },
    isDefault: { type: Boolean, default: false },
  },
  {
    timestamps: true,
  }
);

// Module 2 : Supplier Management
// Schemas:
// 1 User Schema            (Already Have, here refer as Supplier)
// 2 Product Category Schema
// 3 Product Schema
// 3 Input Field Schema
// 4 Brand Schema
// 5 Warranty Schema
// 6 Ledger Schema
// 7 Expense Schema
// 8 Revenue Schema


const productCategorySchema = new Schema(
  {
    categoryName: { type: String, required: true },
    categoryDescription: { type: String, required: true },
    files: { type: [fileSchema], default: [] },
    isBlocked: { type: Boolean, default: false },
  },
  {
    timestamps: true,
  }
);


const BrandSchema = new Schema(
  {
    brandName: { type: String, required: true },
    brandDescription: { type: String },
    brandLogo: { type: fileSchema },
    isBlocked: { type: Boolean, default: false },
  },
  {
    timestamps: true,
  }
);


const ProductSchema = new Schema(
  {
    productName: { type: String, required: true },
    productCategoryId: { type: String, ref: "ProductCategory", required: true },
    productSupplierId: { type: String, ref: "Supplier", required: true }, // Supplier Means User
    productBrandId: { type: String, ref: "Brand", required: true },
    price: { type: Number, required: true },
    costBreakdown: { type: Map, of: Number }, // Maps cost types to values (e.g., "material": 20, "labor": 15)
    description: { type: String },
    // images: [{ type: String }],
    images: { type: [{fileSchema}] , },
    color: [{ type: String }],
    inventoryLevel: { type: Number, required: true },
    purchaseDate: { type: Date, required: true },
    paymentStatus: {
      type: String,
      enum: ["Pending", "Paid", "Partial"],
      required: true,
    },
    paidAmount: { type: Number, default: 0 },
    isBlocked: { type: Boolean, default: false },
    discount: { type: Number, default: 0 }, // Percentage or flat discount on a single product
    bulkDiscount: { type: Number, default: 0 }, // For bulk/business customers
    warrantyId: { type: String, ref: "Warranty" }, // Reference warranty schema
    templateId: { type: String, ref: "Template" }, // If using templates for products
    weight: { type: Number },
    weightUnit: { type: String, enum: ["kg", "lb", "oz"], default: "kg" }, // Weight units
    dimensions: {
      length: { type: Number },
      width: { type: Number },
      height: { type: Number },
      unit: { type: String, enum: ["cm", "in"], default: "cm" }, // Dimension units
    },
    visibility: {
      type: [String],
      enum: ["Website", "eBay", "Amazon"],
      default: [],
    },
    status: {
      type: String,
      enum: ["active", "discarded", "isFaulty"],
      default: "active",
    },
  },
  {
    timestamps: true,
  }
);

// The InputField schema manages custom fields for products, allowing for flexibility
//   in the product schema, which can vary based on product type or category.
const InputFieldSchema = new Schema(
  {
    fieldName: { type: String, required: true },
    fieldType: { type: String, required: true },
    categoryId: { type: Schema.Types.ObjectId, ref: "ProductCategory" },
  },
  {
    timestamps: true,
  }
);

const WarrantySchema = new Schema(
  {
    productId: { type: String, ref: "Product", required: true },
    supplierId: { type: String, ref: "Supplier", required: true }, // Supplier Means User
    warrantyPeriod: { type: Number, required: true },
    coverageDetails: { type: String, required: true },
    documents: [{ type: String }],
    expirationAlert: { type: Boolean, default: false },
    warrantyOptions: { type: String },
  },
  {
    timestamps: true,
  }
);

const LedgerSchema = new Schema(
  {
    supplierId: { type: Schema.Types.ObjectId, ref: "Supplier" },
    productId: { type: Schema.Types.ObjectId, ref: "Product" },
    transactionType: {
      type: String,
      enum: ["Income", "Expense"],
      required: true,
    },
    amount: { type: Number, required: true },
    date: { type: Date, default: Date.now },
    description: { type: String, required: true },
    referenceId: { type: Schema.Types.ObjectId, refPath: "transactionType" }, // Dynamically links to Expense or Revenue
  },
  {
    timestamps: true,
  }
);

const ExpenseSchema = new Schema(
  {
    vendorId: { type: Schema.Types.ObjectId, ref: "User" },
    productId: { type: Schema.Types.ObjectId, ref: "Product" },
    category: { type: String, required: true },
    amount: { type: Number, required: true },
    date: { type: Date, default: Date.now },
    description: { type: String, required: true },
    // ledgerEntryId: { type: Schema.Types.ObjectId, ref: "Ledger" },980

  },
  {
    timestamps: true,
  }
);

const RevenueSchema = new Schema(
  {
    supplierId: { type: Schema.Types.ObjectId, ref: "Supplier" },
    productId: { type: Schema.Types.ObjectId, ref: "Product" },
    amount: { type: Number, required: true },
    date: { type: Date, default: Date.now },
    description: { type: String, required: true },
    ledgerEntryId: { type: Schema.Types.ObjectId, ref: "Ledger" },
  },
  {
    timestamps: true,
  }
);

// Module 3: Inventory Management

const CouponSchema = new Schema(
  {
    code: { type: String, required: true}, // Unique code for the coupon
    product: [{ type: String, ref: "Product" }], // Associated products (optional)
    discountType: {
      type: String,
      enum: ["percentage", "fixed"],
      required: true,
    }, // Discount type (percentage or fixed)
    discountValue: { type: Number, required: true }, // Discount amount (either percentage or fixed)
    validTill: { type: Date, required: true }, // Expiry date
    usageLimit: { type: Number, default: 1 }, // Max number of uses
    usedBy: [{ type: String, ref: "User" }], // Array to track users who used it
    applicableLocations: [{ type: String }], // Array of applicable cities or areas
    minimumPurchaseAmount: { type: Number }, // Minimum amount required to apply the coupon
    isActive: { type: Boolean, default: true }, // Status of the coupon
  },
  {
    timestamps: true,
  }
);

const TaxSchema = new Schema(
  {
    product: [{ type: String, ref: "Product" }],
    taxType: { type: String, enum: ["VAT", "Sales Tax"], required: true },
    taxPercentage: { type: Number, required: true },
    isActive: { type: Boolean, default: true },
  },
  {
    timestamps: true,
  }
);

const PCConfigurationSchema = new Schema(
  {
    user: { type: String, ref: "User" },
    components: [
      {
        componentType: { type: String }, // e.g., CPU, GPU, RAM
        componentId: { type: String, ref: "Product" },
        price: { type: Number },
      },
    ],
    totalPrice: { type: Number, required: true },
    savedAt: { type: Date, default: Date.now },
  },
  {
    timestamps: true,
  }
);

// Module 4: Bundle Management

const BundleSchema = new Schema(
  {
    name: { type: String, required: true }, // Bundle name, e.g., "Gaming PC Bundle"
    products: [
      {
        productId: { type: String, ref: "Product", required: true }, // References products in the inventory
        quantity: { type: Number, required: true }, // Quantity of each product in the bundle
      },
    ],
    images: [{ type: String }], // Array to hold paths or URLs for bundle images
    totalCost: { type: Number, required: true }, // Total cost of the bundle
    discount: { type: Number }, // Bundle-specific discount, can be fixed or percentage
    validityPeriod: {
      startDate: { type: Date },
      endDate: { type: Date },
    },
    lowStockNotification: { type: Boolean, default: false }, // Low stock notifications for the bundle
    createdAt: { type: Date, default: Date.now },
  },
  {
    timestamps: true,
  }
);

// Module 5: Order Management

const OrderSchema = new Schema(
  {
    orderId: { type: String },
    customerId: { type: String, ref: "Customer" },
    products: [
      {
        productId: { type: String, ref: "Product" },
        quantity: { type: Number, required: true },
        price: { type: Number, required: true },
      },
    ],
    customization: { type: String, ref: "PCConfiguration" },
    discountId: { type: String, ref: "Discount" },
    totalAmount: { type: Number, required: true },
    shippingInfo: {
      address: String,
      city: String,
      state: String,
      country: String,
      zipCode: String,
      phone: String,
    },
    status: { type: String, default: "open" },
    paymentStatus: { type: String, default: "pending" },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
  },
  {
    timestamps: true,
  }
);

const OrderAssignmentSchema = new Schema(
  {
    orderId: { type: Schema.Types.ObjectId, ref: "Order", required: true },
    assignedTeam: { type: String, required: true },
    priority: { type: Number, default: 1 },
    status: { type: String, default: "assigned" },
    assignedAt: { type: Date, default: Date.now },
    completedAt: { type: Date },
  },
  {
    timestamps: true,
  }
);

const InquiryReplacementSchema = new Schema(
  {
    customerId: {
      type: Schema.Types.ObjectId,
      ref: "Customer",
      required: true,
    },
    orderId: { type: Schema.Types.ObjectId, ref: "Order" },
    productId: { type: Schema.Types.ObjectId, ref: "Product" },
    inquiryType: { type: String, required: true },
    status: { type: String, default: "pending" },
    inquiryDate: { type: Date, default: Date.now },
    responseDate: { type: Date },
  },
  {
    timestamps: true,
  }
);

const ShippingDetailsSchema = new Schema(
  {
    orderId: { type: Schema.Types.ObjectId, ref: "Order", required: true },
    shippingType: { type: String, default: "standard" },
    isInternational: { type: Boolean, default: false },
    expectedDelivery: { type: Date },
    shippedDate: { type: Date },
    trackingNumber: { type: String },
  },
  {
    timestamps: true,
  }
);

const ReturnReplacementSchema = new Schema(
  {
    orderId: { type: Schema.Types.ObjectId, ref: "Order", required: true },
    productId: { type: Schema.Types.ObjectId, ref: "Product", required: true },
    reason: { type: String, required: true },
    status: { type: String, default: "initiated" },
    proofOfDefect: { type: String },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date },
  },
  {
    timestamps: true,
  }
);
