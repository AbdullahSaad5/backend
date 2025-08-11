import { generateUniqueId } from "@/utils/generate-unique-id.util";
import { Schema } from "mongoose";
import { ENUMS } from "@/constants/enum";

// --- Sub-schema: Address (used for Shipping & Billing) ---
export const AddressSchema = new Schema(
  {
    fullName: { type: String, trim: true },
    street1: { type: String, required: true, trim: true },
    street2: { type: String, trim: true },
    city: { type: String, required: true, trim: true },
    stateProvince: { type: String, required: true, trim: true },
    postalCode: { type: String, required: true, trim: true },
    country: { type: String, required: true, trim: true },
    phone: { type: String, trim: true },
  },
  { _id: false }
);

// --- Sub-schema: Product Attribute ---
export const ProductAttributeSchema = new Schema(
  {
    name: { type: String, trim: true },
    value: { type: String, trim: true },
  },
  { _id: false }
);

// --- Sub-schema: Bundle Component ---
export const BundleComponentSchema = new Schema(
  {
    productId: { type: Schema.Types.ObjectId, ref: "Producttt" },
    sku: { type: String, trim: true },
    name: { type: String, trim: true },
    quantity: { type: Number, min: 1 },
  },
  { _id: false }
);

// --- Sub-schema: OrderItem (for individual products, bundles, configurations) ---
export const OrderItemSchema = new Schema({
  itemId: { type: String, default: () => generateUniqueId("OI") },
  productId: { type: Schema.Types.ObjectId, ref: "Producttt", required: true, index: true },
  sku: { type: String, trim: true },
  name: { type: String, required: true, trim: true },
  description: { type: String, trim: true },
  quantity: { type: Number, required: true, min: 1 },
  unitPrice: { type: Number, required: true, min: 0 },
  condition: {
    type: String,
    enum: ENUMS.PRODUCT_CONDITIONS_ORDER,
    required: true,
  },
  attributes: [ProductAttributeSchema],
  components: [BundleComponentSchema],
  itemTotal: { type: Number, required: true, min: 0 },
  discountAmount: { type: Number, default: 0, min: 0 },
  taxAmount: { type: Number, default: 0, min: 0 },
  finalPrice: { type: Number, required: true, min: 0 },
});

// --- Sub-schema: Legacy Order Product (for backward compatibility) ---
export const OrderProductSchema = new Schema(
  {
    product: { type: Schema.Types.ObjectId, ref: "Producttt", required: true },
    quantity: { type: Number, required: true, min: 1 },
    price: { type: Number, required: true },
    discount: { type: Number, default: 0 },
  },
  { _id: false }
);

// --- Sub-schema: Discount Applied ---
export const OrderDiscountSchema = new Schema(
  {
    type: { type: String, enum: ENUMS.DISCOUNT_TYPES, default: "COUPON" },
    code: { type: String, trim: true },
    amount: { type: Number, required: true, min: 0 },
    description: { type: String, trim: true },
    appliedAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

// --- Sub-schema: Refund Details ---
export const RefundDetailsSchema = new Schema(
  {
    refundAmount: { type: Number, min: 0 },
    refundStatus: { type: String, enum: ENUMS.REFUND_STATUSES, default: "PENDING" },
    refundProcessedAt: { type: Date },
    refundTransactionId: { type: String, trim: true },
  },
  { _id: false }
);

// --- Sub-schema: Replacement Details ---
export const ReplacementDetailsSchema = new Schema(
  {
    replacementOrderId: { type: Schema.Types.ObjectId, ref: "Order" },
    replacedItemIds: [{ type: String }],
    newTrackingNumber: { type: String, trim: true },
  },
  { _id: false }
);

// --- Sub-schema: Suggested Task ---
export const SuggestedTaskSchema = new Schema(
  {
    tempId: { type: String, required: true },
    taskTypeId: { type: Schema.Types.ObjectId, ref: "TaskType" },
    name: { type: String, required: true },
    estimatedTimeMinutes: { type: Number },
    priority: { type: Number },
    notes: { type: String },
    assignedToUserId: { type: Schema.Types.ObjectId, ref: "User" },
    assignedToUserName: { type: String },
    orderItemId: { type: String },
    isCustom: { type: Boolean, default: false },
  },
  { _id: false }
);
