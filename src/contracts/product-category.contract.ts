import { Document, Model, Types } from "mongoose";

// Interface for field mapping
export interface CategoryFieldMapping {
  unifiedField: string;
  amazonFields: string[];
  ebayField: string;
  mapping: string;
}

// Interface for Product Category
export interface IProductCategory extends Document {
  name: string;
  ebayCategoryId: string;
  amazonCategoryId?: string;
  description: string;
  image?: string[];
  tags?: string[];
  isBlocked?: boolean;
  isPart?: boolean;
  isFeatured?: boolean;
  categoryFieldsMapping?: CategoryFieldMapping[];
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
  | "isFeatured"
  | "categoryFieldsMapping"
>;

export type ProductCategoryUpdatePayload = Partial<ProductCategoryCreatePayload>;
