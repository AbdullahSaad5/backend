import { Model, Document, Types } from "mongoose";

export interface ITimelineEntry {
  status: "Open" | "Assigned" | "In Progress" | "Closed" | "Resolved";
  changedAt: Date;
  changedBy: Types.ObjectId;
}

export interface IComplaint extends Document {
  category: string;
  title: string;
  details: string;
  orderNumber?: string;
  platform?: string;
  orderStatus?: "Fulfilled" | "Not Fulfilled";
  attachedFiles?: string[];
  notes?: [{
    image?:string[],
    description?: string, 
    notedBy?: Types.ObjectId,
    notedAt?: Date;
  }];
  assignedTo?: string[];
  createDate?: Date;
  dueDate?: Date;
  status?: "Open" | "Assigned" | "In Progress" | "Closed" | "Resolved";
  priority?: "Low" | "Medium" | "High" | "Urgent";
  timeline?: ITimelineEntry[];
  resolution?: [{
    image?:string[];
    description?: string;
    resolvedBy?: Types.ObjectId;
    resolvedAt?: Date;
  }];
  isEscalated: boolean;
  escalatedAt?: Date;
  userId?: string;
}
export type complaintModel = Model<IComplaint>;
