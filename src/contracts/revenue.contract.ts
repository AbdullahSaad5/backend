import { Model, Document } from "mongoose";

export interface IRevenue extends Document {
  description: string;
  amount: number;
  source: string;
  date: Date;
  isBlocked: boolean;
}

export type IRevenueModel = Model<IRevenue>;
