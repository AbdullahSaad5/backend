import { Document, Model, Types } from "mongoose";

export interface IResolution {
  description: string;
  resolvedBy: Types.ObjectId;
  closedAt: Date;
}

export interface ITicket extends Document {
  title: string;
  client: string;
  assignedTo?: Types.ObjectId;  // Changed to reference User
  createDate: Date;
  dueDate: Date;
  status: "Open" | "In Progress" | "Closed" | "Resolved";
  priority: "Low" | "Medium" | "High" | "Urgent";
  role: Types.ObjectId;  // Changed from department to role (references UserCategory)
  description: string;
  resolution?: {
    description: string;
    resolvedBy: Types.ObjectId;
    closedAt: Date;
  };
  isEscalated?: boolean;
  chatMessageId?: string;
}

export type TicketModel = Model<ITicket>;