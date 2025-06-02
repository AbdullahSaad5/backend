import {model,Schema,  Types, Document} from "mongoose"
import { IComplaint } from "@/contracts/complaint.contract";

const complaintSchema = new Schema<IComplaint>({
    category: {
      type: String,
      required: [true, "Category is required"],
      trim: true
    },
    title: {
      type: String,
      required: [true, "Title is required"],
      trim: true,
      maxlength: [100, "Title cannot exceed 100 characters"]
    },
    details: {
      type: String,
      required: [true, "Details are required"],
      trim: true
    },
    attachedFiles: {
      type: [String],
      validate: {
        validator: (files: string[]) => files.length <= 10,
        message: "Cannot attach more than 10 files"
      },
      default: []
    },
    notes: {
      type: String,
      default: "",
      trim: true
    },
    assignedTo: {
      type: Schema.Types.ObjectId,
      ref: "User"
    },
    createDate: {
      type: Date,
      default: Date.now
    },
    status: {
      type: String,
      enum: ["Open", "In Progress", "Closed"],
      default: "Open"
    },
    priority: {
      type: String,
      enum: ["Low", "Medium", "High"],
      default: "Medium"
    },
    resolution: {
      description: String,
      resolvedBy: {
        type: Schema.Types.ObjectId,
        ref: "User"
      },
      resolvedAt: Date
    }, 
    userId :{
      type: String,
      default: "",
      trim: true
    }
  });
  
  // Indexes for better query performance
  
  
  export const ComplaintModel = model<IComplaint>("Complaint", complaintSchema);