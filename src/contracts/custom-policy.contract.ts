import { Document, Model } from "mongoose";

export interface ICustomPolicy extends Document {
  description: string; // Contains the seller's policy and policy terms (Max length: 15,000)
  label: string; // Customer-facing label (Max length: 65)
  name: string; // Seller-defined unique name (Max length: 65)
  policyType: "PRODUCT_COMPLIANCE" | "TAKE_BACK"; // Type of custom policy
  ebayPolicyId?: string; // eBay policy ID
}

export type CustomPolicyModel = Model<ICustomPolicy>;
