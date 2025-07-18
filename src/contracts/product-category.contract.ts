import { Document, Model, Types } from "mongoose";

// Interface for Product Category
export interface IProductCategory extends Document {
  name: string;
  ebayCategoryId: string;
  amazonCategoryId?: string;
  platform?: String;
  description: string;
  image?: string[];
  tags?: string[];
  isBlocked?: boolean;
  isPart?: boolean;
}

export type ProductCategoryModel = Model<IProductCategory>;

export type ProductCategoryCreatePayload = Pick<
  IProductCategory,
  | "name"
  | "description"
  | "image"
  | "isBlocked"
  | "tags"
  | "isPart"
  | "ebayCategoryId"
  | "amazonCategoryId"
  | "platform"
>;

export type ProductCategoryUpdatePayload = Partial<ProductCategoryCreatePayload>;
