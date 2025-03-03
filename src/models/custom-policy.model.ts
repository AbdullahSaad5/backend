import { Schema, model, Document } from "mongoose";
import {
  ICustomPolicy,
  CustomPolicyModel,
} from "@/contracts/custom-policy.contract";

const customPolicySchema = new Schema<ICustomPolicy>(
  {
    description: {
      type: String,
      required: true,
      maxlength: 15000,
    },
    label: {
      type: String,
      required: true,
      maxlength: 65,
    },
    name: {
      type: String,
      required: true,
      maxlength: 65,
      unique: false,
    },
    policyType: {
      type: String,
      enum: ["PRODUCT_COMPLIANCE", "TAKE_BACK"],
      required: true,
    },
  },
  { timestamps: true }
);

export const CustomPolicy = model<ICustomPolicy, CustomPolicyModel>(
  "CustomPolicy",
  customPolicySchema
);
