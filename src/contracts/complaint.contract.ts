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
  }];
  assignedTo?: string;
  createDate?: Date;
  dueDate?: Date;
  status?: "Open" | "In Progress" | "Closed";
  priority?: "Low" | "Medium" | "High";
  resolution?: [{
    image?:string[];
    description?: string;
    resolvedBy?: Types.ObjectId;
  }];
  userId?: string;
}
export type complaintModel = Model<IComplaint>;
