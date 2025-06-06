import { Document, Model, Types } from "mongoose";

export interface ITicket extends Document {
  title: string;
  client: string;
  assignedTo?: string;
  createDate: Date;
  dueDate: Date;
  status: "Open" | "In Progress" | "Closed";
  priority: "Low" | "Medium" | "High";
  department: "SUPPORT" | "SALES" | "INVENTORY";
  description: string;
  resolution?: {
    description: string;
    resolvedBy: Types.ObjectId;
  };
  
}



export type TicketModel = Model<ITicket>;