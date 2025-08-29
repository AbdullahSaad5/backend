import { Schema, model } from "mongoose";
import { ILead, ILeadModel } from "@/contracts/lead.contract";

const LeadSchema = new Schema<ILead, ILeadModel>(
  {
    name: {
      type: String,
      required: [true, "Name is required"],
      trim: true,
      maxlength: [100, "Name cannot exceed 100 characters"],
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      lowercase: true,
      trim: true,
      maxlength: [100, "Email cannot exceed 100 characters"],
    },
    phoneNumber: {
      type: String,
      trim: true,
      maxlength: [20, "Phone number cannot exceed 20 characters"],
    },
    source: {
      type: String,
      trim: true,
      maxlength: [100, "Source cannot exceed 100 characters"],
    },
    purpose: {
      type: String,
      trim: true,
      maxlength: [200, "Purpose cannot exceed 200 characters"],
    },
    description: {
      type: String,
      trim: true,
      maxlength: [1000, "Description cannot exceed 1000 characters"],
    },
    status: {
      type: String,
      enum: [
        "new",
        "Contacted",
        "Converted",
        "Lost",
        "Hot-Lead",
        "Cold-Lead",
        "Bad-Contact",
      ],
      default: "new",
    },
    assignedTo: [
      {
        type: Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    leadCategory: {
      type: Schema.Types.ObjectId,
      ref: "ProductCategory",
      required: [true, "Lead category is required"],
    },
    shippingAddress: 
      {
        street1: { type: String, required: true, trim: true },
        street2: { type: String, trim: true },
        city: { type: String, required: true, trim: true },
        stateProvince: { type: String, required: true, trim: true },
        postalCode: { type: String, required: true, trim: true },
        country: { type: String, required: true, trim: true },
      },
    
    notes: [
      {
        image: {
          type: [String],
          validate: {
            validator: (urls: string[]) => urls.length <= 10,
            message: "Cannot attach more than 10 files",
          },
          default: [],
        },
        description: {
          type: String,
          trim: true,
        },
        notedBy: {
          type: Schema.Types.ObjectId,
          ref: "User",
        },
        notedAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    timeline: [
      {
        status: {
          type: String,
          enum: [
            "new",
            "Contacted",
            "Converted",
            "Lost",
            "Hot-Lead",
            "Cold-Lead",
            "Bad-Contact",
          ],
          required: true,
        },
        changedAt: {
          type: Date,
          default: Date.now,
        },
        changedBy: {
          type: Schema.Types.ObjectId,
          ref: "User",
        },
        assignedUsers: {
          type: [Schema.Types.ObjectId],
          ref: "User",
          default: undefined,
        },
      },
    ],
  },
  { timestamps: true }
);

export const LeadModel = model<ILead>("Lead", LeadSchema);
