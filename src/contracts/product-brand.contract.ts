import { Document, Model, Types } from "mongoose";

// Interface for Product Brand
export interface IProductBrand extends Document {
  name: string;
  description: string;
  logo?: string;
  isBlocked?: boolean;
}

export type ProductBrandModel = Model<IProductBrand>;

// Payload type for creating a Product Brand
export type ProductBrandCreatePayload = Pick<IProductBrand, "name" | "description" | "logo" | "isBlocked">;

// Payload type for updating a Product Brand
export type ProductBrandUpdatePayload = Partial<ProductBrandCreatePayload>;
