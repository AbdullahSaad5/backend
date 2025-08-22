import { Document, Model, Types } from "mongoose";
export interface IDeal extends Document {
  _id: Types.ObjectId;
  dealType: "percentage" | "fixed";
  discountValue: number;
  products: string[];
  categories: string[];
  startDate: Date;
  endDate: Date;
  minPurchaseAmount: number;
  minQuantity: number;
  isActive: boolean;
  selectionType: "products" | "categories";
  image: string;
  createdAt?: Date;
  updatedAt?: Date;
}
export type IDealsModel = Model<IDeal>;
