import { Model, Document } from "mongoose";

export interface IRevenue extends Document {
  description: string;
  amount: number;
  source: string;
  receiveType: string;
  date: Date;
  image: string;
  isBlocked: boolean;
}

export type IRevenueModel = Model<IRevenue>;
