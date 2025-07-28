import { Model, Document, Types } from "mongoose";

export interface IComplaint extends Document {
  category: string;
  title: string;
  details: string;
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
  status?: "Open" | "In Progress" | "Closed" | "Resolved";
  priority?: "Low" | "Medium" | "High" | "Urgent";
  resolution?: [{
    image?:string[];
    description?: string;
    resolvedBy?: Types.ObjectId;
    resolvedAt?: Date;
  }];
  isEscalated: boolean;
  userId?: string;
}
export type complaintModel = Model<IComplaint>;
