import { Model, Document, Types } from "mongoose";

export interface IComplaint extends Document {
  category: string;
  title: string;
  details: string;
  attachedFiles: string[];
  notes: string;
  assignedTo?: string;
  createDate: Date;
  dueDate: Date;
  status: "Open" | "In Progress" | "Closed";
  priority: "Low" | "Medium" | "High";
  resolution?: {
    description: string;
    resolvedBy: Types.ObjectId;
  };
}
export type complaintModel = Model<IComplaint>;
