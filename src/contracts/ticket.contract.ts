import { Document, Model, Types } from "mongoose";

export interface IResolution {
  description: string;
  resolvedBy: Types.ObjectId;
  closedAt: Date;
}

export interface ITimelineEntry {
  status: "Open" | "Assigned" | "In Progress" | "Closed" | "Resolved";
  changedAt: Date;
  changedBy: Types.ObjectId;
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
  resolution?: {
    description: string;
    resolvedBy: Types.ObjectId;
    closedAt: Date;
  };
  timeline?: ITimelineEntry[];
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