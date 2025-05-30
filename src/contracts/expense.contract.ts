import { Document, Model } from "mongoose";

export interface IExpense extends Document {
  description: string;
  amount: number;
  category: string;
  date: Date;
  image: string;
}

export type IExpenseModel = Model<IExpense>;
