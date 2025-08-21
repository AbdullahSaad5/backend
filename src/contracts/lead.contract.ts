import { Model, Document, Types } from "mongoose";

export interface ITimelineEntry {
  status:
    | "new"
    | "Contacted"
    | "Converted"
    | "Lost"
    | "Hot-Lead"
    | "Cold-Lead"
    | "Bad-Contact";
  changedAt: Date;
  changedBy: Types.ObjectId;
  assignedUsers?: Types.ObjectId[]; // For assignment changes
}

export interface INote {
  image?: string[];
  description?: string;
  notedBy: Types.ObjectId;
  notedAt: Date;
  _id?: Types.ObjectId;
}

export interface ILead extends Document {
  name: string;
  email: string;
  phoneNumber?: string;
  source?: string;
  purpose?: string;
  description?: string;
  status:
    | "new"
    | "Contacted"
    | "Converted"
    | "Lost"
    | "Hot-Lead"
    | "Cold-Lead"
    | "Bad-Contact";
  assignedTo?: Types.ObjectId[];
  leadCategory: Types.ObjectId;
  createdAt?: Date;
  updatedAt?: Date;
  notes?: INote[];
  timeline?: ITimelineEntry[];
}

export type ILeadModel = Model<ILead>;
