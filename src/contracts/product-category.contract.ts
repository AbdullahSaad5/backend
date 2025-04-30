import { Document, Model, Types } from "mongoose";

// Interface for Product Category
export interface IProductCategory extends Document {
  name: string;
  ebayPartCategoryId: string;
  description: string;
  image?: string[];
  tags?: string[];
  isBlocked?: boolean;
  isPart?: boolean;
}

export type ProductCategoryModel = Model<IProductCategory>;

export type ProductCategoryCreatePayload = Pick<
  IProductCategory,
  "name" | "description" | "image" | "isBlocked" | "tags" | "isPart"
>;

export type ProductCategoryUpdatePayload = Partial<ProductCategoryCreatePayload>;
