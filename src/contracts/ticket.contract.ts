import { Document, Model, Types } from "mongoose";

export interface IResolution {
  description: string;
  resolvedBy: Types.ObjectId;
  closedAt: Date;
  _id?: Types.ObjectId;
}

export interface ITimelineEntry {
  status: "Open" | "Assigned" | "In Progress" | "Closed" | "Resolved" | "Assignment Changed";
  changedAt: Date;
  changedBy: Types.ObjectId;
  assignedUsers?: Types.ObjectId[]; // For assignment changes
  resolutionDescription?: string; // For resolution entries
}

export interface IComment {
  _id: Types.ObjectId;
  content: string;
  author: Types.ObjectId;
  createdAt: Date;
  updatedAt?: Date;
  replies?: IComment[];
  parentComment?: Types.ObjectId; // For replies
}

export interface ITicket extends Document {
  title: string;
  client: string;
  assignedTo?: Types.ObjectId[];  // Changed to reference multiple Users
  createDate: Date;
  dueDate: Date;
  status: "Open" | "Assigned" | "In Progress" | "Closed" | "Resolved";
  priority: "Low" | "Medium" | "High" | "Urgent";
  role: Types.ObjectId;  // Changed from department to role (references UserCategory)
  description: string;
  resolutions?: IResolution[]; // Multiple resolutions
  resolution?: {
    description: string;
    resolvedBy: Types.ObjectId;
    closedAt: Date;
  }; // Keep for backward compatibility
  timeline?: ITimelineEntry[];
  comments?: IComment[]; // New comments field
  isEscalated?: boolean;
  isManuallyEscalated?: boolean;
  chatMessageId?: string;
  // New fields
  images?: string[]; // Array of image URLs
  platform?: string; // Platform name (e.g., "Amazon", "eBay", "Shopify")
  orderReference?: string; // Order reference number
  orderStatus?: "Fulfilled" | "Not Fulfilled"; // Order fulfillment status
}

export type TicketModel = Model<ITicket>;