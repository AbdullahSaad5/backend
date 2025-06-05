import { Document, Model, Types } from "mongoose";

export interface IExpense extends Document {
  description: string;
  amount: number;
  category: {
    _id: Types.ObjectId;
    title: string;
  } | Types.ObjectId;
  date: Date;
  isBlocked: boolean;
  image: string;
}

export type IExpenseModel = Model<IExpense>;
