// category?: string;
// title?: string;
// details?: string;
// attachedFiles?: string[];
// notes?: string;
// assignedTo?: string;
// createDate?: Date;
// dueDate?: Date;
// status?: "Open" | "In Progress" | "Closed";
// priority?: "Low" | "Medium" | "High";
// resolution?: {
//   description?: string;
//   resolvedBy?: Types.ObjectId;
// };
// userId?: string;

import { model, Schema, Types, Document } from "mongoose";
import { IComplaint } from "@/contracts/complaint.contract";
import { string } from "zod";

const complaintSchema = new Schema<IComplaint>({
  category: {
    type: String,
    required: [true, "Category is required"],
  },
  title: {
    type: String,
    required: [true, "Title is required"],
    trim: true,
    maxlength: [100, "Title cannot exceed 100 characters"],
  },
  details: {
    type: String,
    required: [true, "Details are required"],
    trim: true,
  },
  orderNumber: {
    type: String,
    trim: true,
    maxlength: [20, "Order number cannot exceed 20 characters"],
    validate: {
      validator: function(value: string) {
        if (!value) return true; // Allow empty values since it's optional
        return /^[a-zA-Z0-9\-_]*$/.test(value);
      },
      message: "Order number can only contain letters, numbers, hyphens, and underscores"
    }
  },
  attachedFiles: {
    type: [String],
    validate: {
      validator: (urls: string[]) => urls.length <= 10,
      message: "Cannot attach more than 10 files",
    },
    default: [],
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
  assignedTo: [{
    type: Schema.Types.ObjectId,
    ref: "User",
  }],
  createDate: {
    type: Date,
    default: Date.now,
  },
  status: {
    type: String,
    enum: ["Open", "In Progress", "Closed","Resolved"],
    default: "Open",
  },
  priority: {
    type: String,
    enum: ["Low", "Medium", "High", "Urgent"],
    default: "Medium",
  },
  resolution: [
    {
      description: {
        type: String,
        trim: true,
      },
      image: {
        type: [String],
        trim: true,
        validate: {
          validator: (urls: string[]) => urls.length <= 10,
          message: "Cannot attach more than 10 files",
        },
      },
      resolvedBy: {
        type: Schema.Types.ObjectId,
        ref: "User",
      },
      resolvedAt: {
        type: Date,
        default: Date.now,
      },
    },
  ],
  isEscalated: {
    type: Boolean,
    default: false,
  },
  escalatedAt: {
    type: Date,
    default: null,
  },
  userId: {
    type: Schema.Types.ObjectId,
    ref: "User",
  },
});

// Indexes for better query performance

export const ComplaintModel = model<IComplaint>("Complaint", complaintSchema);
