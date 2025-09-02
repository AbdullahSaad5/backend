import { Model, Document, Types } from "mongoose";

export interface ITimelineEntry {
  status?: "New" | "Contacted" | "Converted" | "Lost" | "Hot-Lead" | "Cold-Lead" | "Bad-Contact" | "Assignment Changed";
  changedAt: Date;
  changedBy: Types.ObjectId;
  assignedUsers?: Types.ObjectId[]; // For assignment changes
  noteDescription?: string; // For note entries in timeline
  noteImages?: string[]; // For note images in timeline
}

export interface INote {
  image?: string[];
  description?: string;
  notedBy: Types.ObjectId;
  notedAt: Date;
  _id?: Types.ObjectId;
}

export interface shippingAddress{
  street1: string;
  street2?: string;
  city: string;
  stateProvince: string;
  postalCode: string;
  country: string;
}

export interface ILead extends Document {
  name: string;
  email: string;
  phoneNumber?: string;
  productId?: Types.ObjectId;
  source?: string;
  purpose?: string;
  description?: string;
  status: "New" | "Contacted" | "Converted" | "Lost" | "Hot-Lead" | "Cold-Lead" | "Bad-Contact";
  assignedTo?: Types.ObjectId[];
  leadCategory: Types.ObjectId;
  createdAt?: Date;
  updatedAt?: Date;
  notes?: INote[];
  timeline?: ITimelineEntry[];
  shippingAddress?: shippingAddress[];
}

export type ILeadModel = Model<ILead>;
